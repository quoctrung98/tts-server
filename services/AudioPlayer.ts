// Audio Player wrapper for web and native compatibility
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface AudioPlayerCallbacks {
  onFinish?: () => void;
  onError?: (error: string) => void;
}

export class AudioPlayer {
  private sound: Audio.Sound | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private callbacks: AudioPlayerCallbacks = {};
  private isWeb = Platform.OS === 'web';
  private volume: number = 0.8;

  private onLoadedData: (() => void) | null = null;
  private onError: ((e: Event | string) => void) | null = null;
  private onEnded: (() => void) | null = null;

  async load(uri: string, callbacks: AudioPlayerCallbacks, volume: number = 0.8) {
    this.callbacks = callbacks;
    this.volume = volume;

    try {
      if (this.isWeb) {
        // Use HTML5 Audio for web
        await this.loadWebAudio(uri);
      } else {
        // Use Expo Audio for native
        await this.loadNativeAudio(uri);
      }
    } catch (error: any) {
      console.error('Failed to load audio:', error);
      this.callbacks.onError?.(error.message);
      throw error;
    }
  }

  private async loadWebAudio(uri: string) {
    // Cleanup previous audio element completely
    this.cleanupWebAudio();

    return new Promise<void>((resolve, reject) => {
      // Use global HTML5 Audio constructor (not Expo Audio)
      const audio = new window.Audio(uri);

      // Store handlers so we can remove them later
      this.onLoadedData = () => {
        resolve();
      };

      this.onError = (e) => {
        console.error('Web audio error:', e);
        console.error('Audio src:', uri);
        this.callbacks.onError?.('Failed to load audio');
        reject(new Error('Failed to load audio'));
      };

      this.onEnded = () => {
        this.callbacks.onFinish?.();
      };

      audio.addEventListener('loadeddata', this.onLoadedData);
      audio.addEventListener('error', this.onError);
      audio.addEventListener('ended', this.onEnded);

      // Set volume
      audio.volume = this.volume;

      this.htmlAudio = audio;
    });
  }

  private cleanupWebAudio() {
    if (this.htmlAudio) {
      // Remove event listeners BEFORE clearing src
      if (this.onLoadedData) {
        this.htmlAudio.removeEventListener('loadeddata', this.onLoadedData);
      }
      if (this.onError) {
        this.htmlAudio.removeEventListener('error', this.onError);
      }
      if (this.onEnded) {
        this.htmlAudio.removeEventListener('ended', this.onEnded);
      }

      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }

    // Clear stored handlers
    this.onLoadedData = null;
    this.onError = null;
    this.onEnded = null;
  }

  private async loadNativeAudio(uri: string) {
    // Cleanup previous
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    // Configure audio mode
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

  async play() {
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
    }
  }

  async pause() {
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

  async stop() {
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

  async unload() {
    try {
      if (this.isWeb) {
        // Use the proper cleanup method that removes event listeners
        this.cleanupWebAudio();
      } else {
        if (this.sound) {
          await this.sound.unloadAsync();
          this.sound = null;
        }
      }
      // Clear callbacks to prevent any stale references
      this.callbacks = {};
    } catch (error: any) {
      console.error('Failed to unload:', error);
    }
  }

  isPlaying(): boolean {
    if (this.isWeb) {
      return this.htmlAudio ? !this.htmlAudio.paused : false;
    } else {
      // For native, we track state externally
      return false;
    }
  }
}

