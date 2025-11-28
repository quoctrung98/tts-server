import { IChapterProvider, ChapterContent } from './IChapterProvider';
import { restoreCensoredWords } from '../utils/textUtils';

export class TangThuVienProvider implements IChapterProvider {
  private readonly baseUrlPattern = /tangthuvien\.(com\.vn|vn)/i;
  
  getName(): string {
    return 'Tàng Thư Viện';
  }
  
  canHandle(url: string): boolean {
    return this.baseUrlPattern.test(url);
  }
  
  async fetchChapter(url: string): Promise<ChapterContent> {
    if (!this.canHandle(url)) {
      throw new Error('URL không thuộc Tàng Thư Viện');
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
      
      // Extract chapter title from <h2>
      const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/is);
      const title = titleMatch ? this.cleanHtml(titleMatch[1]) : 'Chương truyện';
      
      // Extract chapter content from div with class="box-chap box-chap-{id}"
      // Use a pattern to match any box-chap div
      const contentMatch = html.match(/<div\s+class="box-chap\s+box-chap-\d+"[^>]*>([\s\S]*?)<\/div>/i);
      
      if (!contentMatch) {
        throw new Error('Không tìm thấy nội dung chương. Có thể website đã thay đổi cấu trúc.');
      }
      
      let content = contentMatch[1];
      
      // Clean up the content
      // Remove script tags
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      // Remove style tags
      content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      // Replace <br> with newlines
      content = content.replace(/<br\s*\/?>/gi, '\n');
      // Replace </p> with double newlines
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
        nextChapterUrl: this.extractNextChapterUrl(url),
        prevChapterUrl: this.extractPrevChapterUrl(url),
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
      .replace(/&nbsp;/g, ' ')
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
    // Match pattern: /chuong-123 or /chuong-123-title
    const match = url.match(/\/chuong-(\d+)/i);
    return match ? match[1] : undefined;
  }
  
  private extractNovelTitle(html: string): string | undefined {
    // Extract from <h1 class="truyen-title"><a>Title</a></h1>
    const match = html.match(/<h1[^>]*class="[^"]*truyen-title[^"]*"[^>]*>.*?<a[^>]*>(.*?)<\/a>.*?<\/h1>/is);
    return match ? this.cleanHtml(match[1]) : undefined;
  }
  
  private extractNextChapterUrl(url: string): string | undefined {
    // Parse URL and increment chapter number
    // Example: https://truyen.tangthuvien.vn/doc-truyen/novel-name/chuong-2
    const match = url.match(/^(.*\/chuong-)(\d+)(.*)?$/i);
    if (match) {
      const baseUrl = match[1];
      const currentChapter = parseInt(match[2], 10);
      const nextChapter = currentChapter + 1;
      return `${baseUrl}${nextChapter}`;
    }
    return undefined;
  }
  
  private extractPrevChapterUrl(url: string): string | undefined {
    // Parse URL and decrement chapter number
    const match = url.match(/^(.*\/chuong-)(\d+)(.*)?$/i);
    if (match) {
      const baseUrl = match[1];
      const currentChapter = parseInt(match[2], 10);
      if (currentChapter > 1) {
        const prevChapter = currentChapter - 1;
        return `${baseUrl}${prevChapter}`;
      }
    }
    return undefined;
  }
}

