// Header - App header with dark mode toggle and settings button
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../hooks';

interface HeaderProps {
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    onOpenSettings: () => void;
    colors: ThemeColors;
}

export function Header({ isDarkMode, onToggleDarkMode, onOpenSettings, colors }: HeaderProps) {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerTextContainer}>
                {/* Title can be enabled if needed */}
                {/* <Text style={[styles.title, { color: colors.text }]}>📚 Ứng Dụng Đọc Truyện</Text> */}
            </View>
            <View style={styles.headerButtons}>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.cardBackground }]}
                    onPress={onOpenSettings}
                >
                    <Text style={styles.headerIcon}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.cardBackground }]}
                    onPress={onToggleDarkMode}
                >
                    <Text style={styles.headerIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
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
