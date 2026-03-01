// BackgroundAudioKeepAlive - Keep browser audio active when screen is off
// Uses multiple techniques to prevent Chrome from suspending audio
import { Platform } from 'react-native';

/**
 * BackgroundAudioKeepAlive uses multiple techniques to keep audio playing
 * when the screen is off on mobile browsers:
 * 
 * 1. Silent audio heartbeat - plays inaudible audio to keep audio context active
 * 2. Web Audio API oscillator - generates silent tone at very low frequency
 * 3. Audio context resume on visibility change
 */
export class BackgroundAudioKeepAlive {
  private static instance: BackgroundAudioKeepAlive | null = null;
  
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private silentAudio: HTMLAudioElement | null = null;
  private isRunning = false;
  private visibilityHandler: (() => void) | null = null;
  
  private constructor() {}

  static getInstance(): BackgroundAudioKeepAlive {
    if (!BackgroundAudioKeepAlive.instance) {
      BackgroundAudioKeepAlive.instance = new BackgroundAudioKeepAlive();
    }
    return BackgroundAudioKeepAlive.instance;
  }

  /**
   * Start the keep-alive system. Should be called after user interaction.
   */
  async start(): Promise<void> {
    if (Platform.OS !== 'web') return;
    if (this.isRunning) return;

    try {
      // Method 1: Web Audio API with silent oscillator
      await this.startSilentOscillator();
      
      // Method 2: Silent audio element heartbeat
      this.startSilentAudioHeartbeat();
      
      // Method 3: Resume audio on visibility change
      this.setupVisibilityHandler();
      
      this.isRunning = true;
      console.log('[BackgroundAudioKeepAlive] Started');
    } catch (error) {
      console.error('[BackgroundAudioKeepAlive] Failed to start:', error);
    }
  }

  private async startSilentOscillator(): Promise<void> {
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      console.warn('[BackgroundAudioKeepAlive] Web Audio API not supported');
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create a gain node with 0 volume (silent)
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.001; // Nearly silent but not quite 0
    this.gainNode.connect(this.audioContext.destination);

    // Create oscillator at very low frequency (sub-audible)
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 1; // 1 Hz - below human hearing
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();
  }

  private startSilentAudioHeartbeat(): void {
    // Create a silent audio element that loops
    // This helps maintain the browser's audio focus
    this.silentAudio = document.createElement('audio');
    this.silentAudio.loop = true;
    this.silentAudio.volume = 0.001;
    
    // Generate a tiny silent audio blob
    // This is a minimal valid MP3 file (silence)
    const silentMp3Base64 = 
      'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAGAAGn9AAAIwAANP8AAAQAAAGkAAAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxBAAAAGkHgAAAAAANIOAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
    
    try {
      const binaryString = atob(silentMp3Base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      this.silentAudio.src = URL.createObjectURL(blob);
      
      // Try to play (may be blocked until user interaction)
      this.silentAudio.play().catch(() => {
        // Will be started on user interaction
      });
    } catch (error) {
      console.warn('[BackgroundAudioKeepAlive] Failed to create silent audio:', error);
    }
  }

  private setupVisibilityHandler(): void {
    this.visibilityHandler = async () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - resume audio context
        if (this.audioContext?.state === 'suspended') {
          try {
            await this.audioContext.resume();
            console.log('[BackgroundAudioKeepAlive] AudioContext resumed on visibility');
          } catch (e) {
            console.warn('[BackgroundAudioKeepAlive] Failed to resume AudioContext:', e);
          }
        }
        
        // Resume silent audio
        if (this.silentAudio?.paused) {
          this.silentAudio.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Ensure audio context is active. Call this after user interaction.
   */
  async ensureActive(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    if (this.silentAudio?.paused) {
      await this.silentAudio.play().catch(() => {});
    }
  }

  /**
   * Stop the keep-alive system.
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.silentAudio) {
      this.silentAudio.pause();
      this.silentAudio.src = '';
      this.silentAudio = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.isRunning = false;
    console.log('[BackgroundAudioKeepAlive] Stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
