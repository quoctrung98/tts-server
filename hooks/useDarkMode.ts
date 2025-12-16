// useDarkMode - Dark mode state management with persistence
import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

export interface ThemeColors {
    background: string;
    cardBackground: string;
    text: string;
    textSecondary: string;
    inputBackground: string;
    inputBorder: string;
    sectionTitle: string;
    contentBackground: string;
    highlightBackground: string;
    highlightBorder: string;
    highlightText: string;
    shadowColor: string;
}

const LIGHT_COLORS: ThemeColors = {
    background: '#f5f7fa',
    cardBackground: 'white',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    inputBackground: '#f8f9fa',
    inputBorder: '#dee2e6',
    sectionTitle: '#34495e',
    contentBackground: '#f8f9fa',
    highlightBackground: '#fff3cd',
    highlightBorder: '#ffc107',
    highlightText: '#000000',
    shadowColor: '#000',
};

const DARK_COLORS: ThemeColors = {
    background: '#1a1a1a',
    cardBackground: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    inputBackground: '#3d3d3d',
    inputBorder: '#4d4d4d',
    sectionTitle: '#ffffff',
    contentBackground: '#2d2d2d',
    highlightBackground: '#333333',
    highlightBorder: '#666666',
    highlightText: '#ffffff',
    shadowColor: '#000',
};

export interface UseDarkModeReturn {
    isDarkMode: boolean;
    toggleDarkMode: () => Promise<void>;
    colors: ThemeColors;
}

/**
 * Hook for managing dark mode state with persistence
 */
export function useDarkMode(): UseDarkModeReturn {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load dark mode preference on mount
    useEffect(() => {
        const loadDarkMode = async () => {
            const saved = await storage.load<boolean>(storage.keys.DARK_MODE, false);
            setIsDarkMode(saved);
            setIsLoaded(true);
        };
        loadDarkMode();
    }, []);

    // Toggle dark mode and persist
    const toggleDarkMode = useCallback(async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        await storage.save(storage.keys.DARK_MODE, newMode);
    }, [isDarkMode]);

    // Memoize colors based on mode
    const colors = useMemo<ThemeColors>(() => {
        return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
    }, [isDarkMode]);

    return {
        isDarkMode,
        toggleDarkMode,
        colors,
    };
}

export { LIGHT_COLORS, DARK_COLORS };
