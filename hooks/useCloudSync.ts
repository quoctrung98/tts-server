import { useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export interface CloudProgress {
    last_url: string;
    last_chapter_title: string;
    last_chunk_index: number;
}

export function useCloudSync(username?: string) {
    const supabase = useMemo(() => {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
        return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }, []);

    const saveProgressToCloud = useCallback(async (progress: CloudProgress) => {
        if (!supabase || !username) return;

        try {
            const { error } = await supabase
                .from('reading_progress')
                .upsert({
                    username,
                    last_url: progress.last_url,
                    last_chapter_title: progress.last_chapter_title,
                    last_chunk_index: progress.last_chunk_index,
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('Error saving progress to cloud:', error);
            }
        } catch (error) {
            console.error('Failed to save progress to cloud:', error);
        }
    }, [supabase, username]);

    const loadProgressFromCloud = useCallback(async (): Promise<CloudProgress | null> => {
        if (!supabase || !username) return null;

        try {
            const { data, error } = await supabase
                .from('reading_progress')
                .select('last_url, last_chapter_title, last_chunk_index')
                .eq('username', username)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // Not found error code for single()
                    console.error('Error loading progress from cloud:', error);
                }
                return null;
            }

            return data as CloudProgress;
        } catch (error) {
            console.error('Failed to load progress from cloud:', error);
            return null;
        }
    }, [supabase, username]);

    return {
        saveProgressToCloud,
        loadProgressFromCloud,
        isConfigured: !!supabase
    };
}
