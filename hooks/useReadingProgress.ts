// useReadingProgress - Reading progress tracking with persistence and URL sync
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { storage, ReadingProgress } from '../utils/storage';

export interface UseReadingProgressReturn {
    progress: ReadingProgress | null;
    saveProgress: (url: string, chunkIndex: number, title?: string) => Promise<void>;
    loadProgress: () => Promise<ReadingProgress | null>;
    updateUrlQuery: (chapterUrl: string) => void;
    parseUrlQuery: () => string | null;
}

/**
 * Hook for managing reading progress with localStorage and URL sync
 */
export function useReadingProgress(): UseReadingProgressReturn {
    const [progress, setProgress] = useState<ReadingProgress | null>(null);

    // Update URL query params (for bookmarking)
    const updateUrlQuery = useCallback((chapterUrl: string) => {
        if (Platform.OS === 'web' && window.history && window.history.pushState) {
            const url = new URL(window.location.href);
            url.searchParams.set('chapter', chapterUrl);
            window.history.pushState({}, '', url.toString());
        }
    }, []);

    // Parse URL query params on load
    const parseUrlQuery = useCallback((): string | null => {
        if (Platform.OS === 'web') {
            const urlParams = new URLSearchParams(window.location.search);
            const chapterUrl = urlParams.get('chapter');
            if (chapterUrl) {
                return chapterUrl;
            }
        }
        return null;
    }, []);

    // Save reading progress
    const saveProgress = useCallback(async (
        url: string,
        chunkIndex: number,
        title?: string
    ) => {
        const newProgress: ReadingProgress = {
            chapterUrl: url,
            chapterTitle: title,
            chunkIndex: chunkIndex,
            timestamp: Date.now(),
        };

        setProgress(newProgress);
        await storage.save(storage.keys.READING_PROGRESS, newProgress);
        updateUrlQuery(url);
    }, [updateUrlQuery]);

    // Load reading progress
    const loadProgress = useCallback(async (): Promise<ReadingProgress | null> => {
        const savedProgress = await storage.load<ReadingProgress | null>(
            storage.keys.READING_PROGRESS,
            null
        );

        if (savedProgress) {
            setProgress(savedProgress);
        }

        return savedProgress;
    }, []);

    return {
        progress,
        saveProgress,
        loadProgress,
        updateUrlQuery,
        parseUrlQuery,
    };
}
