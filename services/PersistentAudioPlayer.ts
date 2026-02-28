// Persistent Audio Player - Dual buffer for gapless playback
// Uses two audio elements to prevent Media Session from being lost between chunks
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface AudioPlayerCallbacks {
  onFinish?: () => void;
  onError?: (error: string) => void;
}

export interface MediaSessionMetadata {
  title?: string;
  artist?: string;
  album?: string;
}

/**
 * Dual-buffer audio player for gapless playback.
 * Uses two audio elements: one playing, one preloading.
 * This prevents Chrome from losing Media Session between chunks.
 */
export class PersistentAudioPlayer {
  private static instance: PersistentAudioPlayer | null = null;

  private sound: Audio.Sound | null = null;
  
  // Dual audio buffers for web
  private audioA: HTMLAudioElement | null = null;
  private audioB: HTMLAudioElement | null = null;
  private activeAudio: 'A' | 'B' = 'A';
  
  private callbacks: AudioPlayerCallbacks = {};
  private isWeb = Platform.OS === 'web';
  private volume: number = 0.8;
  private currentChunkId: number = 0;

  private loadResolve: (() => void) | null = null;
  private loadReject: ((error: Error) => void) | null = null;
  
  // Preloaded next chunk
  private preloadedUri: string | null = null;
  private preloadedInBuffer: 'A' | 'B' | null = null;
  
  // Auto-advance callback (set by TTSQueueManager)
  private onAutoAdvance: (() => void) | null = null;

  private static mediaSessionInitialized = false;

  private constructor() {
    if (this.isWeb) {
      this.initWebAudio();
    }
  }

  static getInstance(): PersistentAudioPlayer {
    if (!PersistentAudioPlayer.instance) {
      PersistentAudioPlayer.instance = new PersistentAudioPlayer();
    }
    return PersistentAudioPlayer.instance;
  }

  private initWebAudio() {
    // Create two audio elements for gapless playback
    this.audioA = this.createAudioElement('A');
    this.audioB = this.createAudioElement('B');
    this.activeAudio = 'A';
  }

  private createAudioElement(id: string): HTMLAudioElement {
    const audio = new window.Audio();
    audio.preload = 'auto';
    
    audio.addEventListener('ended', () => {
      // Only trigger if this is the active audio
      if ((id === 'A' && this.activeAudio === 'A') || 
          (id === 'B' && this.activeAudio === 'B')) {
        
        // GAPLESS PLAYBACK: If we have a preloaded chunk, play it IMMEDIATELY
        // before calling the callback, to minimize gap
        if (this.preloadedUri && this.preloadedInBuffer) {
          this.activeAudio = this.preloadedInBuffer;
          const nextAudio = this.getActiveAudioElement();
          this.preloadedUri = null;
          this.preloadedInBuffer = null;
          
          // Play immediately, don't wait
          if (nextAudio) {
            nextAudio.play().catch(e => console.error('Auto-advance play error:', e));
          }
        }
        
        // Then call the callback (which will update state, preload next, etc.)
        this.callbacks.onFinish?.();
      }
    });

    audio.addEventListener('error', (e) => {
      if ((id === 'A' && this.activeAudio === 'A') || 
          (id === 'B' && this.activeAudio === 'B')) {
        this.callbacks.onError?.('Failed to load audio');
        this.loadReject?.(new Error('Failed to load audio'));
        this.loadResolve = null;
        this.loadReject = null;
      }
    });

    audio.addEventListener('loadeddata', () => {
      if ((id === 'A' && this.activeAudio === 'A') || 
          (id === 'B' && this.activeAudio === 'B')) {
        this.loadResolve?.();
        this.loadResolve = null;
        this.loadReject = null;
      }
    });

    return audio;
  }

  private getActiveAudioElement(): HTMLAudioElement | null {
    return this.activeAudio === 'A' ? this.audioA : this.audioB;
  }

  private getInactiveAudioElement(): HTMLAudioElement | null {
    return this.activeAudio === 'A' ? this.audioB : this.audioA;
  }

  /**
   * Preload the next chunk into inactive buffer (call while current chunk is playing)
   */
  async preloadNext(uri: string): Promise<void> {
    if (!this.isWeb) return;
    if (!this.audioA || !this.audioB) return;

    const inactiveBuffer = this.activeAudio === 'A' ? 'B' : 'A';
    const inactiveAudio = this.getInactiveAudioElement()!;
    
    inactiveAudio.volume = this.volume;
    inactiveAudio.src = uri;
    inactiveAudio.load();
    
    this.preloadedUri = uri;
    this.preloadedInBuffer = inactiveBuffer;
  }

  /**
   * Update callbacks for the current chunk (used after auto-advance)
   */
  updateCallbacks(callbacks: AudioPlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load a new audio source. If already preloaded, just switch buffers.
   */
  async load(uri: string, callbacks: AudioPlayerCallbacks, volume: number = 0.8): Promise<void> {
    this.callbacks = callbacks;
    this.volume = volume;
    this.currentChunkId++;

    if (this.isWeb) {
      await this.loadWebAudio(uri);
    } else {
      await this.loadNativeAudio(uri);
    }
  }

  private async loadWebAudio(uri: string): Promise<void> {
    if (!this.audioA || !this.audioB) {
      this.initWebAudio();
    }

    // Check if this URI was already preloaded into inactive buffer
    if (this.preloadedUri === uri && this.preloadedInBuffer) {
      this.activeAudio = this.preloadedInBuffer;
      this.preloadedUri = null;
      this.preloadedInBuffer = null;
      return; // Already loaded, no need to wait
    }

    // Not preloaded, load normally
    // Switch to the other buffer for the new chunk
    this.activeAudio = this.activeAudio === 'A' ? 'B' : 'A';
    const nextAudio = this.getActiveAudioElement()!;
    
    return new Promise<void>((resolve, reject) => {
      this.loadResolve = resolve;
      this.loadReject = reject;

      nextAudio.volume = this.volume;
      nextAudio.src = uri;
      nextAudio.load();
    });
  }

  private async loadNativeAudio(uri: string): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, volume: this.volume },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.callbacks.onFinish?.();
        }
      }
    );

    this.sound = sound;
  }

  async play(): Promise<void> {
    try {
      if (this.isWeb) {
        const activeAudio = this.getActiveAudioElement();
        const inactiveAudio = this.getInactiveAudioElement();
        
        if (activeAudio) {
          // Stop the OTHER audio element (the previous chunk)
          if (inactiveAudio && !inactiveAudio.paused) {
            inactiveAudio.pause();
            inactiveAudio.currentTime = 0;
          }
          
          await activeAudio.play();
        }
      } else {
        if (this.sound) {
          await this.sound.playAsync();
        }
      }
    } catch (error: any) {
      console.error('Failed to play:', error);
      this.callbacks.onError?.(error.message);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.isWeb) {
        const activeAudio = this.getActiveAudioElement();
        if (activeAudio) {
          activeAudio.pause();
        }
      } else {
        if (this.sound) {
          await this.sound.pauseAsync();
        }
      }
    } catch (error: any) {
      console.error('Failed to pause:', error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.isWeb) {
        // Stop both audio elements
        if (this.audioA) {
          this.audioA.pause();
          this.audioA.currentTime = 0;
        }
        if (this.audioB) {
          this.audioB.pause();
          this.audioB.currentTime = 0;
        }
      } else {
        if (this.sound) {
          await this.sound.stopAsync();
        }
      }
    } catch (error: any) {
      console.error('Failed to stop:', error);
    }
  }

  getCurrentChunkId(): number {
    return this.currentChunkId;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.isWeb) {
      if (this.audioA) this.audioA.volume = volume;
      if (this.audioB) this.audioB.volume = volume;
    }
  }

  isCurrentlyPlaying(): boolean {
    if (this.isWeb) {
      const activeAudio = this.getActiveAudioElement();
      return activeAudio ? !activeAudio.paused : false;
    } else {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.isWeb) {
      if (this.audioA) {
        this.audioA.pause();
        this.audioA.src = '';
        this.audioA = null;
      }
      if (this.audioB) {
        this.audioB.pause();
        this.audioB.src = '';
        this.audioB = null;
      }
    } else if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    this.callbacks = {};
    PersistentAudioPlayer.instance = null;
  }

  // ==================== Media Session API ====================

  static initMediaSession(handlers: {
    onPlay?: () => void;
    onPause?: () => void;
    onSeekBackward?: () => void;
    onSeekForward?: () => void;
    onPreviousTrack?: () => void;
    onNextTrack?: () => void;
  }): void {
    if (Platform.OS !== 'web') return;
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported');
      return;
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        handlers.onPlay?.();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handlers.onPause?.();
      });

      if (handlers.onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', () => {
          handlers.onSeekBackward?.();
        });
      }

      if (handlers.onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', () => {
          handlers.onSeekForward?.();
        });
      }

      if (handlers.onPreviousTrack) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlers.onPreviousTrack?.();
        });
      }

      if (handlers.onNextTrack) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handlers.onNextTrack?.();
        });
      }

      PersistentAudioPlayer.mediaSessionInitialized = true;
      console.log('[PersistentAudioPlayer] Media Session initialized');
    } catch (error) {
      console.error('Failed to initialize Media Session:', error);
    }
  }

  static updateMediaSessionMetadata(metadata: MediaSessionMetadata): void {
    if (Platform.OS !== 'web') return;
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title || 'TTS Audio',
        artist: metadata.artist || 'TTS Reader',
        album: metadata.album || '',
      });
    } catch (error) {
      console.error('Failed to update Media Session metadata:', error);
    }
  }

  static setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (Platform.OS !== 'web') return;
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch (error) {
      console.error('Failed to set playback state:', error);
    }
  }
}
