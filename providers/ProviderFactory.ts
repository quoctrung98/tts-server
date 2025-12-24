import { IChapterProvider } from './IChapterProvider';
import { TruyenFullProvider } from './TruyenFullProvider';
// import { DoclnProvider } from './DoclnProvider';
import { TangThuVienProvider } from './TangThuVienProvider';
import { MeTruyenChuProvider } from './MeTruyenChuProvider';
import { TruyenMoiProvider } from './TruyenMoiProvider';
// import { TruyenDichMienPhiProvider } from './TruyenDichMienPhiProvider';

export class ProviderFactory {
  private static providers: IChapterProvider[] = [
    new TruyenFullProvider(),
    new TangThuVienProvider(),
    new MeTruyenChuProvider(),
    new TruyenMoiProvider(),
    // Uncomment khi đã implement:
    // new DoclnProvider(),
    // new TruyenDichMienPhiProvider(),
  ];

  /**
   * Get the appropriate provider for the given URL
   */
  static getProvider(url: string): IChapterProvider | null {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): IChapterProvider[] {
    return [...this.providers];
  }

  /**
   * Check if any provider can handle the URL
   */
  static canHandle(url: string): boolean {
    return this.getProvider(url) !== null;
  }
}

