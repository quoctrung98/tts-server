import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

export interface Book {
    id: string; // URL is the ID
    title: string; // Chapter Title
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

export interface UseLibraryReturn {
    books: Book[];
    recentBooks: Book[];
    favoriteBooks: Book[];
    isLoading: boolean;
    updateProgress: (url: string, title: string, chunkIndex: number, totalChunks: number, storyTitle?: string) => Promise<void>;
    toggleFavorite: (url: string) => Promise<void>;
    removeBook: (url: string) => Promise<void>;
}

export function useLibrary(): UseLibraryReturn {
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load books from storage
    useEffect(() => {
        loadLibrary();
    }, []);

    const loadLibrary = async () => {
        setIsLoading(true);
        const storedBooks = await storage.load<Book[]>('library_books', []);
        setBooks(storedBooks || []);
        setIsLoading(false);
    };

    const saveLibrary = async (newBooks: Book[]) => {
        setBooks(newBooks);
        await storage.save('library_books', newBooks);
    };

    // Derived lists
    const recentBooks = [...books].sort((a, b) => b.lastReadTimestamp - a.lastReadTimestamp);
    const favoriteBooks = books.filter(b => b.isFavorite);

    // Update progress (create book if not exists)
    const updateProgress = useCallback(async (
        url: string,
        title: string,
        chunkIndex: number,
        totalChunks: number,
        storyTitle?: string
    ) => {
        // Simple ID generation from URL (or just use URL)
        // Extract Story URL (parent) vs Chapter URL
        // For now, let's treat the Chapter URL as the main entry point, 
        // but ideally we should group by Story.
        // Simplified: The "Book" is actually just the Chapter being read.
        // TODO: Smart parsing to group chapters into a Story.

        const timestamp = Date.now();
        const progressPercent = totalChunks > 0 ? Math.round(((chunkIndex + 1) / totalChunks) * 100) : 0;

        let provider = '';
        try {
            provider = new URL(url).hostname.replace('www.', '');
        } catch (e) {
            provider = 'unknown';
        }

        const existingBookIndex = books.findIndex(b => b.id === url);

        let newBooks = [...books];

        if (existingBookIndex >= 0) {
            // Update existing
            newBooks[existingBookIndex] = {
                ...newBooks[existingBookIndex],
                lastChapterUrl: url,
                lastChapterTitle: title,
                lastChunkIndex: chunkIndex,
                lastReadTimestamp: timestamp,
                progressPercent: progressPercent,
                // Update title if it was missing or generic
                title: title || newBooks[existingBookIndex].title,
                storyTitle: storyTitle || newBooks[existingBookIndex].storyTitle,
                provider: provider || newBooks[existingBookIndex].provider
            };
        } else {
            // Add new
            const newBook: Book = {
                id: url, // Unique ID
                title: title,
                storyTitle: storyTitle,
                provider: provider,
                lastChapterUrl: url,
                lastChapterTitle: title,
                lastChunkIndex: chunkIndex,
                lastReadTimestamp: timestamp,
                isFavorite: false,
                progressPercent: progressPercent,
                // Default cover placeholder
                coverUrl: 'https://via.placeholder.com/150'
            };
            newBooks.push(newBook);
        }

        await saveLibrary(newBooks);
    }, [books]);

    const toggleFavorite = useCallback(async (url: string) => {
        const newBooks = books.map(b =>
            b.id === url ? { ...b, isFavorite: !b.isFavorite } : b
        );
        await saveLibrary(newBooks);
    }, [books]);

    const removeBook = useCallback(async (url: string) => {
        const newBooks = books.filter(b => b.id !== url);
        await saveLibrary(newBooks);
    }, [books]);

    return {
        books,
        recentBooks,
        favoriteBooks,
        isLoading,
        updateProgress,
        toggleFavorite,
        removeBook
    };
}
