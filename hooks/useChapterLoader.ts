// useChapterLoader - Chapter fetching logic using provider factory
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ChapterContent } from '../providers/IChapterProvider';
import { getActiveProviders } from '../config';

export interface UseChapterLoaderReturn {
    chapterContent: ChapterContent | null;
    isLoading: boolean;
    error: string | null;
    fetchChapter: (url: string) => Promise<ChapterContent | null>;
    setChapterContent: (content: ChapterContent | null) => void;
}

/**
 * Hook for loading chapter content from various providers
 */
export function useChapterLoader(): UseChapterLoaderReturn {
    const [chapterContent, setChapterContent] = useState<ChapterContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChapter = useCallback(async (url: string): Promise<ChapterContent | null> => {
        if (!url.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập URL chương truyện');
            return null;
        }

        setIsLoading(true);
        setChapterContent(null);
        setError(null);

        try {
            // Import ProviderFactory dynamically
            const { ProviderFactory } = await import('../providers/ProviderFactory');

            // Get appropriate provider for this URL
            const provider = ProviderFactory.getProvider(url);

            if (!provider) {
                throw new Error(
                    'Website này chưa được hỗ trợ. Hiện tại chỉ hỗ trợ: ' +
                    getActiveProviders().map(p => p.name).join(', ')
                );
            }

            // Fetch chapter content using the provider
            const chapter = await provider.fetchChapter(url);
            setChapterContent(chapter);

            Alert.alert('Thành công', `Đã tải chương: ${chapter.title}`);
            return chapter;
        } catch (err: any) {
            console.error('Error fetching chapter:', err);
            const errorMessage = err.message || 'Không thể tải chương. Vui lòng kiểm tra URL và thử lại.';
            setError(errorMessage);
            Alert.alert('Lỗi', errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        chapterContent,
        isLoading,
        error,
        fetchChapter,
        setChapterContent,
    };
}
