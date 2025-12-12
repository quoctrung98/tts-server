// CompactPlaybackControls - Modern styled play, pause, stop buttons
import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { ThemeColors } from '../hooks';

interface CompactPlaybackControlsProps {
    isPlaying: boolean;
    isLoading: boolean;
    hasChunks: boolean;
    onPlay: () => void;
    onTogglePlayPause: () => void;
    onStop: () => void;
    colors: ThemeColors;
}

export function CompactPlaybackControls({
    isPlaying,
    isLoading,
    hasChunks,
    onPlay,
    onTogglePlayPause,
    onStop,
    colors,
}: CompactPlaybackControlsProps) {
    return (
        <View style={styles.controlButtons}>
            {/* Play/Pause toggle - show when chunks are loaded */}
            {hasChunks && (
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.primaryButton,
                    ]}
                    onPress={isPlaying ? onTogglePlayPause : (hasChunks ? onTogglePlayPause : onPlay)}
                >
                    <Text style={styles.buttonIcon}>
                        {isPlaying ? '⏸' : '▶'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Stop button */}
            {hasChunks && (
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.stopButton,
                    ]}
                    onPress={onStop}
                >
                    <Text style={styles.buttonIcon}>⏹</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    controlButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButton: {
        backgroundColor: '#2196F3',
    },
    stopButton: {
        backgroundColor: '#78909C',
    },
    buttonDisabled: {
        backgroundColor: '#B0BEC5',
        opacity: 0.7,
    },
    buttonIcon: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
        lineHeight: 18,
        includeFontPadding: false,
    },
});
