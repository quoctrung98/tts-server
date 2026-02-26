import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

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
}

export interface UseHistoryReturn {
    items: HistoryItem[];
    recentItems: HistoryItem[];
    favoriteItems: HistoryItem[];
    isLoading: boolean;
    updateProgress: (url: string, title: string, chunkIndex: number, totalChunks: number, storyTitle?: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    removeHistoryItem: (id: string) => Promise<void>;
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
        // Fallback to library_books for migration if needed, but here we'll just start fresh or use same key
        // Let's keep the key for now to preserve user data, or migrate it.
        const storedItems = await storage.load<HistoryItem[]>('library_books', []);
        setItems(storedItems || []);
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

        const existingItemIndex = items.findIndex(item => item.id === id || (storyTitle && item.storyTitle === storyTitle));

        let newItems = [...items];

        if (existingItemIndex >= 0) {
            // Update existing entry (saves last read chapter for this story)
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                title: title, // Update current chapter title
                lastChapterUrl: url,
                lastChapterTitle: title,
                lastChunkIndex: chunkIndex,
                lastReadTimestamp: timestamp,
                progressPercent: progressPercent,
                storyTitle: storyTitle || newItems[existingItemIndex].storyTitle,
                provider: provider || newItems[existingItemIndex].provider
            };
        } else {
            // Add new story to history
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
                coverUrl: 'https://via.placeholder.com/150'
            };
            newItems.push(newItem);
        }

        await saveHistory(newItems);
    }, [items]);

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

    return {
        items,
        recentItems,
        favoriteItems,
        isLoading,
        updateProgress,
        toggleFavorite,
        removeHistoryItem
    };
}

