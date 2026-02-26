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
import { HistoryItem } from '../hooks/useHistory';
import { ThemeColors } from '../hooks/useDarkMode';

interface HistoryModalProps {
    visible: boolean;
    onClose: () => void;
    recentItems: HistoryItem[];
    favoriteItems: HistoryItem[];
    onSelectItem: (item: HistoryItem) => void;
    onToggleFavorite: (item: HistoryItem) => void;
    onRemoveItem: (item: HistoryItem) => void;
    colors: ThemeColors;
}

type Tab = 'recent' | 'favorites';

export function HistoryModal({
    visible,
    onClose,
    recentItems,
    favoriteItems,
    onSelectItem,
    onToggleFavorite,
    onRemoveItem,
    colors
}: HistoryModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('recent');

    const data = activeTab === 'recent' ? recentItems : favoriteItems;

    const renderItem = ({ item }: { item: HistoryItem }) => (
        <View style={[styles.itemContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
                style={styles.itemContent}
                onPress={() => onSelectItem(item)}
            >
                <View style={styles.itemIcon}>
                    <Text style={{ fontSize: 24 }}>🕒</Text>
                </View>
                <View style={styles.itemInfo}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.storyTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.storyTitle || item.title || item.id}
                        </Text>
                        {item.provider && (
                            <View style={[styles.providerBadge, { backgroundColor: colors.inputBackground }]}>
                                <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                                    {item.provider}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.chapterTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                        {new Date(item.lastReadTimestamp).toLocaleDateString()} • {item.progressPercent}%
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.itemActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onToggleFavorite(item)}
                >
                    <Text style={{ fontSize: 20 }}>{item.isFavorite ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onRemoveItem(item)}
                >
                    <Text style={{ fontSize: 20 }}>🗑️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch Sử</Text>
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
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 600,
        height: '80%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden', // Ensures round corners
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
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
        padding: 4,
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
        fontSize: 15,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIcon: {
        width: 48,
        height: 64, // Taller for book proportion
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    storyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    chapterTitle: {
        fontSize: 14,
        marginBottom: 4,
    },
    providerBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: '#f0f0f0',
    },
    providerText: {
        fontSize: 10,
        fontWeight: '600',
    },
    itemMeta: {
        fontSize: 12,
    },
    itemActions: {
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

