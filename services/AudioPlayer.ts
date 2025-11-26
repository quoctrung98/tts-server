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
    // Cleanup previous
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
      this.htmlAudio = null;
    }
    
    return new Promise<void>((resolve, reject) => {
      // Use global HTML5 Audio constructor (not Expo Audio)
      const audio = new window.Audio(uri);
      
      audio.onloadeddata = () => {
        console.log('Web audio loaded');
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error('Web audio error:', e);
        console.error('Audio src:', uri);
        this.callbacks.onError?.('Failed to load audio');
        reject(new Error('Failed to load audio'));
      };
      
      audio.onended = () => {
        console.log('Web audio ended');
        this.callbacks.onFinish?.();
      };
      
      // Set volume
      audio.volume = this.volume;
      
      this.htmlAudio = audio;
    });
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
          console.log('Native audio ended');
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
        if (this.htmlAudio) {
          this.htmlAudio.pause();
          this.htmlAudio.src = '';
          this.htmlAudio = null;
        }
      } else {
        if (this.sound) {
          await this.sound.unloadAsync();
          this.sound = null;
        }
      }
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

