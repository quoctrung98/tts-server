// useDarkMode - Theme state management with persistence (Refactored to support Sepia)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark' | 'sepia';

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
    primary: string;
    border: string;
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
    primary: '#007bff',
    border: '#dee2e6',
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
    primary: '#4da3ff',
    border: '#4d4d4d',
};

const SEPIA_COLORS: ThemeColors = {
    background: '#f4ecd8',
    cardBackground: '#fdf6e3',
    text: '#5b4636',
    textSecondary: '#8f7e6d',
    inputBackground: '#e6dcb8',
    inputBorder: '#d3c9a5',
    sectionTitle: '#4c3b2e',
    contentBackground: '#fdf6e3',
    highlightBackground: '#eaddcf',
    highlightBorder: '#c2b3a3',
    highlightText: '#4c3b2e',
    shadowColor: '#5b4636',
    primary: '#d35400',
    border: '#d3c9a5',
};

export interface UseDarkModeReturn {
    isDarkMode: boolean;
    theme: ThemeMode;
    toggleDarkMode: () => Promise<void>; // Kept for backward compat, acts as cycleTheme
    cycleTheme: () => Promise<void>;
    colors: ThemeColors;
}

/**
 * Hook for managing theme state with persistence
 */
export function useDarkMode(): UseDarkModeReturn {
    const [theme, setTheme] = useState<ThemeMode>('light');

    // Load theme preference on mount
    useEffect(() => {
        const loadTheme = async () => {
            // Try load 'theme_mode' first
            const savedTheme = await storage.load<ThemeMode>('theme_mode', 'light');

            // Migration check: if no theme but 'dark_mode' exists
            const oldDarkMode = await storage.load<boolean>(storage.keys.DARK_MODE, false);

            if (savedTheme) {
                setTheme(savedTheme);
            } else if (oldDarkMode) {
                setTheme('dark');
            }
        };
        loadTheme();
    }, []);

    // Cycle theme: Light -> Sepia -> Dark -> Light
    const cycleTheme = useCallback(async () => {
        let newTheme: ThemeMode;
        if (theme === 'light') newTheme = 'sepia';
        else if (theme === 'sepia') newTheme = 'dark';
        else newTheme = 'light';

        setTheme(newTheme);
        await storage.save('theme_mode', newTheme);

        // Update legacy key for other potential consumers
        await storage.save(storage.keys.DARK_MODE, newTheme === 'dark');
    }, [theme]);

    // Alias for backward compatibility
    const toggleDarkMode = cycleTheme;

    // Memoize colors based on mode
    const colors = useMemo<ThemeColors>(() => {
        switch (theme) {
            case 'dark': return DARK_COLORS;
            case 'sepia': return SEPIA_COLORS;
            default: return LIGHT_COLORS;
        }
    }, [theme]);

    return {
        isDarkMode: theme === 'dark',
        theme,
        toggleDarkMode,
        cycleTheme,
        colors,
    };
}

export { LIGHT_COLORS, DARK_COLORS, SEPIA_COLORS };
