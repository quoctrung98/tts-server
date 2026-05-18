// App.tsx - Ứng dụng đọc truyện với TTS (Refactored)
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  Alert,
  View,
} from 'react-native';

// Hooks
import {
  useWakeLock,
  useDarkMode,
  useTTSSettings,
  useReadingProgress,
  useChapterLoader,
  useTTSPlayer,
  useHistory,
} from './hooks';

// Components
import { Header } from './components/Header';
import { ChapterUrlInput } from './components/ChapterUrlInput';
import { ChapterContentDisplay } from './components/ChapterContentDisplay';
import { TTSControlsSection } from './components/TTSControlsSection';
import SettingsModal from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { NavigationBar } from './components/NavigationBar';

// Config - no longer needed here as ttsPlayer handles TTS setup

export default function App() {
  // URL State
  const [chapterUrl, setChapterUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);

  // Custom Hooks
  const { isDarkMode, theme, cycleTheme, colors: baseColors } = useDarkMode();
  const { settings, updateSettings, isLoading: isLoadingSettings } = useTTSSettings();

  // Apply Pitch Black mode override
  const colors = React.useMemo(() => {
    if (isDarkMode && settings.enablePitchBlack) {
      return {
        ...baseColors,
        background: '#111111',
        cardBackground: '#313131',
        contentBackground: '#313131',
        // Ensure text contrast on pitch black
        sectionTitle: '#ffffff',
      };
    }
    return baseColors;
  }, [baseColors, isDarkMode, settings.enablePitchBlack]);

  const {
    chapterContent,
    isLoading: isLoadingChapter,
    fetchChapter,
    setChapterContent
  } = useChapterLoader();
  const { saveProgress, loadProgress } = useReadingProgress();
  const history = useHistory();
  const ttsPlayer = useTTSPlayer(settings);

  // Keep screen awake while playing
  useWakeLock(ttsPlayer.isPlaying);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      // Wait for settings to load first
      if (isLoadingSettings) return;

      if (settings.username) {
        // Try to load from cloud if username is set
        const cloudProgress = await loadProgress();
        if (cloudProgress && cloudProgress.chapterUrl) {
          setChapterUrl(cloudProgress.chapterUrl);
          handleFetchChapter(cloudProgress.chapterUrl, true, cloudProgress.chunkIndex);
        }
      }

    };

    initApp();

    return () => {
      // Cleanup on unmount
      ttsPlayer.stop();
    };
  }, [isLoadingSettings]);

  // Handle fetch chapter - auto-play after loading
  const handleFetchChapter = useCallback(async (url?: string, autoPlay: boolean = true, startChunk: number = 0) => {
    const targetUrl = url || chapterUrl;
    const chapter = await fetchChapter(targetUrl);
    if (chapter) {
      await saveProgress(targetUrl, startChunk, chapter.title);
      // Add to history
      await history.updateProgress(targetUrl, chapter.title, startChunk, ttsPlayer.textChunks.length, chapter.novelTitle);

      // Auto-play after loading
      if (autoPlay) {
        await ttsPlayer.startPlaying(
          chapter,
          (index, text) => {
            saveProgress(targetUrl, index, chapter.title);
            // Update history progress
            history.updateProgress(targetUrl, chapter.title, index, ttsPlayer.textChunks.length, chapter.novelTitle);
          },
          async () => {
            if (settings.autoNextChapter && chapter.nextChapterUrl) {
              setTimeout(async () => {
                try {
                  setChapterUrl(chapter.nextChapterUrl!);
                  await handleFetchAndPlayNextChapter(chapter.nextChapterUrl!);
                } catch (error: any) {
                  Alert.alert('Lỗi', 'Không thể tự động chuyển chương.');
                }
              }, 1500);
            } else {
              Alert.alert('Hoàn thành', 'Đã đọc xong chương!');
            }
          },
          startChunk
        );
      }
    }
  }, [chapterUrl, fetchChapter, saveProgress, ttsPlayer, settings]);

  // Handle play
  const handlePlay = useCallback(async () => {
    if (!chapterContent) {
      Alert.alert('Lỗi', 'Chưa có nội dung chương để đọc');
      return;
    }

    await ttsPlayer.startPlaying(
      chapterContent,
      // onChunkStart callback
      (index, text) => {
        saveProgress(chapterUrl, index, chapterContent.title);
        // Update history progress
        history.updateProgress(chapterUrl, chapterContent.title, index, ttsPlayer.textChunks.length, chapterContent.novelTitle);
      },
      // onComplete callback
      async () => {
        // Auto play next chapter if enabled
        if (settings.autoNextChapter && chapterContent.nextChapterUrl) {
          setTimeout(async () => {
            try {
              setChapterUrl(chapterContent.nextChapterUrl!);
              await handleFetchAndPlayNextChapter(chapterContent.nextChapterUrl!);
            } catch (error: any) {
              Alert.alert('Lỗi', 'Không thể tự động chuyển chương. Vui lòng thử lại thủ công.');
            }
          }, 1500);
        } else {
          Alert.alert('Hoàn thành', 'Đã đọc xong chương!');
        }
      }
    );
  }, [chapterContent, chapterUrl, settings, ttsPlayer, saveProgress]);

  // Handle fetch and play next chapter
  const handleFetchAndPlayNextChapter = useCallback(async (url: string) => {
    try {
      const { ProviderFactory } = await import('./providers/ProviderFactory');
      const provider = ProviderFactory.getProvider(url);

      if (!provider) {
        throw new Error('Provider not found for next chapter');
      }

      const chapter = await provider.fetchChapter(url);
      setChapterContent(chapter);
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use ttsPlayer.startPlaying to properly update all reactive state
      // This ensures currentChunkIndex and textChunks are updated for highlighting
      await ttsPlayer.startPlaying(
        chapter,
        // onChunkStart callback
        (index, text) => {
          saveProgress(url, index, chapter.title);
          // Update history progress
          history.updateProgress(url, chapter.title, index, ttsPlayer.textChunks.length, chapter.novelTitle);
        },
        // onComplete callback
        async () => {
          if (settings.autoNextChapter && chapter.nextChapterUrl) {
            setTimeout(async () => {
              try {
                setChapterUrl(chapter.nextChapterUrl!);
                await handleFetchAndPlayNextChapter(chapter.nextChapterUrl!);
              } catch (error: any) {
                Alert.alert('Lỗi', 'Không thể tiếp tục chương tiếp theo');
              }
            }, 1500);
          } else {
            Alert.alert('Hoàn thành', 'Đã đọc xong chương!');
          }
        }
      );
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể tự động phát chương tiếp theo: ${error.message}`);
    }
  }, [settings, saveProgress, setChapterContent, ttsPlayer]);

  // Reading-mode chapter navigation (no TTS auto-play)
  const handleNavigateChapter = useCallback(async (url: string) => {
    if (!url) return;
    ttsPlayer.stop();
    setChapterUrl(url);
    const chapter = await fetchChapter(url);
    if (chapter) {
      await saveProgress(url, 0, chapter.title);
      await history.updateProgress(url, chapter.title, 0, 0, chapter.novelTitle);
    }
  }, [fetchChapter, saveProgress, history, ttsPlayer]);

  // Handle manual cloud load
  const handleLoadCloudProgress = useCallback(async (username?: string) => {
    try {
      const cloudProgress = await loadProgress(username);
      if (cloudProgress && cloudProgress.chapterUrl) {
        setChapterUrl(cloudProgress.chapterUrl);
        await handleFetchChapter(cloudProgress.chapterUrl, true, cloudProgress.chunkIndex);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy tiến độ lưu trữ trên đám mây cho username này.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể tải tiến độ từ cloud: ${error.message}`);
    }
  }, [loadProgress, handleFetchChapter]);


  // Wallpapers
  const WALLPAPERS = React.useMemo(() => [
    require('./assets/wallpapers/0.jpg'),
    require('./assets/wallpapers/1.jpg'),
    require('./assets/wallpapers/2.jpg'),
    require('./assets/wallpapers/3.jpg'),
  ], []);

  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState(0);

  // Wallpaper rotation effect
  useEffect(() => {
    if (!settings.wallpaperInterval || settings.wallpaperInterval <= 0) return;

    const intervalMs = settings.wallpaperInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      setCurrentWallpaperIndex(prev => (prev + 1) % WALLPAPERS.length);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [settings.wallpaperInterval, WALLPAPERS.length]);

  return (

    <View style={[styles.container, { backgroundColor: (settings.enablePitchBlack ? '#313131' : colors.background) }]}>
      {(!settings.enablePitchBlack) && (
        <Image
          source={WALLPAPERS[currentWallpaperIndex]}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
      )}

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <Header
            theme={theme}
            onToggleTheme={cycleTheme}
            onOpenSettings={() => setShowSettings(true)}
            onOpenHistory={() => setShowHistory(true)}
            onToggleReadingMode={() => setIsReadingMode(m => !m)}
            isReadingMode={isReadingMode}
            colors={colors}
          />

          {/* URL Input Section - hidden in reading mode */}
          {!isReadingMode && (
            <ChapterUrlInput
              chapterUrl={chapterUrl}
              onChangeUrl={setChapterUrl}
              onFetch={() => handleFetchChapter()}
              isLoading={isLoadingChapter}
              colors={colors}
            />
          )}

          {/* Navigation Bar */}
          {chapterContent && (
            <NavigationBar
              prevChapterUrl={chapterContent.prevChapterUrl}
              nextChapterUrl={chapterContent.nextChapterUrl}
              onPrev={() => chapterContent.prevChapterUrl && handleNavigateChapter(chapterContent.prevChapterUrl)}
              onNext={() => chapterContent.nextChapterUrl && handleNavigateChapter(chapterContent.nextChapterUrl)}
              isLoading={isLoadingChapter}
              colors={colors}
            />
          )}

          {/* Chapter Content Display */}
          {chapterContent && (
            <ChapterContentDisplay
              content={chapterContent}
              textChunks={ttsPlayer.textChunks}
              currentChunkIndex={ttsPlayer.currentChunkIndex}
              colors={colors}
              autoNextChapter={settings.autoNextChapter}
            />
          )}

          {/* TTS Controls Section - hidden in reading mode */}
          {!isReadingMode && (
            <TTSControlsSection
              settings={settings}
              isPlaying={ttsPlayer.isPlaying}
              isLoading={ttsPlayer.isLoading}
              textChunks={ttsPlayer.textChunks}
              currentChunkIndex={ttsPlayer.currentChunkIndex}
              readingProgress={ttsPlayer.readingProgress}
              seekValue={ttsPlayer.seekValue}
              onPlay={handlePlay}
              onTogglePlayPause={ttsPlayer.togglePlayPause}
              onStop={ttsPlayer.stop}
              onSeekStart={ttsPlayer.handleSeekStart}
              onSeekChange={ttsPlayer.handleSeekChange}
              onSeekEnd={ttsPlayer.handleSeekEnd}
              isWaitingForInteraction={ttsPlayer.isWaitingForInteraction}
              sleepTimerMinutes={ttsPlayer.sleepTimerMinutes}
              timeRemaining={ttsPlayer.timeRemaining}
              onSetSleepTimer={ttsPlayer.setSleepTimer}
              colors={colors}
            />
          )}
        </ScrollView>

        {/* Settings Modal */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={updateSettings}
          colors={colors}
          onCloudLoad={handleLoadCloudProgress}
        />


        {/* History Modal */}
        <HistoryModal
          visible={showHistory}
          onClose={() => setShowHistory(false)}
          recentItems={history.recentItems}
          favoriteItems={history.favoriteItems}
          onSelectItem={(item) => {
            setChapterUrl(item.lastChapterUrl);
            setShowHistory(false);
            // Resume reading from last chapter
            handleFetchChapter(item.lastChapterUrl, true, item.lastChunkIndex);
          }}
          onSelectChapter={(item, chapter) => {
            setChapterUrl(chapter.url);
            setShowHistory(false);
            // Resume reading from selected chapter
            handleFetchChapter(chapter.url, true, chapter.chunkIndex);
          }}
          onToggleFavorite={(item) => history.toggleFavorite(item.id)}
          onRemoveItem={(item) => history.removeHistoryItem(item.id)}
          colors={colors}
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    ...(Platform.OS === 'web' ? {
      minHeight: '100vh' as any,
      width: '100vw' as any,
      overflow: 'hidden',
    } : {}),
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: Platform.OS === 'web' ? 900 : undefined,
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
});
