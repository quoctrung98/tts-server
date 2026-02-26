import { IChapterProvider, ChapterContent } from './IChapterProvider';
import { restoreCensoredWords } from '../utils/textUtils';

export class GenericProvider implements IChapterProvider {
    getName(): string {
        return 'Dynamic Provider (Auto)';
    }

    // Luôn trả về true để làm fallback cuối cùng
    canHandle(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return !!parsedUrl.hostname;
        } catch {
            return false;
        }
    }

    async fetchChapter(url: string): Promise<ChapterContent> {
        try {
            const { TTS_SERVER_URL } = await import('../config');
            const proxyResponse = await fetch(`${TTS_SERVER_URL}/proxy-html`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!proxyResponse.ok) {
                throw new Error('Proxy request failed');
            }

            const { html } = await proxyResponse.json();
            const domain = new URL(url).origin;

            // 1. Dọn dẹp sơ bộ
            let cleanHtml = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<!--[\s\S]*?-->/g, ''); // Xóa comment

            // 2. Tìm Title
            const title = this.extractTitle(cleanHtml);

            // 3. Tìm Content bằng Heuristic
            const content = this.extractBestContent(cleanHtml);

            // 4. Tìm Next/Prev Url
            const nextChapterUrl = this.findLinkByKeywords(cleanHtml, ['tiếp', 'sau', 'next', '>', '»'], domain, url);
            const prevChapterUrl = this.findLinkByKeywords(cleanHtml, ['trước', 'quay lại', 'prev', '<', '«'], domain, url);

            return {
                title,
                content: restoreCensoredWords(content),
                novelTitle: this.extractNovelTitle(cleanHtml) || 'Truyện chưa rõ tên',
                nextChapterUrl,
                prevChapterUrl,
            };
        } catch (error: any) {
            throw new Error(`Dynamic Provider Error: ${error.message}`);
        }
    }

    private extractTitle(html: string): string {
        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
            html.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/h2>/i) ||
            html.match(/<title>(.*?)<\/title>/i);
        return titleMatch ? this.stripTags(titleMatch[1]).trim() : 'Không rõ tiêu đề';
    }

    private extractNovelTitle(html: string): string | undefined {
        const metaMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
        if (metaMatch) return this.stripTags(metaMatch[1]).split('-')[0].trim();
        return undefined;
    }

    /**
     * Tìm thẻ chứa nhiều nội dung nhất
     */
    private extractBestContent(html: string): string {
        // Tìm tất cả các đoạn văn bản trong các thẻ div/article/section
        const containerRegex = /<(div|article|section)[^>]*>([\s\S]*?)<\/\1>/gi;
        let match;
        let candidates: { text: string; score: number }[] = [];

        while ((match = containerRegex.exec(html)) !== null) {
            const rawInner = match[2];
            const textOnly = this.stripTags(rawInner);

            // Tính điểm: Độ dài text trừ đi điểm trừ nếu chứa quá nhiều link (menu/sidebar)
            const linkCount = (rawInner.match(/<a /g) || []).length;
            const score = textOnly.length - (linkCount * 50);

            if (score > 100) {
                candidates.push({ text: rawInner, score });
            }
        }

        if (candidates.length === 0) return "Không tìm thấy nội dung truyện.";

        // Lấy thẻ có điểm cao nhất
        const bestMatch = candidates.sort((a, b) => b.score - a.score)[0].text;

        // Format lại text: đổi <br>, <p> thành \n
        let formatted = bestMatch
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<p[^>]*>/gi, '');

        formatted = this.stripTags(formatted);
        return this.decodeEntities(formatted).trim();
    }

    private findLinkByKeywords(html: string, keywords: string[], domain: string, currentUrl: string): string | undefined {
        const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        const candidates: { url: string; score: number }[] = [];

        while ((match = linkRegex.exec(html)) !== null) {
            let linkUrl = match[1];
            const linkText = this.stripTags(match[2]).toLowerCase();

            // Chỉ xét link cùng domain hoặc link tương đối
            if (!linkUrl.startsWith('http') && !linkUrl.startsWith('/')) continue;
            if (linkUrl.startsWith('/')) linkUrl = domain + linkUrl;
            const absoluteUrl = linkUrl.startsWith('http') ? linkUrl : new URL(linkUrl, currentUrl).href;

            if (!absoluteUrl.includes(new URL(currentUrl).hostname)) continue;
            if (absoluteUrl === currentUrl) continue;

            let score = 0;
            for (const kw of keywords) {
                if (linkText.includes(kw)) score += 10;
            }

            // Bonus điểm nếu text ngắn (thường là button)
            if (linkText.length < 15 && score > 0) score += 5;

            if (score > 0) {
                candidates.push({ url: absoluteUrl, score });
            }
        }

        return candidates.sort((a, b) => b.score - a.score)[0]?.url;
    }

    private stripTags(html: string): string {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    private decodeEntities(text: string): string {
        const entities: any = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
        return text.replace(/&[#a-z0-9]+;/gi, (m) => entities[m] || m);
    }
}
