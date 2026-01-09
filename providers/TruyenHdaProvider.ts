import { IChapterProvider, ChapterContent } from './IChapterProvider';
import { restoreCensoredWords } from '../utils/textUtils';

export class TruyenHdaProvider implements IChapterProvider {
    private readonly baseUrlPattern = /truyenhda\.com/i;

    getName(): string {
        return 'Truyện HĐA';
    }

    canHandle(url: string): boolean {
        return this.baseUrlPattern.test(url);
    }

    async fetchChapter(url: string): Promise<ChapterContent> {
        if (!this.canHandle(url)) {
            throw new Error('URL không thuộc Truyện HĐA');
        }

        try {
            let html: string;
            const { TTS_SERVER_URL } = await import('../config');

            const proxyResponse = await fetch(`${TTS_SERVER_URL}/proxy-html`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!proxyResponse.ok) {
                const error = await proxyResponse.json();
                throw new Error(error.error || 'Proxy request failed');
            }

            const proxyData = await proxyResponse.json();
            html = proxyData.html;

            // Extract chapter title
            const titleMatch = html.match(/<h1[^>]*class="text-center"[^>]*>(.*?)<span/is) ||
                html.match(/<h1[^>]*class="text-center"[^>]*>(.*?)<\/h1>/is) ||
                html.match(/<title>(.*?)<\/title>/is);
            const title = titleMatch ? this.cleanHtml(titleMatch[1]) : 'Chương truyện';

            // Extract novel title
            // From breadcrumb: second to last item
            const breadcrumbMatches = html.match(/<li[^>]*class="breadcrumb-item"[^>]*>.*?<a[^>]*>(.*?)<\/a>.*?<\/li>/gi);
            let novelTitle: string | undefined;
            if (breadcrumbMatches && breadcrumbMatches.length >= 2) {
                const novelBreadcrumb = breadcrumbMatches[breadcrumbMatches.length - 2];
                const innerMatch = novelBreadcrumb.match(/<a[^>]*>(.*?)<\/a>/i);
                if (innerMatch) {
                    novelTitle = this.cleanHtml(innerMatch[1]);
                }
            }

            // Extract chapter content
            const contentMatch = html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>\s*<div[^>]*class="[^"]*user-interact/is) ||
                html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>\s*<div[^>]*class="[^"]*pagination/is) ||
                html.match(/<div[^>]*class="reading"[^>]*>(.*?)<\/div>/is);

            if (!contentMatch) {
                throw new Error('Không tìm thấy nội dung chương truyện (div.reading)');
            }

            let content = contentMatch[1];

            // Clean up the content
            content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            content = content.replace(/<div[^>]*class="[^"]*ads?[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
            content = content.replace(/<br\s*\/?>/gi, '\n');
            content = content.replace(/<\/p>/gi, '\n\n');
            content = content.replace(/<[^>]+>/g, ' ');

            content = this.decodeHtmlEntities(content);
            content = content.replace(/[ \t]+/g, ' ');
            content = content.replace(/\n\s+/g, '\n');
            content = content.replace(/\n{3,}/g, '\n\n');
            content = content.trim();

            // Restore censored words
            content = restoreCensoredWords(content);

            if (!content || content.length < 20) {
                throw new Error('Nội dung chương truyện quá ngắn hoặc không hợp lệ');
            }

            return {
                title,
                content,
                chapterNumber: this.extractChapterNumber(url),
                novelTitle,
                nextChapterUrl: this.extractNextChapterUrl(html),
                prevChapterUrl: this.extractPrevChapterUrl(html),
            };
        } catch (error: any) {
            console.error('Error fetching chapter:', error);
            throw new Error(`Không thể lấy nội dung: ${error.message}`);
        }
    }

    private cleanHtml(text: string): string {
        return text
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private decodeHtmlEntities(text: string): string {
        const entities: { [key: string]: string } = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'",
            '&#39;': "'",
            '&nbsp;': ' ',
            '&ndash;': '–',
            '&mdash;': '—',
            '&hellip;': '...',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&lsquo;': "'",
            '&rsquo;': "'",
        };

        let decoded = text.replace(/&[a-z]+;/gi, (match) => {
            return entities[match.toLowerCase()] || match;
        });

        decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(parseInt(dec, 10));
        });

        decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        return decoded;
    }

    private extractChapterNumber(url: string): string | undefined {
        const match = url.match(/chuong-(\d+)/i);
        return match ? match[1] : undefined;
    }

    private extractNextChapterUrl(html: string): string | undefined {
        const match = html.match(/<div[^>]*class="next-chap next-chap-2"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>/is);
        if (match && match[1]) {
            let url = match[1];
            if (url.startsWith('/')) {
                url = 'https://truyenhda.com' + url;
            }
            return url;
        }
        return undefined;
    }

    private extractPrevChapterUrl(html: string): string | undefined {
        const match = html.match(/<div[^>]*class="next-chap next-chap-1"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>/is);
        if (match && match[1]) {
            let url = match[1];
            if (url.startsWith('/')) {
                url = 'https://truyenhda.com' + url;
            }
            return url;
        }
        return undefined;
    }
}
