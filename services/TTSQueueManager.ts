// TTS Queue Manager - Pre-fetch and cache audio chunks
import { AudioPlayer } from './AudioPlayer';

export interface AudioChunk {
  index: number;
  text: string;
  audioUri: string | null;
  player: AudioPlayer | null;
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

    // Initialize chunks
    this.chunks = texts.map((text, index) => ({
      index,
      text,
      audioUri: null,
      player: null,
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

  async start(startIndex: number = 0) {
    this.isPlaying = true;
    this.currentIndex = startIndex;

    // Pre-fetch first few chunks
    this.prefetchChunks();

    // Start playing
    await this.playNext();
  }

  async pause() {
    this.isPlaying = false;
    const current = this.chunks[this.currentIndex];
    if (current?.player) {
      await current.player.pause();
    }
  }

  async resume() {
    this.isPlaying = true;
    const current = this.chunks[this.currentIndex];
    if (current?.player) {
      await current.player.play();
    }
  }

  async stop() {
    this.isPlaying = false;

    // Stop and unload all players
    for (const chunk of this.chunks) {
      if (chunk.player) {
        try {
          await chunk.player.stop();
          await chunk.player.unload();
        } catch (e) {
          // Ignore errors during cleanup
        }
        chunk.player = null;
      }
    }

    this.currentIndex = -1;
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

    // IMPORTANT: Stop ALL currently playing audio
    // Stop and cleanup current chunk
    if (this.currentIndex >= 0 && this.currentIndex < this.chunks.length) {
      const currentChunk = this.chunks[this.currentIndex];
      if (currentChunk?.player) {
        try {
          await currentChunk.player.stop();
          await currentChunk.player.unload();
          currentChunk.player = null;
        } catch (e) {
          console.error('Error stopping current chunk:', e);
        }
      }
    }

    // Also cleanup any other chunks that might be playing (safety check)
    for (let i = 0; i < this.chunks.length; i++) {
      if (i !== index && this.chunks[i]?.player) {
        try {
          await this.chunks[i].player!.stop();
          await this.chunks[i].player!.unload();
          this.chunks[i].player = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    // Update index
    this.currentIndex = index;
    // Pre-fetch chunks around the target index
    this.prefetchChunks();

    // Resume playing if was playing before
    if (wasPlaying) {
      this.isPlaying = true;
      await this.playNext();
    } else {
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
      // Create audio player
      const player = new AudioPlayer();
      const currentIdx = this.currentIndex; // Capture index

      // Load audio with callbacks and volume
      await player.load(
        chunk.audioUri,
        {
          onFinish: () => {
            // IMPORTANT: Only proceed if this is still the current chunk
            // (prevents old callbacks from triggering after seek)
            if (this.currentIndex !== currentIdx) {
              return;
            }

            // Cleanup this chunk's player
            const finishedChunk = this.chunks[currentIdx];
            if (finishedChunk.player) {
              finishedChunk.player.unload().catch(() => { });
              finishedChunk.player = null;
            }

            this.onChunkEnd?.(currentIdx);

            // Move to next
            this.currentIndex++;
            this.playNext();
          },
          onError: (error) => {
            console.error(`❌ Error playing chunk ${currentIdx}:`, error);

            // Only proceed if this is still the current chunk
            if (this.currentIndex !== currentIdx) {
              return;
            }

            this.onError?.(error);
            this.currentIndex++;
            this.playNext();
          },
        },
        this.volume
      );

      chunk.player = player;

      // Start playing
      await player.play();

      this.onChunkStart?.(this.currentIndex, chunk.text);

      // Pre-fetch next chunks while playing
      this.prefetchChunks();

    } catch (error: any) {
      console.error(`Failed to play chunk ${this.currentIndex}:`, error);
      this.onError?.(error.message);
      this.currentIndex++;
      await this.playNext();
    }
  }

}

