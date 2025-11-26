// Interface for chapter content providers
export interface ChapterContent {
  title: string;
  content: string;
  chapterNumber?: string;
  novelTitle?: string;
  nextChapterUrl?: string;
  prevChapterUrl?: string;
}

export interface IChapterProvider {
  // Check if this provider can handle the given URL
  canHandle(url: string): boolean;
  
  // Fetch chapter content from the URL
  fetchChapter(url: string): Promise<ChapterContent>;
  
  // Provider name for display
  getName(): string;
}

