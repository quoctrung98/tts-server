import { IChapterProvider, ChapterContent } from './IChapterProvider';

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
    
    // TODO: Implement TangThuVien-specific extraction logic
    // Nội dung thường nằm trong class="box-chap" hoặc tương tự
    
    throw new Error('TangThuVienProvider chưa được implement. Hãy cập nhật backend server!');
  }
}

