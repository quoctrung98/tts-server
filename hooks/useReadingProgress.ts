// useReadingProgress - Reading progress tracking with persistence and URL sync
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { ReadingProgress } from '../utils/storage';
import { useCloudSync } from './useCloudSync';
import { useTTSSettings } from './useTTSSettings';

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
    const { settings } = useTTSSettings();
    const { saveProgressToCloud, loadProgressFromCloud } = useCloudSync(settings.username);

    // Update URL query params (for bookmarking)
    const updateUrlQuery = useCallback((chapterUrl: string, chunkIndex: number) => {
        if (Platform.OS === 'web' && window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.set('chapter', chapterUrl);
            if (chunkIndex > 0) {
                url.searchParams.set('chunk', chunkIndex.toString());
            } else {
                url.searchParams.set('chunk', '0');
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

    // Save reading progress - now just updates URL and Cloud
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

        // History pollution control: Removed as requested.
        // Reading progress is now tracked via state and Cloud Sync (Supabase).
        // updateUrlQuery(url, chunkIndex); 

        // Cloud sync - optimize by only saving every 5 chunks or on chapter change (chunk 0)

        if (settings.username && (chunkIndex === 0 || chunkIndex % 5 === 0)) {
            saveProgressToCloud({
                last_url: url,
                last_chapter_title: title || '',
                last_chunk_index: chunkIndex
            });
        }
    }, [updateUrlQuery, saveProgressToCloud, settings.username]);



    // Load reading progress - now supports cloud
    const loadProgress = useCallback(async (): Promise<ReadingProgress | null> => {
        if (settings.username) {
            const cloud = await loadProgressFromCloud();
            if (cloud) {
                return {
                    chapterUrl: cloud.last_url,
                    chapterTitle: cloud.last_chapter_title,
                    chunkIndex: cloud.last_chunk_index,
                    timestamp: Date.now()
                };
            }
        }
        return null;
    }, [loadProgressFromCloud, settings.username]);

    return {
        progress,
        saveProgress,
        loadProgress,
        updateUrlQuery,
        parseUrlQuery,
    };
}

