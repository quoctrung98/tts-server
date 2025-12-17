import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    SafeAreaView,
    Platform
} from 'react-native';
import { Book } from '../hooks/useLibrary';
import { ThemeColors } from '../hooks/useDarkMode';

interface LibraryModalProps {
    visible: boolean;
    onClose: () => void;
    recentBooks: Book[];
    favoriteBooks: Book[];
    onSelectBook: (book: Book) => void;
    onToggleFavorite: (book: Book) => void;
    onRemoveBook: (book: Book) => void;
    colors: ThemeColors;
}

type Tab = 'recent' | 'favorites';

export function LibraryModal({
    visible,
    onClose,
    recentBooks,
    favoriteBooks,
    onSelectBook,
    onToggleFavorite,
    onRemoveBook,
    colors
}: LibraryModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('recent');

    const data = activeTab === 'recent' ? recentBooks : favoriteBooks;

    const renderItem = ({ item }: { item: Book }) => (
        <View style={[styles.bookItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
                style={styles.bookContent}
                onPress={() => onSelectBook(item)}
            >
                <View style={styles.bookIcon}>
                    <Text style={{ fontSize: 24 }}>📖</Text>
                </View>
                <View style={styles.bookInfo}>
                    <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title || item.id}
                    </Text>
                    <Text style={[styles.bookMeta, { color: colors.textSecondary }]}>
                        {new Date(item.lastReadTimestamp).toLocaleDateString()} • {item.progressPercent}%
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.bookActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onToggleFavorite(item)}
                >
                    <Text style={{ fontSize: 20 }}>{item.isFavorite ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onRemoveBook(item)}
                >
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Tủ Sách</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={[styles.closeText, { color: colors.primary }]}>Đóng</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'recent' && styles.activeTab,
                            activeTab === 'recent' && { borderBottomColor: colors.primary }
                        ]}
                        onPress={() => setActiveTab('recent')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'recent' ? colors.primary : colors.textSecondary }
                        ]}>Gần đây</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'favorites' && styles.activeTab,
                            activeTab === 'favorites' && { borderBottomColor: colors.primary }
                        ]}
                        onPress={() => setActiveTab('favorites')}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === 'favorites' ? colors.primary : colors.textSecondary }
                        ]}>Yêu thích</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {activeTab === 'recent' ? 'Chưa có lịch sử đọc truyện' : 'Chưa có truyện yêu thích'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        // borderBottomColor handled in style prop
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    bookContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookIcon: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    bookMeta: {
        fontSize: 12,
    },
    bookActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
