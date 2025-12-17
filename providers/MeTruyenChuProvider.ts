import { IChapterProvider, ChapterContent } from './IChapterProvider';
import { restoreCensoredWords } from '../utils/textUtils';

export class MeTruyenChuProvider implements IChapterProvider {
    private readonly baseUrlPattern = /metruyenchu\.(com\.vn|vn)/i;

    getName(): string {
        return 'Mê Truyện Chữ';
    }

    canHandle(url: string): boolean {
        return this.baseUrlPattern.test(url);
    }

    async fetchChapter(url: string): Promise<ChapterContent> {
        if (!this.canHandle(url)) {
            throw new Error('URL không thuộc MeTruyenChu');
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
                throw new Error('Proxy request failed');
            }

            const proxyData = await proxyResponse.json();
            html = proxyData.html;

            // Extract content using regex
            const titleMatch = html.match(/<h2[^>]*class="[^"]*current-chapter[^"]*"[^>]*>\s*<a[^>]*>(.*?)<\/a>\s*<\/h2>/is);
            const title = titleMatch ? this.cleanHtml(titleMatch[1]) : 'Chương truyện';

            const novelTitleMatch = html.match(/<h1[^>]*class="[^"]*current-book[^"]*"[^>]*>\s*<a[^>]*>(.*?)<\/a>\s*<\/h1>/is);
            const novelTitle = novelTitleMatch ? this.cleanHtml(novelTitleMatch[1]) : undefined;

            // Content text is in <div class="truyen">...</div>
            // We'll extract using string indexOf/substring for robustness like TruyenFull
            const content = this.extractContent(html);

            // Script vars for next/prev chapters
            // var prevChap = '/...';
            const nextUrl = this.extractScriptVar(html, 'nextChap');
            const prevUrl = this.extractScriptVar(html, 'prevChap');

            return {
                title,
                content: restoreCensoredWords(content),
                chapterNumber: this.extractChapterNumber(title),
                novelTitle,
                nextChapterUrl: nextUrl,
                prevChapterUrl: prevUrl,
            };
        } catch (error: any) {
            console.error('Error fetching MeTruyenChu chapter:', error);
            throw error;
        }
    }

    private extractContent(html: string): string {
        const startMarker = '<div class="truyen">';
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) throw new Error('Không tìm thấy nội dung truyện');

        // Find closing div. Since nested divs might exist, basic logic might fail if complex.
        // However, MeTruyenChu's content block usually ends before the next div sibling.
        // Let's use a simpler approach: extract everything until the next meaningful div or end of container.
        // But checking the example, <div class="truyen"> contains text and <br>s. It closes with </div>.
        // Let's try to find the matching closing div.

        // Quick and dirty: find the next </div> that closes this one.
        // Given the structure, `</div>` usually follows the text immediately or after some breaks.
        // But there is a closing </div> for the `truyen` class.

        // We can iterate like TruyenFullProvider
        let divCount = 1;
        let pos = startIdx + startMarker.length;
        let closingTagStart = -1;

        while (pos < html.length && divCount > 0) {
            const nextOpenDiv = html.indexOf('<div', pos);
            const nextCloseDiv = html.indexOf('</div>', pos);

            if (nextCloseDiv === -1) break;

            if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
                divCount++;
                pos = nextOpenDiv + 4;
            } else {
                divCount--;
                if (divCount === 0) {
                    closingTagStart = nextCloseDiv;
                }
                pos = nextCloseDiv + 6;
            }
        }

        if (closingTagStart === -1) {
            // Fallback: take until some known footer or script if exact parsing fails?
            // Actually, let's just create a substring and clean it.
            // If we can't find closing div, maybe content is malformed.
            throw new Error('Không tìm thấy kết thúc nội dung');
        }

        let raw = html.substring(startIdx + startMarker.length, closingTagStart);

        // Clean HTML
        return this.cleanContent(raw);
    }

    private cleanContent(html: string): string {
        let text = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, ' ') // Remove tags
            .replace(/&nbsp;/g, ' ')
            .trim();

        return this.decodeHtmlEntities(text)
            .replace(/\n\s+/g, '\n') // Trim lines
            .replace(/\n{3,}/g, '\n\n'); // Normalize newlines
    }

    private cleanHtml(text: string): string {
        return this.decodeHtmlEntities(text.replace(/<[^>]+>/g, '')).trim();
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
        };
        return text.replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, (match) => {
            if (entities[match]) return entities[match];
            if (match.startsWith('&#x')) return String.fromCharCode(parseInt(match.slice(3, -1), 16));
            if (match.startsWith('&#')) return String.fromCharCode(parseInt(match.slice(2, -1), 10));
            return match;
        });
    }

    private extractScriptVar(html: string, varName: string): string | undefined {
        // var nextChap = '/...';
        const regex = new RegExp(`var\\s+${varName}\\s*=\\s*['"]([^'"]+)['"]`, 'i');
        const match = html.match(regex);
        if (match) {
            const path = match[1];
            if (path.startsWith('http')) return path;
            return `https://metruyenchu.com.vn${path.startsWith('/') ? '' : '/'}${path}`;
        }
        return undefined;
    }

    private extractChapterNumber(title: string): string | undefined {
        const match = title.match(/Chương\s+(\d+)/i);
        return match ? match[1] : undefined;
    }
}
