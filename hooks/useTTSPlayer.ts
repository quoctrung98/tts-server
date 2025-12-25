// useTTSPlayer - TTS playback control hook
import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { TTSQueueManager } from '../services/TTSQueueManager';
import { splitIntoSentences, groupSentencesIntoChunks } from '../utils/textUtils';
import { TTS_SERVER_URL } from '../config';
import { TTSSettings } from '../components/SettingsModal';
import { ChapterContent } from '../providers/IChapterProvider';

export interface UseTTSPlayerReturn {
    // State
    isPlaying: boolean;
    isLoading: boolean;
    currentChunkIndex: number;
    textChunks: string[];
    readingProgress: number;
    seekValue: number;
    isSeeking: boolean;
    isWaitingForInteraction: boolean;

    // Actions
    startPlaying: (content: ChapterContent, onChunkStart?: ChunkCallback, onComplete?: CompleteCallback, startIndex?: number) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    stop: () => Promise<void>;

    // Seek controls
    handleSeekStart: () => void;
    handleSeekChange: (value: number) => void;
    handleSeekEnd: (value: number) => Promise<void>;

    // Sleep Timer
    sleepTimerMinutes: number | null;
    timeRemaining: number | null;
    setSleepTimer: (minutes: number | null) => void;

    // Reset
    reset: () => void;
}

type ChunkCallback = (index: number, text: string) => void;
type CompleteCallback = () => void;

/**
 * Hook for managing TTS audio playback
 */
export function useTTSPlayer(settings: TTSSettings): UseTTSPlayerReturn {
    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [textChunks, setTextChunks] = useState<string[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
    const [readingProgress, setReadingProgress] = useState(0);

    // Seek state
    const [seekValue, setSeekValue] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isWaitingForInteraction, setIsWaitingForInteraction] = useState(false);

    // Refs
    const ttsManagerRef = useRef<TTSQueueManager | null>(null);
    const onChunkStartRef = useRef<ChunkCallback | undefined>(undefined);
    const onCompleteRef = useRef<CompleteCallback | undefined>(undefined);

    // Start playing content
    const startPlaying = useCallback(async (
        content: ChapterContent,
        onChunkStart?: ChunkCallback,
        onComplete?: CompleteCallback,
        startIndex: number = 0
    ) => {
        setIsLoading(true);
        onChunkStartRef.current = onChunkStart;
        onCompleteRef.current = onComplete;

        try {
            // Stop current playback if any
            if (ttsManagerRef.current) {
                await ttsManagerRef.current.stop();
            }

            // Split content into chunks
            // Prepend title to content so it's read first
            const sentences = splitIntoSentences(content.content);
            const bodyChunks = groupSentencesIntoChunks(sentences, 50, 300);
            const chunks = [content.title, ...bodyChunks];

            setTextChunks(chunks);
            setCurrentChunkIndex(startIndex);
            setReadingProgress(chunks.length > 0 ? Math.round(((startIndex + 1) / chunks.length) * 100) : 0);
            setSeekValue(startIndex);

            // Create TTS manager with current settings
            const manager = new TTSQueueManager(
                chunks,
                TTS_SERVER_URL,
                settings.voiceName,
                settings.speed,
                settings.pitch,
                settings.volume
            );

            manager.setCallbacks({
                onChunkStart: (index, text) => {
                    setCurrentChunkIndex(index);
                    setReadingProgress(Math.round(((index + 1) / chunks.length) * 100));

                    // Update seek slider (only if not currently seeking)
                    setSeekValue(prev => isSeeking ? prev : index);

                    // Call external callback
                    onChunkStartRef.current?.(index, text);
                },
                onChunkEnd: () => { },
                onAllComplete: async () => {
                    setIsPlaying(false);
                    setCurrentChunkIndex(-1);
                    onCompleteRef.current?.();
                },
                onError: (error) => {
                    if (error === 'NotAllowedError' || error.includes('not allowed')) {
                        setIsPlaying(false);
                        setIsWaitingForInteraction(true);
                        // Don't alert, UI will show resume button
                    } else {
                        Alert.alert('Lỗi', `Lỗi khi đọc: ${error}`);
                    }
                },
            });

            ttsManagerRef.current = manager;

            // Start playing
            await manager.start(startIndex);
            setIsPlaying(true);
        } catch (error: any) {
            console.error('Speech error:', error);
            if (error.name === 'NotAllowedError' || error.message?.includes('NotAllowedError')) {
                // Autoplay blocked - expected browser behavior
                setIsPlaying(false);
                setIsWaitingForInteraction(true);
            } else {
                Alert.alert('Lỗi', 'Không thể tạo giọng đọc: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [settings, isSeeking]);

    // Toggle play/pause
    const togglePlayPause = useCallback(async () => {
        if (!ttsManagerRef.current) return;

        if (isPlaying) {
            await ttsManagerRef.current.pause();
            setIsPlaying(false);
        } else {
            await ttsManagerRef.current.resume();
            setIsPlaying(true);
        }
    }, [isPlaying]);

    // Sleep Timer state
    const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Set Sleep Timer
    const setSleepTimer = useCallback((minutes: number | null) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setSleepTimerMinutes(minutes);

        if (minutes !== null) {
            setTimeRemaining(minutes * 60);
        } else {
            setTimeRemaining(null);
        }
    }, []);

    // Helper refs for stop callback
    // We cannot easily move stop() before useEffect because it depends on refs inside the component
    // But we can use a ref for the stop function itself if needed, or simply useCallback hoisting (which is not how JS works with const)
    // Actually, simple fix: Move stop definition ABOVE useEffect.

    const stop = useCallback(async () => {
        if (ttsManagerRef.current) {
            await ttsManagerRef.current.stop();
            setIsPlaying(false);
            setCurrentChunkIndex(-1);
            setReadingProgress(0);
            setSeekValue(0);
            setSleepTimer(null);
        }
    }, [setSleepTimer]);

    // Timer countdown effect
    useEffect(() => {
        if (sleepTimerMinutes !== null && isPlaying) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null) return null;
                    if (prev <= 1) {
                        // Time's up
                        stop();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [sleepTimerMinutes, isPlaying, stop]); // Removed setSleepTimer dependency to avoid cycle if it changes frequently (it shouldn't)

    // Seek controls
    const handleSeekStart = useCallback(() => {
        setIsSeeking(true);
    }, []);

    const handleSeekChange = useCallback((value: number) => {
        setSeekValue(value);
    }, []);

    const handleSeekEnd = useCallback(async (value: number) => {
        setIsSeeking(false);

        if (ttsManagerRef.current && textChunks.length > 0) {
            const targetIndex = Math.floor(value);
            await ttsManagerRef.current.jumpToChunk(targetIndex);
            setCurrentChunkIndex(targetIndex);
            setReadingProgress(Math.round(((targetIndex + 1) / textChunks.length) * 100));
        }
    }, [textChunks.length]);

    // Reset state
    const reset = useCallback(() => {
        setTextChunks([]);
        setCurrentChunkIndex(-1);
        setReadingProgress(0);
        setSeekValue(0);
        setIsPlaying(false);
        setIsWaitingForInteraction(false);
    }, []);

    return {
        isPlaying,
        isLoading,
        currentChunkIndex,
        textChunks,
        readingProgress,
        seekValue,
        isSeeking,
        isWaitingForInteraction,
        sleepTimerMinutes,
        timeRemaining,
        startPlaying,
        togglePlayPause,
        stop,
        handleSeekStart,
        handleSeekChange,
        handleSeekEnd,
        reset,
        setSleepTimer,
    };
}
