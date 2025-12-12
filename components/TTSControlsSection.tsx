// TTSControlsSection - Compact TTS controls with slider and buttons in same row
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompactPlaybackControls } from './CompactPlaybackControls';
import { ThemeColors } from '../hooks';
import { TTSSettings } from './SettingsModal';

interface TTSControlsSectionProps {
    // Settings
    settings: TTSSettings;

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
    const hasChunks = textChunks.length > 0;
    const isDisabled = !isPlaying && currentChunkIndex === -1;

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            {/* Progress Bar */}
            {hasChunks && (
                <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
                    <View style={[styles.progressFill, { width: `${readingProgress}%` }]} />
                </View>
            )}

            {/* Controls Row: Buttons + Slider */}
            <View style={styles.controlsRow}>
                {/* Seek Slider */}
                {hasChunks && (
                    <View style={styles.sliderContainer}>
                        <input
                            type="range"
                            min="0"
                            max={textChunks.length - 1}
                            step="1"
                            value={seekValue}
                            onChange={(e) => onSeekChange(parseFloat(e.target.value))}
                            onMouseDown={onSeekStart}
                            onMouseUp={(e) => onSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
                            onTouchStart={onSeekStart}
                            onTouchEnd={(e) => {
                                const target = e.target as HTMLInputElement;
                                onSeekEnd(parseFloat(target.value));
                            }}
                            disabled={isDisabled}
                            style={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                outline: 'none',
                                background: 'linear-gradient(to right, #3498db, #2980b9)',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.5 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        />
                    </View>
                )}

                {/* Compact Playback Controls */}
                <CompactPlaybackControls
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    hasChunks={hasChunks}
                    onPlay={onPlay}
                    onTogglePlayPause={onTogglePlayPause}
                    onStop={onStop}
                    colors={colors}
                />
            </View>

            {/* Progress Info */}
            {hasChunks && (
                <View style={styles.progressInfo}>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        Đoạn {currentChunkIndex + 1} / {textChunks.length}
                    </Text>
                    <Text style={styles.progressPercent}>{readingProgress}%</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3498db',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sliderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    progressText: {
        fontSize: 12,
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3498db',
    },
    hint: {
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
});
