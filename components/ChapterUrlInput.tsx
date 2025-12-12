// ChapterUrlInput - URL input section with supported sites
import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { getActiveProviders } from '../config';
import { ThemeColors } from '../hooks';

interface ChapterUrlInputProps {
    chapterUrl: string;
    onChangeUrl: (url: string) => void;
    onFetch: () => void;
    isLoading: boolean;
    colors: ThemeColors;
}

export function ChapterUrlInput({
    chapterUrl,
    onChangeUrl,
    onFetch,
    isLoading,
    colors,
}: ChapterUrlInputProps) {
    return (
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>
                🔗 Nhập URL Chương Truyện
            </Text>

            <TextInput
                style={[
                    styles.urlInput,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                    },
                ]}
                placeholder="https://truyenfull.vision/..."
                placeholderTextColor={colors.textSecondary}
                value={chapterUrl}
                onChangeText={onChangeUrl}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <View style={styles.supportedSites}>
                <Text style={[styles.supportedSitesText, { color: colors.textSecondary }]}>
                    Trang hỗ trợ:{' '}
                    {getActiveProviders().map((p, i) => (
                        <Text key={i} style={styles.badge}>
                            {p.name}
                            {i < getActiveProviders().length - 1 ? ', ' : ''}
                        </Text>
                    ))}
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    styles.fetchButton,
                    isLoading && styles.buttonDisabled,
                ]}
                onPress={onFetch}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>🔎 Tải Chương</Text>
                )}
            </TouchableOpacity>
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
    urlInput: {
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    supportedSites: {
        marginBottom: 12,
    },
    supportedSitesText: {
        fontSize: 12,
    },
    badge: {
        backgroundColor: '#3498db',
        color: 'white',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: '600',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    fetchButton: {
        backgroundColor: '#3498db',
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
