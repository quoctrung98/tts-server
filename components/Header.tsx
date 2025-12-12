// Header - App header with dark mode toggle
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../hooks';

interface HeaderProps {
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    colors: ThemeColors;
}

export function Header({ isDarkMode, onToggleDarkMode, colors }: HeaderProps) {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerTextContainer}>
                {/* Title can be enabled if needed */}
                {/* <Text style={[styles.title, { color: colors.text }]}>📚 Ứng Dụng Đọc Truyện</Text> */}
            </View>
            <TouchableOpacity
                style={[styles.darkModeButton, { backgroundColor: colors.cardBackground }]}
                onPress={onToggleDarkMode}
            >
                <Text style={styles.darkModeIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    darkModeButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    darkModeIcon: {
        fontSize: 24,
    },
});
