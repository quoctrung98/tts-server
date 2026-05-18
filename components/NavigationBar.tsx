// NavigationBar - Prev/Next chapter navigation
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemeColors } from '../hooks';

interface NavigationBarProps {
    prevChapterUrl?: string;
    nextChapterUrl?: string;
    onPrev: () => void;
    onNext: () => void;
    isLoading?: boolean;
    colors: ThemeColors;
}

export function NavigationBar({
    prevChapterUrl,
    nextChapterUrl,
    onPrev,
    onNext,
    isLoading,
    colors,
}: NavigationBarProps) {
    const hasPrev = !!prevChapterUrl;
    const hasNext = !!nextChapterUrl;

    return (
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: colors.contentBackground },
                    !hasPrev && styles.buttonDisabled,
                ]}
                onPress={onPrev}
                disabled={!hasPrev || isLoading}
            >
                <Text style={[styles.buttonText, { color: hasPrev ? colors.text : colors.textSecondary }]}>
                    ◀ Chương trước
                </Text>
            </TouchableOpacity>

            {isLoading && <ActivityIndicator size="small" color={colors.text} style={styles.loader} />}

            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: colors.contentBackground },
                    !hasNext && styles.buttonDisabled,
                ]}
                onPress={onNext}
                disabled={!hasNext || isLoading}
            >
                <Text style={[styles.buttonText, { color: hasNext ? colors.text : colors.textSecondary }]}>
                    Chương sau ▶
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    loader: {
        marginHorizontal: 8,
    },
});
