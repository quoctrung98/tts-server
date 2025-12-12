// ChapterContentDisplay - Chapter content with highlighted chunks
import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { ChapterContent } from '../providers/IChapterProvider';
import { ThemeColors } from '../hooks';

interface ChapterContentDisplayProps {
    content: ChapterContent;
    textChunks: string[];
    currentChunkIndex: number;
    colors: ThemeColors;
    autoNextChapter?: boolean;
}

export function ChapterContentDisplay({
    content,
    textChunks,
    currentChunkIndex,
    colors,
    autoNextChapter = false,
}: ChapterContentDisplayProps) {
    const scrollRef = useRef<ScrollView>(null);
    const chunkRefsMap = useRef<Map<number, any>>(new Map());

    // Auto-scroll to highlighted chunk
    useEffect(() => {
        if (currentChunkIndex >= 0 && currentChunkIndex < textChunks.length) {
            const chunkRef = chunkRefsMap.current.get(currentChunkIndex);
            if (chunkRef && scrollRef.current) {
                setTimeout(() => {
                    if (Platform.OS === 'web') {
                        if (chunkRef.scrollIntoView) {
                            chunkRef.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                        }
                    } else {
                        chunkRef.measureLayout(
                            scrollRef.current,
                            (x: number, y: number) => {
                                scrollRef.current?.scrollTo({
                                    y: Math.max(0, y - 100),
                                    animated: true,
                                });
                            },
                            () => { }
                        );
                    }
                }, 100);
            }
        }
    }, [currentChunkIndex, textChunks.length]);

    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
                📖 Nội dung chương
            </Text>

            <View style={styles.chapterInfo}>
                <Text style={[styles.chapterTitle, { color: colors.text }]}>
                    {content.title}
                </Text>
                {content.novelTitle && (
                    <Text style={[styles.chapterMeta, { color: colors.textSecondary }]}>
                        Truyện: {content.novelTitle}
                    </Text>
                )}
                {content.nextChapterUrl !== undefined && (
                    <Text style={[styles.chapterMeta, { color: colors.textSecondary }]}>
                        ▶️ Có chương tiếp theo
                        {autoNextChapter && (
                            <Text style={styles.autoNextBadge}> • Tự động phát</Text>
                        )}
                    </Text>
                )}
            </View>

            <ScrollView
                ref={scrollRef}
                style={[styles.contentScroll, { backgroundColor: colors.contentBackground }]}
                nestedScrollEnabled
            >
                {textChunks.length > 0 ? (
                    textChunks.map((chunk, index) => (
                        <View
                            key={index}
                            ref={(ref) => {
                                if (ref) {
                                    chunkRefsMap.current.set(index, ref);
                                }
                            }}
                            style={[
                                styles.contentChunkContainer,
                                index === currentChunkIndex && [
                                    styles.contentChunkContainerHighlighted,
                                    {
                                        backgroundColor: colors.highlightBackground,
                                        borderLeftColor: colors.highlightBorder,
                                    },
                                ],
                            ]}
                        >
                            <Text
                                style={[
                                    styles.contentChunk,
                                    { color: colors.text },
                                    index === currentChunkIndex && styles.contentChunkHighlighted,
                                ]}
                            >
                                {chunk}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.contentText}>
                        {content.content.substring(0, 500)}...
                        {'\n\n'}
                        <Text style={[styles.contentHint, { color: colors.textSecondary }]}>
                            💡 Nhấn "▶️ Đọc" để xem toàn bộ nội dung với highlight theo thời gian thực
                        </Text>
                    </Text>
                )}
            </ScrollView>
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
    chapterInfo: {
        marginBottom: 12,
    },
    chapterTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    chapterMeta: {
        fontSize: 13,
        marginBottom: 2,
    },
    autoNextBadge: {
        color: '#27ae60',
        fontWeight: '600',
    },
    contentScroll: {
        maxHeight: 400,
        borderRadius: 8,
        padding: 12,
    },
    contentText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#495057',
    },
    contentChunkContainer: {
        marginBottom: 8,
    },
    contentChunkContainerHighlighted: {
        borderLeftWidth: 4,
        borderRadius: 4,
        padding: 4,
    },
    contentChunk: {
        fontSize: 15,
        lineHeight: 24,
        padding: 8,
    },
    contentChunkHighlighted: {
        fontWeight: '600',
        color: '#000',
    },
    contentHint: {
        fontSize: 13,
        fontStyle: 'italic',
    },
});
