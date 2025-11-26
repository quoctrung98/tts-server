import { IChapterProvider, ChapterContent } from './IChapterProvider';

export class TruyenDichMienPhiProvider implements IChapterProvider {
  private readonly baseUrlPattern = /truyendichmienphi\.vn/i;
  
  getName(): string {
    return 'Truyện Dịch Miễn Phí';
  }
  
  canHandle(url: string): boolean {
    return this.baseUrlPattern.test(url);
  }
  
  async fetchChapter(url: string): Promise<ChapterContent> {
    if (!this.canHandle(url)) {
      throw new Error('URL không thuộc Truyện Dịch Miễn Phí');
    }
    
    // TODO: Implement TruyenDichMienPhi-specific extraction logic
    
    throw new Error('TruyenDichMienPhiProvider chưa được implement. Hãy cập nhật backend server!');
  }
}

