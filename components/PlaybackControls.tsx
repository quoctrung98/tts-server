// PlaybackControls - Play, Pause, Stop buttons
import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { ThemeColors } from '../hooks';

interface PlaybackControlsProps {
    isPlaying: boolean;
    isLoading: boolean;
    hasChunks: boolean;
    onPlay: () => void;
    onTogglePlayPause: () => void;
    onStop: () => void;
    colors: ThemeColors;
}

export function PlaybackControls({
    isPlaying,
    isLoading,
    hasChunks,
    onPlay,
    onTogglePlayPause,
    onStop,
    colors,
}: PlaybackControlsProps) {
    return (
        <View style={styles.controlButtons}>
            <TouchableOpacity
                style={[
                    styles.button,
                    styles.playButton,
                    (isLoading || isPlaying) && styles.buttonDisabled,
                ]}
                onPress={onPlay}
                disabled={isLoading || isPlaying}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>▶️ Đọc</Text>
                )}
            </TouchableOpacity>

            {hasChunks && (
                <TouchableOpacity
                    style={[styles.button, styles.pauseButton]}
                    onPress={onTogglePlayPause}
                >
                    <Text style={styles.buttonText}>
                        {isPlaying ? '⏸️ Tạm dừng' : '▶️ Tiếp tục'}
                    </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[
                    styles.button,
                    styles.stopButton,
                    !hasChunks && styles.buttonDisabled,
                ]}
                onPress={onStop}
                disabled={!hasChunks}
            >
                <Text style={styles.buttonText}>⏹️ Dừng</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    controlButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        flex: 1,
    },
    playButton: {
        backgroundColor: '#27ae60',
    },
    pauseButton: {
        backgroundColor: '#f39c12',
    },
    stopButton: {
        backgroundColor: '#e74c3c',
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
