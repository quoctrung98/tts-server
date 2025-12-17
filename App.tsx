// App.tsx - Ứng dụng đọc truyện với TTS (Refactored)
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  Alert,
} from 'react-native';

// Hooks
import {
  useWakeLock,
  useDarkMode,
  useTTSSettings,
  useReadingProgress,
  useChapterLoader,
  useTTSPlayer,
  useLibrary,
} from './hooks';

// Components
import { Header } from './components/Header';
import { ChapterUrlInput } from './components/ChapterUrlInput';
import { ChapterContentDisplay } from './components/ChapterContentDisplay';
import { TTSControlsSection } from './components/TTSControlsSection';
import SettingsModal from './components/SettingsModal';
import { LibraryModal } from './components/LibraryModal';

// Config - no longer needed here as ttsPlayer handles TTS setup

export default function App() {
  // URL State
  const [chapterUrl, setChapterUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

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
  const { saveProgress, loadProgress, updateUrlQuery, parseUrlQuery } = useReadingProgress();
  const library = useLibrary();
  const ttsPlayer = useTTSPlayer(settings);

  // Keep screen awake while playing
  useWakeLock(ttsPlayer.isPlaying);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      // Wait for settings to load first
      if (isLoadingSettings) return;

      // Try to load chapter from URL query first
      const { chapterUrl: url, chunkIndex: chunk } = parseUrlQuery();

      if (url) {
        setChapterUrl(url);
        // Load chapter and seek to chunk from URL
        handleFetchChapter(url, true, chunk);
      }
      // LocalStorage fallback removed as requested
      // The app will now only resume if URL parameters are present
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
      await library.updateProgress(targetUrl, chapter.title, startChunk, ttsPlayer.textChunks.length, chapter.novelTitle);

      // Auto-play after loading
      if (autoPlay) {
        await ttsPlayer.startPlaying(
          chapter,
          (index, text) => {
            saveProgress(targetUrl, index, chapter.title);
            // Update history progress
            library.updateProgress(targetUrl, chapter.title, index, ttsPlayer.textChunks.length, chapter.novelTitle);
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
  }, [chapterUrl, fetchChapter, updateUrlQuery, saveProgress, ttsPlayer, settings]);

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
        library.updateProgress(chapterUrl, chapterContent.title, index, ttsPlayer.textChunks.length, chapterContent.novelTitle);
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
      updateUrlQuery(url, 0);

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
          library.updateProgress(url, chapter.title, index, ttsPlayer.textChunks.length, chapter.novelTitle);
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
  }, [settings, saveProgress, updateUrlQuery, setChapterContent, ttsPlayer]);

  // Background image
  const backgroundImage = {
    uri: 'https://spcdn.shortpixel.ai/spio/ret_img,q_orig,to_auto,s_webp:avif/https://goldpenguin.org/wp-content/uploads/2024/02/Midjourney-Image-29.png',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {(!settings.enablePitchBlack || !isDarkMode) && (
        <Image
          source={backgroundImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Header
          theme={theme}
          onToggleTheme={cycleTheme}
          onOpenSettings={() => setShowSettings(true)}
          onOpenLibrary={() => setShowLibrary(true)}
          colors={colors}
        />

        {/* URL Input Section */}
        <ChapterUrlInput
          chapterUrl={chapterUrl}
          onChangeUrl={setChapterUrl}
          onFetch={() => handleFetchChapter()}
          isLoading={isLoadingChapter}
          colors={colors}
        />

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

        {/* TTS Controls Section */}
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
      </ScrollView>

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={updateSettings}
      />

      {/* Library Modal */}
      <LibraryModal
        visible={showLibrary}
        onClose={() => setShowLibrary(false)}
        recentBooks={library.recentBooks}
        favoriteBooks={library.favoriteBooks}
        onSelectBook={(book) => {
          setChapterUrl(book.lastChapterUrl);
          setShowLibrary(false);
          // Resume reading
          handleFetchChapter(book.lastChapterUrl, true, book.lastChunkIndex);
        }}
        onToggleFavorite={(book) => library.toggleFavorite(book.id)}
        onRemoveBook={(book) => library.removeBook(book.id)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: Platform.OS === 'web' ? 900 : undefined,
    marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    width: '100%',
  },
});
