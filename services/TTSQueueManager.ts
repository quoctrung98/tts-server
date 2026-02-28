// TTS Queue Manager - Pre-fetch and cache audio chunks
// Uses PersistentAudioPlayer to maintain audio element across chunks
import { PersistentAudioPlayer, MediaSessionMetadata } from './PersistentAudioPlayer';
import { Platform } from 'react-native';

export interface AudioChunk {
  index: number;
  text: string;
  audioUri: string | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export class TTSQueueManager {
  private chunks: AudioChunk[] = [];
  private currentIndex: number = -1;
  private bufferSize: number = 5;
  private isPlaying: boolean = false;

  private ttsServerUrl: string;
  private voice: string;
  private speed: number;
  private pitch: number;
  private volume: number;

  private bookTitle: string = 'TTS Reader';
  private chapterTitle: string = '';

  // Use singleton persistent player to avoid gaps between chunks
  private player: PersistentAudioPlayer;
  private currentPlayingChunkId: number = 0;

  private onChunkStart?: (index: number, text: string) => void;
  private onChunkEnd?: (index: number) => void;
  private onAllComplete?: () => void;
  private onError?: (error: string) => void;

  constructor(
    texts: string[],
    ttsServerUrl: string,
    voice: string,
    speed: number,
    pitch: number = 0,
    volume: number = 0.8
  ) {
    this.ttsServerUrl = ttsServerUrl;
    this.voice = voice;
    this.speed = speed;
    this.pitch = pitch;
    this.volume = volume;

    // Get the singleton persistent player
    this.player = PersistentAudioPlayer.getInstance();

    // Initialize chunks (no longer storing player per chunk)
    this.chunks = texts.map((text, index) => ({
      index,
      text,
      audioUri: null,
      isLoading: false,
      isLoaded: false,
      error: null,
    }));
  }

  setCallbacks(callbacks: {
    onChunkStart?: (index: number, text: string) => void;
    onChunkEnd?: (index: number) => void;
    onAllComplete?: () => void;
    onError?: (error: string) => void;
  }) {
    this.onChunkStart = callbacks.onChunkStart;
    this.onChunkEnd = callbacks.onChunkEnd;
    this.onAllComplete = callbacks.onAllComplete;
    this.onError = callbacks.onError;
  }

  /**
   * Set metadata for Media Session (shown on lock screen when screen is off)
   * Call this before start() for best experience
   */
  setMediaMetadata(bookTitle: string, chapterTitle?: string) {
    this.bookTitle = bookTitle;
    this.chapterTitle = chapterTitle || '';
  }

  /**
   * Initialize Media Session for background audio on Chrome/mobile
   * This enables audio to continue when screen is off
   */
  initMediaSession() {
    if (Platform.OS !== 'web') return;

    PersistentAudioPlayer.initMediaSession({
      onPlay: () => {
        this.resume();
      },
      onPause: () => {
        this.pause();
      },
      onPreviousTrack: () => {
        if (this.currentIndex > 0) {
          this.jumpToChunk(this.currentIndex - 1);
        }
      },
      onNextTrack: () => {
        if (this.currentIndex < this.chunks.length - 1) {
          this.jumpToChunk(this.currentIndex + 1);
        }
      },
    });
  }

  private updateMediaSessionState() {
    if (Platform.OS !== 'web') return;

    const currentChunk = this.chunks[this.currentIndex];
    const previewText = currentChunk?.text?.substring(0, 50) || '';

    PersistentAudioPlayer.updateMediaSessionMetadata({
      title: this.chapterTitle || `Đoạn ${this.currentIndex + 1}/${this.chunks.length}`,
      artist: this.bookTitle,
      album: previewText + (currentChunk?.text?.length > 50 ? '...' : ''),
    });

    PersistentAudioPlayer.setMediaSessionPlaybackState(this.isPlaying ? 'playing' : 'paused');
  }

  async start(startIndex: number = 0) {
    this.isPlaying = true;
    this.currentIndex = startIndex;

    // Initialize Media Session for background audio on web
    this.initMediaSession();

    // Pre-fetch first few chunks
    this.prefetchChunks();

    // Start playing
    await this.playNext();
  }

  async pause() {
    this.isPlaying = false;
    await this.player.pause();
    this.updateMediaSessionState();
  }

  async resume() {
    this.isPlaying = true;
    await this.player.play();
    this.updateMediaSessionState();
  }

  async stop() {
    this.isPlaying = false;
    await this.player.stop();
    this.currentIndex = -1;
    PersistentAudioPlayer.setMediaSessionPlaybackState('none');
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalChunks(): number {
    return this.chunks.length;
  }

  getProgress(): number {
    if (this.chunks.length === 0) return 0;
    return Math.round(((this.currentIndex + 1) / this.chunks.length) * 100);
  }

  /**
   * Jump to a specific chunk index
   */
  async jumpToChunk(index: number) {
    if (index < 0 || index >= this.chunks.length) {
      console.error('Invalid chunk index:', index);
      return;
    }

    // Store playing state
    const wasPlaying = this.isPlaying;

    // Stop current playback
    await this.player.stop();

    // Invalidate current chunk ID to prevent old callbacks
    this.currentPlayingChunkId++;

    // Update index
    this.currentIndex = index;

    // Pre-fetch chunks around the target index
    this.prefetchChunks();

    // Resume playing if was playing before
    if (wasPlaying) {
      this.isPlaying = true;
      await this.playNext();
    }
  }

  private async prefetchChunks() {
    const startIdx = this.currentIndex;
    const endIdx = Math.min(startIdx + this.bufferSize, this.chunks.length);

    const promises = [];
    for (let i = startIdx; i < endIdx; i++) {
      if (!this.chunks[i].isLoaded && !this.chunks[i].isLoading) {
        promises.push(this.fetchChunk(i));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Preload the next chunk into the inactive audio buffer for gapless playback.
   * This is called while the current chunk is playing.
   */
  private async preloadNextChunkIntoBuffer() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.chunks.length) return;

    const nextChunk = this.chunks[nextIndex];
    
    // Wait for the chunk to be fetched if still loading
    let attempts = 0;
    while (nextChunk.isLoading && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (nextChunk.audioUri && nextChunk.isLoaded) {
      console.log(`[TTSQueueManager] Preloading chunk ${nextIndex} into inactive buffer`);
      await this.player.preloadNext(nextChunk.audioUri);
    }
  }

  private async fetchChunk(index: number) {
    const chunk = this.chunks[index];
    if (!chunk || chunk.isLoading || chunk.isLoaded) return;

    chunk.isLoading = true;

    try {
      // Calculate rate based on speed
      const ratePercent = Math.round((this.speed - 1.0) * 100);
      const rateString = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;

      // Calculate pitch string
      const pitchString = `${this.pitch >= 0 ? '+' : ''}${this.pitch}Hz`;

      // Request TTS
      const response = await fetch(`${this.ttsServerUrl}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chunk.text,
          voice: this.voice,
          rate: rateString,
          pitch: pitchString,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const blob = await response.blob();
      const audioUri = URL.createObjectURL(blob);

      chunk.audioUri = audioUri;
      chunk.isLoaded = true;
    } catch (error: any) {
      chunk.error = error.message;
      console.error(`❌ Failed to fetch chunk ${index}:`, error);
    } finally {
      chunk.isLoading = false;
    }
  }

  /**
   * Called after auto-advance from PersistentAudioPlayer.
   * Updates state and preloads next chunk, but doesn't restart playback.
   */
  private async playNextAfterAutoAdvance() {
    if (!this.isPlaying) {
      return;
    }

    if (this.currentIndex >= this.chunks.length) {
      this.onAllComplete?.();
      return;
    }

    const chunk = this.chunks[this.currentIndex];
    
    // Audio is already playing (auto-advanced), just update state and callbacks
    if (this.player.isCurrentlyPlaying()) {
      console.log(`[TTSQueueManager] Chunk ${this.currentIndex} auto-advanced, updating state`);
      
      this.currentPlayingChunkId++;
      const chunkId = this.currentPlayingChunkId;
      const currentIdx = this.currentIndex;
      
      // Update callbacks for the new chunk
      this.player.updateCallbacks({
        onFinish: () => {
          if (this.currentPlayingChunkId !== chunkId || this.currentIndex !== currentIdx) {
            return;
          }
          this.onChunkEnd?.(currentIdx);
          this.currentIndex++;
          this.playNextAfterAutoAdvance();
        },
        onError: (error) => {
          if (this.currentPlayingChunkId !== chunkId || this.currentIndex !== currentIdx) {
            return;
          }
          if (error.includes('NotAllowedError') || error.includes('user didn\'t interact')) {
            this.isPlaying = false;
            this.onError?.('NotAllowedError');
            return;
          }
          this.onError?.(error);
          this.currentIndex++;
          this.playNext();
        },
      });
      
      this.onChunkStart?.(this.currentIndex, chunk.text);
      this.updateMediaSessionState();
      this.prefetchChunks();
      this.preloadNextChunkIntoBuffer();
      return;
    }

    // Not auto-advanced, play normally
    await this.playNext();
  }

  private async playNext() {
    if (!this.isPlaying) {
      return;
    }

    if (this.currentIndex >= this.chunks.length) {
      try {
        if (this.onAllComplete) {
          this.onAllComplete();
        } else {
          console.warn('⚠️ [TTSQueueManager] onAllComplete callback is undefined!');
        }
      } catch (error) {
        console.error('❌ [TTSQueueManager] Error in onAllComplete:', error);
      }
      return;
    }

    const chunk = this.chunks[this.currentIndex];

    // Wait for chunk to be loaded
    while (chunk.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (chunk.error) {
      console.error(`Error in chunk ${this.currentIndex}:`, chunk.error);
      this.onError?.(chunk.error);
      this.currentIndex++;
      await this.playNext();
      return;
    }

    if (!chunk.audioUri) {
      console.error(`No audio URI for chunk ${this.currentIndex}`);
      this.currentIndex++;
      await this.playNext();
      return;
    }

    try {
      // Capture current state to verify callback validity
      const currentIdx = this.currentIndex;
      this.currentPlayingChunkId++;
      const chunkId = this.currentPlayingChunkId;

      // Load audio into the persistent player (may use preloaded buffer)
      await this.player.load(
        chunk.audioUri,
        {
          onFinish: () => {
            // IMPORTANT: Only proceed if this is still the current chunk
            // (prevents old callbacks from triggering after seek)
            if (this.currentPlayingChunkId !== chunkId || this.currentIndex !== currentIdx) {
              return;
            }

            this.onChunkEnd?.(currentIdx);

            // Move to next chunk
            this.currentIndex++;
            
            // Note: PersistentAudioPlayer may have already auto-played the next chunk
            // for gapless playback. playNext() will handle this gracefully.
            this.playNextAfterAutoAdvance();
          },
          onError: (error) => {
            console.error(`❌ Error playing chunk ${currentIdx}:`, error);

            // Only proceed if this is still the current chunk
            if (this.currentPlayingChunkId !== chunkId || this.currentIndex !== currentIdx) {
              return;
            }

            // Check for autoplay policy error
            if (error.includes('NotAllowedError') || error.includes('user didn\'t interact')) {
              this.isPlaying = false;
              this.onError?.('NotAllowedError');
              return;
            }

            this.onError?.(error);
            this.currentIndex++;
            this.playNext();
          },
        },
        this.volume
      );

      // Start playing (if not already auto-advanced from previous chunk)
      if (!this.player.isCurrentlyPlaying()) {
        await this.player.play();
      }

      this.onChunkStart?.(this.currentIndex, chunk.text);

      // Update Media Session for lock screen controls
      this.updateMediaSessionState();

      // Pre-fetch next chunks while playing
      this.prefetchChunks();
      
      // IMPORTANT: Preload next chunk into inactive audio buffer for gapless playback
      this.preloadNextChunkIntoBuffer();

    } catch (error: any) {
      console.error(`Failed to play chunk ${this.currentIndex}:`, error);

      // Check for autoplay policy error
      if (error.name === 'NotAllowedError' || error.message?.includes('NotAllowedError') || error.message?.includes('user didn\'t interact')) {
        this.isPlaying = false;
        this.onError?.('NotAllowedError');
        return;
      }

      this.onError?.(error.message);
      this.currentIndex++;
      await this.playNext();
    }
  }
}
