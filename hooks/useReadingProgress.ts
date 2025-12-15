// useReadingProgress - Reading progress tracking with persistence and URL sync
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { storage, ReadingProgress } from '../utils/storage';

export interface UseReadingProgressReturn {
    progress: ReadingProgress | null;
    saveProgress: (url: string, chunkIndex: number, title?: string) => void;
    loadProgress: () => Promise<ReadingProgress | null>;
    updateUrlQuery: (chapterUrl: string, chunkIndex: number) => void;
    parseUrlQuery: () => { chapterUrl: string | null; chunkIndex: number };
}

/**
 * Hook for managing reading progress with URL sync (localStorage removed)
 */
export function useReadingProgress(): UseReadingProgressReturn {
    const [progress, setProgress] = useState<ReadingProgress | null>(null);

    // Update URL query params (for bookmarking)
    const updateUrlQuery = useCallback((chapterUrl: string, chunkIndex: number) => {
        if (Platform.OS === 'web' && window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.set('chapter', chapterUrl);
            if (chunkIndex > 0) {
                url.searchParams.set('chunk', chunkIndex.toString());
            } else {
                url.searchParams.delete('chunk');
            }
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    // Parse URL query params on load
    const parseUrlQuery = useCallback((): { chapterUrl: string | null; chunkIndex: number } => {
        if (Platform.OS === 'web') {
            const urlParams = new URLSearchParams(window.location.search);
            const chapterUrl = urlParams.get('chapter');
            const chunkStr = urlParams.get('chunk');
            const chunkIndex = chunkStr ? parseInt(chunkStr, 10) : 0;

            return {
                chapterUrl: chapterUrl || null,
                chunkIndex: isNaN(chunkIndex) ? 0 : chunkIndex
            };
        }
        return { chapterUrl: null, chunkIndex: 0 };
    }, []);

    // Save reading progress - now just updates URL
    const saveProgress = useCallback((
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
        // storage.save call removed as requested
        updateUrlQuery(url, chunkIndex);
    }, [updateUrlQuery]);

    // Load reading progress - deprecated/noop for now as we use URL
    const loadProgress = useCallback(async (): Promise<ReadingProgress | null> => {
        return null;
    }, []);

    return {
        progress,
        saveProgress,
        loadProgress,
        updateUrlQuery,
        parseUrlQuery,
    };
}
