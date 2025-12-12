// ProgressSeeker - Progress bar and seek slider
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../hooks';

interface ProgressSeekerProps {
    textChunks: string[];
    currentChunkIndex: number;
    readingProgress: number;
    seekValue: number;
    isPlaying: boolean;
    onSeekStart: () => void;
    onSeekChange: (value: number) => void;
    onSeekEnd: (value: number) => void;
    colors: ThemeColors;
}

export function ProgressSeeker({
    textChunks,
    currentChunkIndex,
    readingProgress,
    seekValue,
    isPlaying,
    onSeekStart,
    onSeekChange,
    onSeekEnd,
    colors,
}: ProgressSeekerProps) {
    if (textChunks.length === 0) {
        return null;
    }

    const isDisabled = !isPlaying && currentChunkIndex === -1;

    return (
        <View style={styles.progressSection}>
            {/* Visual Progress Bar (Read-only) */}
            <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
                <View style={[styles.progressFill, { width: `${readingProgress}%` }]} />
            </View>

            {/* Seek Slider (Interactive) */}
            <View
                style={[
                    styles.seekSliderContainer,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                    },
                ]}
            >
                <Text style={[styles.seekLabel, { color: colors.text }]}>
                    ⏩ Tua nhanh đến đoạn:
                </Text>
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
                        width: '100%',
                        height: 8,
                        borderRadius: 4,
                        outline: 'none',
                        background: 'linear-gradient(to right, #f39c12, #e67e22)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                    }}
                />
                <Text style={styles.seekValue}>
                    Đoạn {Math.floor(seekValue) + 1} / {textChunks.length}
                </Text>
            </View>

            {/* Progress Info */}
            <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    Đang phát: Đoạn {currentChunkIndex + 1} / {textChunks.length}
                </Text>
                <Text style={styles.progressPercent}>{readingProgress}% hoàn thành</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    progressSection: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3498db',
    },
    seekSliderContainer: {
        marginTop: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    seekLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    seekValue: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 4,
        textAlign: 'center',
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressText: {
        fontSize: 13,
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3498db',
    },
});
