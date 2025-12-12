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
} from './hooks';

// Components
import { Header } from './components/Header';
import { ChapterUrlInput } from './components/ChapterUrlInput';
import { ChapterContentDisplay } from './components/ChapterContentDisplay';
import { TTSControlsSection } from './components/TTSControlsSection';
import SettingsModal from './components/SettingsModal';

// Config
import { TTS_SERVER_URL } from './config';
import { TTSQueueManager } from './services/TTSQueueManager';
import { splitIntoSentences, groupSentencesIntoChunks } from './utils/textUtils';

export default function App() {
  // URL State
  const [chapterUrl, setChapterUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Custom Hooks
  const { isDarkMode, toggleDarkMode, colors } = useDarkMode();
  const { settings, updateSettings } = useTTSSettings();
  const {
    chapterContent,
    isLoading: isLoadingChapter,
    fetchChapter,
    setChapterContent
  } = useChapterLoader();
  const { saveProgress, loadProgress, updateUrlQuery, parseUrlQuery } = useReadingProgress();
  const ttsPlayer = useTTSPlayer(settings);

  // Keep screen awake while playing
  useWakeLock(ttsPlayer.isPlaying);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      // Try to load chapter from URL query first, then localStorage
      const urlChapter = parseUrlQuery();
      if (urlChapter) {
        setChapterUrl(urlChapter);
        // Auto-fetch handled after state update
      } else {
        // Load from localStorage
        const progress = await loadProgress();
        if (progress) {
          setChapterUrl(progress.chapterUrl);

          // Ask user if they want to continue
          if (Platform.OS === 'web' && window.confirm) {
            const shouldContinue = window.confirm(
              `Tiếp tục đọc chương: ${progress.chapterTitle || 'chương trước'}?`
            );
            if (shouldContinue) {
              handleFetchChapter(progress.chapterUrl);
            }
          } else {
            Alert.alert(
              'Tiếp tục đọc?',
              `Bạn có muốn tiếp tục đọc chương: ${progress.chapterTitle || 'chương trước'}?`,
              [
                { text: 'Không', style: 'cancel' },
                { text: 'Có', onPress: () => handleFetchChapter(progress.chapterUrl) },
              ]
            );
          }
        }
      }
    };

    initApp();

    return () => {
      // Cleanup on unmount
      ttsPlayer.stop();
    };
  }, []);

  // Handle fetch chapter
  const handleFetchChapter = useCallback(async (url?: string) => {
    const targetUrl = url || chapterUrl;
    const chapter = await fetchChapter(targetUrl);
    if (chapter) {
      updateUrlQuery(targetUrl);
      await saveProgress(targetUrl, 0, chapter.title);
    }
  }, [chapterUrl, fetchChapter, updateUrlQuery, saveProgress]);

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
      updateUrlQuery(url);

      // Split into chunks
      const sentences = splitIntoSentences(chapter.content);
      const chunks = groupSentencesIntoChunks(sentences, 50, 300);

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create and start TTS manager directly for auto-continue
      const manager = new TTSQueueManager(
        chunks,
        TTS_SERVER_URL,
        settings.voiceName,
        settings.speed,
        settings.pitch,
        settings.volume
      );

      manager.setCallbacks({
        onChunkStart: (index, text) => {
          saveProgress(url, index, chapter.title);
        },
        onChunkEnd: () => { },
        onAllComplete: async () => {
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
        },
        onError: (error) => {
          Alert.alert('Lỗi', `Lỗi khi đọc: ${error}`);
        },
      });

      await manager.start();
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể tự động phát chương tiếp theo: ${error.message}`);
    }
  }, [settings, saveProgress, updateUrlQuery, setChapterContent]);

  // Background image
  const backgroundImage = {
    uri: 'https://spcdn.shortpixel.ai/spio/ret_img,q_orig,to_auto,s_webp:avif/https://goldpenguin.org/wp-content/uploads/2024/02/Midjourney-Image-29.png',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Header
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
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
          onOpenSettings={() => setShowSettings(true)}
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
