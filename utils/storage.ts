// LocalStorage utility functions
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  TTS_SETTINGS: 'tts_settings',
  LAST_CHAPTER_URL: 'last_chapter_url',
  READING_HISTORY: 'reading_history',
  READING_PROGRESS: 'reading_progress',
  DARK_MODE: 'dark_mode',
};

export interface ReadingProgress {
  chapterUrl: string;
  chapterTitle?: string;
  chunkIndex: number;
  timestamp: number;
}

export const storage = {
  /**
   * Save data to localStorage
   */
  async save(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, jsonValue);
      } else {
        // For native, would use AsyncStorage
        // await AsyncStorage.setItem(key, jsonValue);
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },

  /**
   * Load data from localStorage
   */
  async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (Platform.OS === 'web') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } else {
        // For native, would use AsyncStorage
        // const item = await AsyncStorage.getItem(key);
        // return item ? JSON.parse(item) : defaultValue;
        return defaultValue;
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove data from localStorage
   */
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        // For native, would use AsyncStorage
        // await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },

  /**
   * Clear all data from localStorage
   */
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
      } else {
        // For native, would use AsyncStorage
        // await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Convenience methods for specific data
  keys: STORAGE_KEYS,
};

