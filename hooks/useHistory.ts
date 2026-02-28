import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

const MAX_RECENT_CHAPTERS = 20;

export interface ChapterHistory {
    url: string;
    title: string;
    chunkIndex: number;
    timestamp: number;
    progressPercent: number;
}

export interface HistoryItem {
    id: string; // Unique ID (storyTitle or URL)
    title: string; // Last read chapter title
    storyTitle?: string; // Novel/Story Title
    provider?: string; // Source domain
    coverUrl?: string;
    lastChapterUrl: string;
    lastChapterTitle: string;
    lastChunkIndex: number;
    lastReadTimestamp: number;
    isFavorite: boolean;
    progressPercent?: number;
    recentChapters: ChapterHistory[]; // List of recently read chapters (max 20)
}

export interface UseHistoryReturn {
    items: HistoryItem[];
    recentItems: HistoryItem[];
    favoriteItems: HistoryItem[];
    isLoading: boolean;
    updateProgress: (url: string, title: string, chunkIndex: number, totalChunks: number, storyTitle?: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    removeHistoryItem: (id: string) => Promise<void>;
    getRecentChapters: (storyId: string) => ChapterHistory[];
}

export function useHistory(): UseHistoryReturn {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load history from storage
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setIsLoading(true);
        const storedItems = await storage.load<HistoryItem[]>('library_books', []);
        
        // Migrate old data: ensure all items have recentChapters array
        const migratedItems = (storedItems || []).map(item => {
            if (!item.recentChapters) {
                // Create recentChapters from current lastChapter data
                const initialChapter: ChapterHistory = {
                    url: item.lastChapterUrl,
                    title: item.lastChapterTitle || item.title,
                    chunkIndex: item.lastChunkIndex || 0,
                    timestamp: item.lastReadTimestamp || Date.now(),
                    progressPercent: item.progressPercent || 0
                };
                return { ...item, recentChapters: [initialChapter] };
            }
            return item;
        });
        
        // Save migrated data if there were changes
        if (storedItems && storedItems.some(item => !item.recentChapters)) {
            await storage.save('library_books', migratedItems);
        }
        
        setItems(migratedItems);
        setIsLoading(false);
    };

    const saveHistory = async (newItems: HistoryItem[]) => {
        setItems(newItems);
        await storage.save('library_books', newItems);
    };

    // Derived lists
    const recentItems = [...items].sort((a, b) => b.lastReadTimestamp - a.lastReadTimestamp);
    const favoriteItems = items.filter(b => b.isFavorite);

    // Update progress (create/update history item for the story)
    // Read directly from storage to avoid stale closure issues
    const updateProgress = useCallback(async (
        url: string,
        title: string,
        chunkIndex: number,
        totalChunks: number,
        storyTitle?: string
    ) => {
        const timestamp = Date.now();
        const progressPercent = totalChunks > 0 ? Math.round(((chunkIndex + 1) / totalChunks) * 100) : 0;

        let provider = '';
        try {
            provider = new URL(url).hostname.replace('www.', '');
        } catch (e) {
            provider = 'unknown';
        }

        // Use storyTitle as the identifier if available, otherwise fallback to URL
        // This ensures all chapters of the same story update the same history entry
        const id = storyTitle || url;

        // Create new chapter history entry
        const chapterEntry: ChapterHistory = {
            url,
            title,
            chunkIndex,
            timestamp,
            progressPercent
        };

        // Read fresh data from storage to avoid stale state
        const currentItems = await storage.load<HistoryItem[]>('library_books', []);
        const existingItemIndex = currentItems.findIndex(item => item.id === id || (storyTitle && item.storyTitle === storyTitle));

        console.log('[History] updateProgress called:', { url: url.substring(0, 50), title, storyTitle, id });
        console.log('[History] existingItemIndex:', existingItemIndex, 'currentItems count:', currentItems.length);

        let newItems = [...currentItems];

        if (existingItemIndex >= 0) {
            const existingItem = newItems[existingItemIndex];
            
            // Get existing chapters or initialize empty array
            let recentChapters = existingItem.recentChapters || [];
            
            // Check if this chapter already exists in history (by URL)
            const existingChapterIndex = recentChapters.findIndex(ch => ch.url === url);
            
            if (existingChapterIndex >= 0) {
                // Update existing chapter entry
                recentChapters[existingChapterIndex] = chapterEntry;
            } else {
                // Add new chapter to the beginning
                recentChapters = [chapterEntry, ...recentChapters];
            }
            
            // Sort by timestamp (most recent first) and keep only last MAX_RECENT_CHAPTERS
            recentChapters = recentChapters
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_RECENT_CHAPTERS);

            console.log('[History] recentChapters after update:', recentChapters.length, recentChapters.map(c => c.title.substring(0, 30)));

            // Update existing entry
            newItems[existingItemIndex] = {
                ...existingItem,
                title: title,
                lastChapterUrl: url,
                lastChapterTitle: title,
                lastChunkIndex: chunkIndex,
                lastReadTimestamp: timestamp,
                progressPercent: progressPercent,
                storyTitle: storyTitle || existingItem.storyTitle,
                provider: provider || existingItem.provider,
                recentChapters: recentChapters
            };
        } else {
            // Add new story to history with first chapter
            const newItem: HistoryItem = {
                id: id,
                title: title,
                storyTitle: storyTitle,
                provider: provider,
                lastChapterUrl: url,
                lastChapterTitle: title,
                lastChunkIndex: chunkIndex,
                lastReadTimestamp: timestamp,
                isFavorite: false,
                progressPercent: progressPercent,
                coverUrl: 'https://via.placeholder.com/150',
                recentChapters: [chapterEntry]
            };
            newItems.push(newItem);
        }

        await saveHistory(newItems);
    }, []);

    const toggleFavorite = useCallback(async (id: string) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        );
        await saveHistory(newItems);
    }, [items]);

    const removeHistoryItem = useCallback(async (id: string) => {
        const newItems = items.filter(item => item.id !== id);
        await saveHistory(newItems);
    }, [items]);

    // Get recent chapters for a specific story
    const getRecentChapters = useCallback((storyId: string): ChapterHistory[] => {
        const item = items.find(i => i.id === storyId || i.storyTitle === storyId);
        return item?.recentChapters || [];
    }, [items]);

    return {
        items,
        recentItems,
        favoriteItems,
        isLoading,
        updateProgress,
        toggleFavorite,
        removeHistoryItem,
        getRecentChapters
    };
}

