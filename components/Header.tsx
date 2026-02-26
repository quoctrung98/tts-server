// Header - App header with dark mode toggle and settings button
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ThemeColors, ThemeMode } from '../hooks/useDarkMode';

interface HeaderProps {
    theme: ThemeMode;
    onToggleTheme: () => void;
    onOpenSettings: () => void;
    onOpenHistory: () => void;
    colors: ThemeColors;
}

export function Header({ theme, onToggleTheme, onOpenSettings, onOpenHistory, colors }: HeaderProps) {
    const getThemeIcon = () => {
        switch (theme) {
            case 'light': return '🍂'; // Icon for switching TO Sepia? Or current state?
            // Usually button shows what will happen or current state? 
            // Let's show "Current State" icon or "Next State" icon?
            // Best: Show icon representing current state.
            // Light: ☀️, Dark: 🌙, Sepia: 🍂
            case 'sepia': return '🍂';
            case 'dark': return '🌙';
            default: return '☀️';
        }
    };

    // Cycle: Light -> Sepia -> Dark -> Light
    // If current is Light, button shows 🍂 (next is Sepia)
    // If current is Sepia, button shows 🌙 (next is Dark)
    // If current is Dark, button shows ☀️ (next is Light)

    const getNextThemeIcon = () => {
        switch (theme) {
            case 'light': return '🍂';
            case 'sepia': return '🌙';
            case 'dark': return '☀️';
            default: return '🍂';
        }
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerTextContainer}>
                {/* Title can be enabled if needed */}
                {/* <Text style={[styles.title, { color: colors.text }]}>📚 Ứng Dụng Đọc Truyện</Text> */}
            </View>
            <View style={styles.headerButtons}>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.cardBackground }]}
                    onPress={onOpenHistory}
                >
                    <Text style={styles.headerIcon}>🕒</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.cardBackground }]}
                    onPress={onOpenSettings}
                >
                    <Text style={styles.headerIcon}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.cardBackground }]}
                    onPress={onToggleTheme}
                >
                    <Text style={styles.headerIcon}>{getNextThemeIcon()}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerIcon: {
        fontSize: 20,
    },
});
