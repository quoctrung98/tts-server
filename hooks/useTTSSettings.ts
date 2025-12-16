// useTTSSettings - TTS settings management with persistence
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { TTSSettings } from '../components/SettingsModal';

const DEFAULT_SETTINGS: TTSSettings = {
    voice: 'female',
    voiceName: 'vi-VN-HoaiMyNeural',
    speed: 1.5,
    pitch: -10,
    volume: 1.0,
    autoNextChapter: true,
    enablePitchBlack: false,
};

export interface UseTTSSettingsReturn {
    settings: TTSSettings;
    updateSettings: (newSettings: TTSSettings) => Promise<void>;
    isLoading: boolean;
}

/**
 * Hook for managing TTS settings with persistence
 */
export function useTTSSettings(): UseTTSSettingsReturn {
    const [settings, setSettings] = useState<TTSSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const saved = await storage.load<TTSSettings>(
                    storage.keys.TTS_SETTINGS,
                    DEFAULT_SETTINGS
                );

                // Merge with default to ensure all fields exist (backward compatibility)
                const merged: TTSSettings = {
                    ...DEFAULT_SETTINGS,
                    ...saved,
                };

                setSettings(merged);
            } catch (error) {
                console.error('Error loading TTS settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Update and persist settings
    const updateSettings = useCallback(async (newSettings: TTSSettings) => {
        setSettings(newSettings);
        await storage.save(storage.keys.TTS_SETTINGS, newSettings);
    }, []);

    return {
        settings,
        updateSettings,
        isLoading,
    };
}

export { DEFAULT_SETTINGS };
