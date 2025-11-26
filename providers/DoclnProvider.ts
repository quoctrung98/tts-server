import { IChapterProvider, ChapterContent } from './IChapterProvider';

export class DoclnProvider implements IChapterProvider {
  private readonly baseUrlPattern = /docln\.net/i;
  
  getName(): string {
    return 'Docln';
  }
  
  canHandle(url: string): boolean {
    return this.baseUrlPattern.test(url);
  }
  
  async fetchChapter(url: string): Promise<ChapterContent> {
    if (!this.canHandle(url)) {
      throw new Error('URL không thuộc Docln');
    }
    
    // TODO: Implement Docln-specific extraction logic
    // Nội dung thường nằm trong class="chapter-content" hoặc tương tự
    
    throw new Error('DoclnProvider chưa được implement. Hãy cập nhật backend server!');
  }
}

