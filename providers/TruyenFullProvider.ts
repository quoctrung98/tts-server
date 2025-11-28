import { IChapterProvider, ChapterContent } from './IChapterProvider';
import { restoreCensoredWords } from '../utils/textUtils';

export class TruyenFullProvider implements IChapterProvider {
  private readonly baseUrlPattern = /truyenfull\.(vn|vision)/i;
  
  getName(): string {
    return 'Truyện Full';
  }
  
  canHandle(url: string): boolean {
    return this.baseUrlPattern.test(url);
  }
  
  async fetchChapter(url: string): Promise<ChapterContent> {
    if (!this.canHandle(url)) {
      throw new Error('URL không thuộc TruyenFull');
    }
    
    try {
      let html: string;
      
      // Try direct fetch first (works on mobile)
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        html = await response.text();
      } catch (directFetchError: any) {
        // If direct fetch fails (likely CORS on web), use proxy
        // Import TTS_SERVER_URL from config
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
      }
      
      // Extract chapter title
      const titleMatch = html.match(/<h2[^>]*class="[^"]*title-top[^"]*"[^>]*>(.*?)<\/h2>/is) ||
                        html.match(/<h1[^>]*class="[^"]*chapter-title[^"]*"[^>]*>(.*?)<\/h1>/is) ||
                        html.match(/<title>(.*?)<\/title>/is);
      const title = titleMatch ? this.cleanHtml(titleMatch[1]) : 'Chương truyện';
      
      // Extract chapter content from div id="chapter-c"
      // Need to use greedy match to get all content including nested divs
      // Find the opening tag position
      const chapterDivStart = html.indexOf('<div id="chapter-c"');
      if (chapterDivStart === -1) {
        throw new Error('Không tìm thấy div#chapter-c. Có thể website đã thay đổi cấu trúc.');
      }
      
      // Find the opening tag end (the '>' character)
      const openingTagEnd = html.indexOf('>', chapterDivStart);
      
      // Find the matching closing </div>
      // We need to count nested divs to find the correct closing tag
      let divCount = 1;
      let pos = openingTagEnd + 1;
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
        throw new Error('Không tìm thấy closing tag của div#chapter-c.');
      }
      
      // Extract content between opening and closing tags
      let content = html.substring(openingTagEnd + 1, closingTagStart);
      
      // Clean up the content
      // Remove script tags
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      // Remove style tags
      content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      // Remove ads and unwanted elements
      content = content.replace(/<div[^>]*class="[^"]*ads?[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      // Replace <br> and <p> with spaces/newlines
      content = content.replace(/<br\s*\/?>/gi, '\n');
      content = content.replace(/<\/p>/gi, '\n\n');
      // Remove all remaining HTML tags
      content = content.replace(/<[^>]+>/g, ' ');
      // Decode HTML entities
      content = this.decodeHtmlEntities(content);
      // Clean up whitespace
      content = content.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
      content = content.replace(/\n\s+/g, '\n'); // Remove spaces after newlines
      content = content.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
      content = content.trim();
      
      // Restore censored words
      content = restoreCensoredWords(content);
      
      if (!content || content.length < 50) {
        throw new Error('Nội dung chương truyện quá ngắn hoặc không hợp lệ');
      }
      
      return {
        title,
        content,
        chapterNumber: this.extractChapterNumber(url),
        novelTitle: this.extractNovelTitle(html),
        nextChapterUrl: this.extractNextChapterUrl(html),
        prevChapterUrl: this.extractPrevChapterUrl(html),
      };
    } catch (error: any) {
      console.error('Error fetching chapter:', error);
      
      // Provide helpful error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('Không thể kết nối đến website. Kiểm tra kết nối internet hoặc URL có đúng không.');
      }
      
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
      '&trade;': '™',
      '&copy;': '©',
      '&reg;': '®',
    };
    
    // Handle named entities
    let decoded = text.replace(/&[a-z]+;/gi, (match) => {
      return entities[match.toLowerCase()] || match;
    });
    
    // Handle numeric entities (&#123; or &#xAB;)
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
  
  private extractNovelTitle(html: string): string | undefined {
    const match = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
    return match ? this.cleanHtml(match[1]) : undefined;
  }
  
  private extractNextChapterUrl(html: string): string | undefined {
    // Find <a> tag with id="next_chap"
    // Note: href can come BEFORE or AFTER id, so we need to handle both
    const match = html.match(/<a[^>]*id="next_chap"[^>]*>/i);
    if (match) {
      const aTag = match[0];
      // Extract href from the matched <a> tag
      const hrefMatch = aTag.match(/href="([^"]*)"/i);
      if (hrefMatch && hrefMatch[1]) {
        let url = hrefMatch[1];
        // If relative URL, convert to absolute
        if (url.startsWith('/')) {
          url = 'https://truyenfull.vision' + url;
        }
        return url;
      }
    }
    return undefined;
  }
  
  private extractPrevChapterUrl(html: string): string | undefined {
    // Find <a> tag with id="prev_chap"
    const match = html.match(/<a[^>]*id="prev_chap"[^>]*>/i);
    if (match) {
      const aTag = match[0];
      // Extract href from the matched <a> tag
      const hrefMatch = aTag.match(/href="([^"]*)"/i);
      if (hrefMatch && hrefMatch[1]) {
        let url = hrefMatch[1];
        // If relative URL, convert to absolute
        if (url.startsWith('/')) {
          url = 'https://truyenfull.vision' + url;
        }
        return url;
      }
    }
    return undefined;
  }
}

