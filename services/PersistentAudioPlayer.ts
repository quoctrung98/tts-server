// Persistent Audio Player - Single audio element reused across chunks
// Prevents Media Session from being lost between chunks
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
 * Singleton audio player that maintains a persistent audio element.
 * This prevents Chrome from throttling the tab when switching between chunks.
 */
export class PersistentAudioPlayer {
  private static instance: PersistentAudioPlayer | null = null;

  private sound: Audio.Sound | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private callbacks: AudioPlayerCallbacks = {};
  private isWeb = Platform.OS === 'web';
  private volume: number = 0.8;
  private currentChunkId: number = 0;

  private onLoadedData: (() => void) | null = null;
  private onErrorHandler: ((e: Event | string) => void) | null = null;
  private onEnded: (() => void) | null = null;
  private loadResolve: (() => void) | null = null;
  private loadReject: ((error: Error) => void) | null = null;

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
    // Create a single persistent audio element
    this.htmlAudio = new window.Audio();

    // Setup persistent event handlers
    this.onLoadedData = () => {
      this.loadResolve?.();
      this.loadResolve = null;
      this.loadReject = null;
    };

    this.onErrorHandler = (e) => {
      console.error('Web audio error:', e);
      this.callbacks.onError?.('Failed to load audio');
      this.loadReject?.(new Error('Failed to load audio'));
      this.loadResolve = null;
      this.loadReject = null;
    };

    this.onEnded = () => {
      this.callbacks.onFinish?.();
    };

    this.htmlAudio.addEventListener('loadeddata', this.onLoadedData);
    this.htmlAudio.addEventListener('error', this.onErrorHandler);
    this.htmlAudio.addEventListener('ended', this.onEnded);
  }

  /**
   * Load a new audio source without destroying the audio element
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
    if (!this.htmlAudio) {
      this.initWebAudio();
    }

    return new Promise<void>((resolve, reject) => {
      this.loadResolve = resolve;
      this.loadReject = reject;

      // Just change the src - don't recreate the element
      this.htmlAudio!.pause();
      this.htmlAudio!.volume = this.volume;
      this.htmlAudio!.src = uri;
      this.htmlAudio!.load();
    });
  }

  private async loadNativeAudio(uri: string): Promise<void> {
    // For native, we still need to unload/reload due to Expo Audio limitations
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
        if (this.htmlAudio) {
          await this.htmlAudio.play();
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
        if (this.htmlAudio) {
          this.htmlAudio.pause();
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
        if (this.htmlAudio) {
          this.htmlAudio.pause();
          this.htmlAudio.currentTime = 0;
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

  /**
   * Get current chunk ID (used to verify callbacks are still valid)
   */
  getCurrentChunkId(): number {
    return this.currentChunkId;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.volume = volume;
    if (this.isWeb && this.htmlAudio) {
      this.htmlAudio.volume = volume;
    }
  }

  isCurrentlyPlaying(): boolean {
    if (this.isWeb) {
      return this.htmlAudio ? !this.htmlAudio.paused : false;
    } else {
      return false;
    }
  }

  /**
   * Cleanup - only call when completely done with audio
   */
  async destroy(): Promise<void> {
    if (this.isWeb && this.htmlAudio) {
      if (this.onLoadedData) {
        this.htmlAudio.removeEventListener('loadeddata', this.onLoadedData);
      }
      if (this.onErrorHandler) {
        this.htmlAudio.removeEventListener('error', this.onErrorHandler);
      }
      if (this.onEnded) {
        this.htmlAudio.removeEventListener('ended', this.onEnded);
      }
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
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
      console.log('Media Session initialized for background audio');
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
