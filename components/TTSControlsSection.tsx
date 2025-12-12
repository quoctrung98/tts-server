// TTSControlsSection - TTS controls container with settings button
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlaybackControls } from './PlaybackControls';
import { ProgressSeeker } from './ProgressSeeker';
import { ThemeColors } from '../hooks';
import { TTSSettings } from './SettingsModal';

interface TTSControlsSectionProps {
    // Settings
    settings: TTSSettings;
    onOpenSettings: () => void;

    // Playback
    isPlaying: boolean;
    isLoading: boolean;
    textChunks: string[];
    currentChunkIndex: number;
    readingProgress: number;
    seekValue: number;

    // Actions
    onPlay: () => void;
    onTogglePlayPause: () => void;
    onStop: () => void;
    onSeekStart: () => void;
    onSeekChange: (value: number) => void;
    onSeekEnd: (value: number) => void;

    // Theme
    colors: ThemeColors;
}

export function TTSControlsSection({
    settings,
    onOpenSettings,
    isPlaying,
    isLoading,
    textChunks,
    currentChunkIndex,
    readingProgress,
    seekValue,
    onPlay,
    onTogglePlayPause,
    onStop,
    onSeekStart,
    onSeekChange,
    onSeekEnd,
    colors,
}: TTSControlsSectionProps) {
    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
                🎧 Điều khiển phát âm
            </Text>

            {/* Settings Button */}
            <TouchableOpacity
                style={[
                    styles.settingsButton,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                    },
                ]}
                onPress={onOpenSettings}
            >
                <Text style={[styles.settingsButtonText, { color: colors.text }]}>
                    ⚙️ Cài đặt giọng nói & tốc độ
                </Text>
                <View style={styles.settingsPreview}>
                    <Text style={styles.settingsPreviewText}>
                        {settings.voice === 'female' ? '👩' : '👨'} {settings.speed.toFixed(1)}x
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Playback Controls */}
            <PlaybackControls
                isPlaying={isPlaying}
                isLoading={isLoading}
                hasChunks={textChunks.length > 0}
                onPlay={onPlay}
                onTogglePlayPause={onTogglePlayPause}
                onStop={onStop}
                colors={colors}
            />

            {/* Progress Seeker */}
            <ProgressSeeker
                textChunks={textChunks}
                currentChunkIndex={currentChunkIndex}
                readingProgress={readingProgress}
                seekValue={seekValue}
                isPlaying={isPlaying}
                onSeekStart={onSeekStart}
                onSeekChange={onSeekChange}
                onSeekEnd={onSeekEnd}
                colors={colors}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    settingsButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    settingsPreview: {
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    settingsPreviewText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
