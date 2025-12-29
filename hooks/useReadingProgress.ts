// useReadingProgress - Reading progress tracking with persistence and URL sync
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { ReadingProgress } from '../utils/storage';
import { useCloudSync } from './useCloudSync';
import { useTTSSettings } from './useTTSSettings';

export interface UseReadingProgressReturn {
    progress: ReadingProgress | null;
    saveProgress: (url: string, chunkIndex: number, title?: string) => void;
    loadProgress: (usernameOverride?: string) => Promise<ReadingProgress | null>;
}


/**
 * Hook for managing reading progress with URL sync (localStorage removed)
 */
export function useReadingProgress(): UseReadingProgressReturn {
    const [progress, setProgress] = useState<ReadingProgress | null>(null);
    const { settings } = useTTSSettings();
    const { saveProgressToCloud, loadProgressFromCloud } = useCloudSync(settings.username);



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
    }, [saveProgressToCloud, settings.username]);



    // Load reading progress - now supports cloud
    const loadProgress = useCallback(async (usernameOverride?: string): Promise<ReadingProgress | null> => {
        const targetUsername = usernameOverride || settings.username;
        if (targetUsername) {
            const cloud = await loadProgressFromCloud(targetUsername);
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
    };
}

