// App.tsx - Ứng dụng đọc truyện với TTS
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ImageBackground,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import VideoBackground from './components/VideoBackground';
import { Audio } from 'expo-av';
import { TTS_SERVER_URL, DEFAULT_TTS_SETTINGS, UI_CONFIG, getActiveProviders } from './config';
import { splitIntoSentences, groupSentencesIntoChunks } from './utils/textUtils';
import { TTSQueueManager } from './services/TTSQueueManager';
import SettingsModal, { TTSSettings } from './components/SettingsModal';
import { storage, ReadingProgress } from './utils/storage';
import { ChapterContent } from './providers/IChapterProvider';

export default function App() {
  // URL and Chapter State
  const [chapterUrl, setChapterUrl] = useState('');
  const [chapterContent, setChapterContent] = useState<ChapterContent | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);

  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    voice: 'female',
    voiceName: 'vi-VN-HoaiMyNeural',
    speed: 1.0,
    pitch: 0,
    volume: 0.8,
    autoNextChapter: false,
  });

  // Streaming TTS
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  const [readingProgress, setReadingProgress] = useState(0);
  const ttsManagerRef = useRef<TTSQueueManager | null>(null);
  const contentScrollRef = useRef<ScrollView>(null);
  const chunkRefsMap = useRef<Map<number, any>>(new Map());
  
  // Seek slider
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      loadVoices();
      await loadSettings();
      await loadDarkMode();
      
      // Try to load chapter from URL query first, then localStorage
      const urlChapter = parseUrlQuery();
      if (urlChapter) {
        setChapterUrl(urlChapter);
        // Auto-fetch the chapter
        setTimeout(() => fetchChapter(), 500);
      } else {
        // Load from localStorage
        const progress = await loadReadingProgress();
        if (progress) {
          setChapterUrl(progress.chapterUrl);
          
          // Ask user if they want to continue
          if (Platform.OS === 'web' && window.confirm) {
            const shouldContinue = window.confirm(
              `Tiếp tục đọc chương: ${progress.chapterTitle || 'chương trước'}?`
            );
            if (shouldContinue) {
              setTimeout(() => fetchChapter(), 500);
            }
          } else {
            Alert.alert(
              'Tiếp tục đọc?',
              `Bạn có muốn tiếp tục đọc chương: ${progress.chapterTitle || 'chương trước'}?`,
              [
                { text: 'Không', style: 'cancel' },
                { text: 'Có', onPress: () => fetchChapter() },
              ]
            );
          }
        }
      }
    };
    
    initApp();
    
    return () => {
      // Cleanup TTS manager on unmount
      if (ttsManagerRef.current) {
        ttsManagerRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to highlighted chunk
  useEffect(() => {
    if (currentChunkIndex >= 0 && currentChunkIndex < textChunks.length) {
      const chunkRef = chunkRefsMap.current.get(currentChunkIndex);
      if (chunkRef && contentScrollRef.current) {
        // Small delay to ensure layout is complete
        setTimeout(() => {
          if (Platform.OS === 'web') {
            // For web, use scrollIntoView if available
            if (chunkRef.scrollIntoView) {
              chunkRef.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
              });
            }
          } else {
            // For native, use measureLayout
            chunkRef.measureLayout(
              contentScrollRef.current,
              (x: number, y: number) => {
                contentScrollRef.current?.scrollTo({ 
                  y: Math.max(0, y - 100), 
                  animated: true 
                });
              },
              () => {
              }
            );
          }
        }, 100);
      }
    }
  }, [currentChunkIndex, textChunks.length]);

  const loadSettings = async () => {
    const defaultSettings: TTSSettings = {
      voice: 'female',
      voiceName: 'vi-VN-HoaiMyNeural',
      speed: 1.0,
      pitch: 0,
      volume: 0.8,
      autoNextChapter: false,
    };
    
    const saved = await storage.load<TTSSettings>(
      storage.keys.TTS_SETTINGS,
      defaultSettings
    );
    
    // Merge with default to ensure all fields exist (backward compatibility)
    const merged: TTSSettings = {
      ...defaultSettings,
      ...saved,
    };
    
    setTTSSettings(merged);
  };

  const saveSettings = async (newSettings: TTSSettings) => {
    setTTSSettings(newSettings);
    await storage.save(storage.keys.TTS_SETTINGS, newSettings);
  };

  const loadDarkMode = async () => {
    const saved = await storage.load<boolean>(storage.keys.DARK_MODE, false);
    setIsDarkMode(saved);
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await storage.save(storage.keys.DARK_MODE, newMode);
  };

  // Save reading progress to localStorage and URL
  const saveReadingProgress = async (url: string, chunkIndex: number, title?: string) => {
    const progress: ReadingProgress = {
      chapterUrl: url,
      chapterTitle: title,
      chunkIndex: chunkIndex,
      timestamp: Date.now(),
    };
    
    await storage.save(storage.keys.READING_PROGRESS, progress);
    
    // Update URL query
    updateUrlQuery(url);
  };

  // Load reading progress from localStorage
  const loadReadingProgress = async (): Promise<ReadingProgress | null> => {
    const progress = await storage.load<ReadingProgress | null>(
      storage.keys.READING_PROGRESS,
      null
    );
    
    if (progress) {
    }
    
    return progress;
  };

  // Update URL query params (for bookmarking)
  const updateUrlQuery = (chapterUrl: string) => {
    if (Platform.OS === 'web' && window.history && window.history.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('chapter', chapterUrl);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Parse URL query params on load
  const parseUrlQuery = (): string | null => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const chapterUrl = urlParams.get('chapter');
      if (chapterUrl) {
        return chapterUrl;
      }
    }
    return null;
  };

  const loadVoices = async () => {
    try {
      const response = await fetch(`${TTS_SERVER_URL}/voices`);
      if (!response.ok) throw new Error('Server not available');
      const voices = await response.json();
      setAvailableVoices(voices);
    } catch (error) {
    }
  };

  // Fetch chapter content from URL using Provider Factory
  const fetchChapter = async () => {
    if (!chapterUrl.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập URL chương truyện');
      return;
    }

    setIsLoadingChapter(true);
    setChapterContent(null);

    try {
      // Import ProviderFactory dynamically
      const { ProviderFactory } = await import('./providers/ProviderFactory');
      
      // Get appropriate provider for this URL
      const provider = ProviderFactory.getProvider(chapterUrl);
      
      if (!provider) {
        throw new Error(
          'Website này chưa được hỗ trợ. Hiện tại chỉ hỗ trợ: ' +
          getActiveProviders().map(p => p.name).join(', ')
        );
      }

      // Fetch chapter content using the provider
      const chapter = await provider.fetchChapter(chapterUrl);
      setChapterContent(chapter);
      
      // Save to localStorage and update URL
      updateUrlQuery(chapterUrl);
      await saveReadingProgress(chapterUrl, 0, chapter.title);
      
      Alert.alert('Thành công', `Đã tải chương: ${chapter.title}`);
    } catch (error: any) {
      console.error('Error fetching chapter:', error);
      Alert.alert(
        'Lỗi', 
        error.message || 'Không thể tải chương. Vui lòng kiểm tra URL và thử lại.'
      );
    } finally {
      setIsLoadingChapter(false);
    }
  };

  // Generate speech from chapter content using streaming
  const speakChapter = async () => {
    if (!chapterContent) {
      Alert.alert('Lỗi', 'Chưa có nội dung chương để đọc');
      return;
    }

    setIsLoadingAudio(true);

    try {
      // Stop current playback if any
      if (ttsManagerRef.current) {
        await ttsManagerRef.current.stop();
      }

      // Split content into chunks
      const sentences = splitIntoSentences(chapterContent.content);
      const chunks = groupSentencesIntoChunks(sentences, 50, 300);
      
      setTextChunks(chunks);
      setCurrentChunkIndex(0);
      setReadingProgress(0);

      // Create TTS manager with current settings
      const manager = new TTSQueueManager(
        chunks,
        TTS_SERVER_URL,
        ttsSettings.voiceName,
        ttsSettings.speed,
        ttsSettings.pitch,
        ttsSettings.volume
      );

      manager.setCallbacks({
        onChunkStart: (index, text) => {
          setCurrentChunkIndex(index);
          setReadingProgress(Math.round(((index + 1) / chunks.length) * 100));
          // Update seek slider (only if not currently seeking)
          if (!isSeeking) {
            setSeekValue(index);
          }
          // Save reading progress
          saveReadingProgress(chapterUrl, index, chapterContent?.title);
        },
        onChunkEnd: (index) => {
        },
        onAllComplete: async () => {
          setIsPlaying(false);
          setCurrentChunkIndex(-1);
          
          // Auto play next chapter if enabled
          if (ttsSettings.autoNextChapter && chapterContent?.nextChapterUrl) {
            // Stop current TTS manager first
            if (ttsManagerRef.current) {
              await ttsManagerRef.current.stop();
              ttsManagerRef.current = null;
            }
            
            // Wait a bit then load next chapter
            setTimeout(async () => {
              try {
                setChapterUrl(chapterContent.nextChapterUrl!);
                await fetchAndPlayNextChapter(chapterContent.nextChapterUrl!);
              } catch (error: any) {
                Alert.alert('Lỗi', 'Không thể tự động chuyển chương. Vui lòng thử lại thủ công.');
              }
            }, 1500);
          } else {
            if (!ttsSettings.autoNextChapter) {
            }
            if (!chapterContent?.nextChapterUrl) {
            }
            Alert.alert('Hoàn thành', 'Đã đọc xong chương!');
          }
        },
        onError: (error) => {
          Alert.alert('Lỗi', `Lỗi khi đọc: ${error}`);
        },
      });

      ttsManagerRef.current = manager;

      // Start playing
      await manager.start();
      setIsPlaying(true);
    } catch (error: any) {
      console.error('Speech error:', error);
      Alert.alert('Lỗi', 'Không thể tạo giọng đọc: ' + error.message);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const togglePlayPause = async () => {
    if (!ttsManagerRef.current) return;

    if (isPlaying) {
      await ttsManagerRef.current.pause();
      setIsPlaying(false);
    } else {
      await ttsManagerRef.current.resume();
      setIsPlaying(true);
    }
  };

  const stopPlayback = async () => {
    if (ttsManagerRef.current) {
      await ttsManagerRef.current.stop();
      setIsPlaying(false);
      setCurrentChunkIndex(-1);
      setReadingProgress(0);
      setSeekValue(0);
    }
  };

  // Handle seek slider
  const handleSeekStart = () => {
    setIsSeeking(true);
  };
  
  const handleSeekChange = (value: number) => {
    setSeekValue(value);
  };
  
  const handleSeekEnd = async (value: number) => {
    setIsSeeking(false);
    
    if (ttsManagerRef.current && textChunks.length > 0) {
      const targetIndex = Math.floor(value);
      await ttsManagerRef.current.jumpToChunk(targetIndex);
      setCurrentChunkIndex(targetIndex);
      setReadingProgress(Math.round(((targetIndex + 1) / textChunks.length) * 100));
    }
  };

  const downloadAudio = () => {
    Alert.alert(
      'Tính năng đang phát triển',
      'Tính năng tải xuống MP3 cho chế độ streaming đang được phát triển. Bạn có thể tải từng đoạn riêng lẻ.'
    );
  };

  // Auto fetch and play next chapter
  const fetchAndPlayNextChapter = async (url: string) => {
    try {
      // Import ProviderFactory dynamically
      const { ProviderFactory } = await import('./providers/ProviderFactory');
      
      // Get appropriate provider for this URL
      const provider = ProviderFactory.getProvider(url);
      
      if (!provider) {
        throw new Error('Provider not found for next chapter');
      }
      const chapter = await provider.fetchChapter(url);
      setChapterContent(chapter);
      
      // Update URL and save progress
      updateUrlQuery(url);
      
      // Split into chunks
      const sentences = splitIntoSentences(chapter.content);
      const chunks = groupSentencesIntoChunks(sentences, 50, 300);
      setTextChunks(chunks);
      setCurrentChunkIndex(0);
      setReadingProgress(0);
      setSeekValue(0);

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create TTS manager
      const manager = new TTSQueueManager(
        chunks,
        TTS_SERVER_URL,
        ttsSettings.voiceName,
        ttsSettings.speed,
        ttsSettings.pitch,
        ttsSettings.volume
      );

      manager.setCallbacks({
        onChunkStart: (index, text) => {
          setCurrentChunkIndex(index);
          setReadingProgress(Math.round(((index + 1) / chunks.length) * 100));
          if (!isSeeking) {
            setSeekValue(index);
          }
          // Save reading progress
          saveReadingProgress(url, index, chapter.title);
        },
        onChunkEnd: (index) => {
        },
        onAllComplete: async () => {
          setIsPlaying(false);
          setCurrentChunkIndex(-1);
          
          // Continue to next chapter if enabled
          if (ttsSettings.autoNextChapter && chapter.nextChapterUrl) {
            // Stop current manager
            if (ttsManagerRef.current) {
              await ttsManagerRef.current.stop();
              ttsManagerRef.current = null;
            }
            
            setTimeout(async () => {
              try {
                setChapterUrl(chapter.nextChapterUrl!);
                await fetchAndPlayNextChapter(chapter.nextChapterUrl!);
              } catch (error: any) {
                console.error('Error continuing to next:', error);
                Alert.alert('Lỗi', 'Không thể tiếp tục chương tiếp theo');
              }
            }, 1500);
          } else {
            Alert.alert('Hoàn thành', 'Đã đọc xong chương!');
          }
        },
        onError: (error) => {
          console.error('❌ TTS Error:', error);
          Alert.alert('Lỗi', `Lỗi khi đọc: ${error}`);
          setIsPlaying(false);
        },
      });

      ttsManagerRef.current = manager;
      
      await manager.start();
      setIsPlaying(true);
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể tự động phát chương tiếp theo: ${error.message}`);
      setIsPlaying(false);
    }
  };

  // Color palette based on dark mode
  const colors = {
    background: isDarkMode ? '#1a1a1a' : '#f5f7fa',
    cardBackground: isDarkMode ? '#2d2d2d' : 'white',
    text: isDarkMode ? '#e0e0e0' : '#2c3e50',
    textSecondary: isDarkMode ? '#b0b0b0' : '#7f8c8d',
    inputBackground: isDarkMode ? '#3d3d3d' : '#f8f9fa',
    inputBorder: isDarkMode ? '#4d4d4d' : '#dee2e6',
    sectionTitle: isDarkMode ? '#ffffff' : '#34495e',
    contentBackground: isDarkMode ? '#2d2d2d' : '#f8f9fa',
    highlightBackground: isDarkMode ? '#fff3cd' : '#fff3cd',
    highlightBorder: isDarkMode ? '#9a9a00' : '#ffc107',
    shadowColor: isDarkMode ? '#000' : '#000',
  };

  const image = { uri: 'https://spcdn.shortpixel.ai/spio/ret_img,q_orig,to_auto,s_webp:avif/https://goldpenguin.org/wp-content/uploads/2024/02/Midjourney-Image-29.png' };
  const localVideo = require('./assets/motion.mp4');
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <VideoBackground videoSource={localVideo} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: colors.text }]}>📚 Ứng Dụng Đọc Truyện</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              TTS Tiếng Việt • {availableVoices.length} giọng đọc
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.darkModeButton, { backgroundColor: colors.cardBackground }]}
            onPress={toggleDarkMode}
          >
            <Text style={styles.darkModeIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* URL Input Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>🔗 Nhập URL Chương Truyện</Text>
          <TextInput
            style={[styles.urlInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="https://truyenfull.vision/..."
            value={chapterUrl}
            onChangeText={setChapterUrl}
            editable={!isLoadingChapter}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.supportedSites}>
            <Text style={[styles.supportedSitesText, { color: colors.textSecondary }]}>
              Trang hỗ trợ: {getActiveProviders().map((p, i) => (
                <Text key={i} style={styles.badge}>{p.name}{i < getActiveProviders().length - 1 ? ', ' : ''}</Text>
              ))}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.fetchButton, isLoadingChapter && styles.buttonDisabled]}
            onPress={fetchChapter}
            disabled={isLoadingChapter}
          >
            {isLoadingChapter ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>🔎 Tải Chương</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Chapter Content Display with Highlighting */}
        {chapterContent && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>📖 Nội dung chương</Text>
            <View style={styles.chapterInfo}>
              <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapterContent.title}</Text>
              {chapterContent.novelTitle && (
                <Text style={[styles.chapterMeta, { color: colors.textSecondary }]}>Truyện: {chapterContent.novelTitle}</Text>
              )}
              <Text style={[styles.chapterMeta, { color: colors.textSecondary }]}>
                Độ dài: {chapterContent.content.length.toLocaleString()} ký tự
                {textChunks.length > 0 && ` • ${textChunks.length} đoạn`}
              </Text>
              {chapterContent.nextChapterUrl && (
                <Text style={[styles.chapterMeta, { color: colors.textSecondary }]}>
                  ▶️ Có chương tiếp theo
                  {ttsSettings.autoNextChapter && (
                    <Text style={styles.autoNextBadge}> • Tự động phát</Text>
                  )}
                </Text>
              )}
            </View>
            
            <ScrollView 
              ref={contentScrollRef}
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
                        { backgroundColor: colors.highlightBackground, borderLeftColor: colors.highlightBorder }
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
                  {chapterContent.content.substring(0, 500)}...
                  {'\n\n'}
                  <Text style={[styles.contentHint, { color: colors.textSecondary }]}>
                    💡 Nhấn "▶️ Đọc" để xem toàn bộ nội dung với highlight theo thời gian thực
                  </Text>
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* TTS Controls Section */}
        {(
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>🎧 Điều khiển phát âm</Text>
            
            {/* Settings Button */}
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              onPress={() => setShowSettings(true)}
            >
              <Text style={[styles.settingsButtonText, { color: colors.text }]}>
                ⚙️ Cài đặt giọng nói & tốc độ
              </Text>
              <View style={styles.settingsPreview}>
                <Text style={styles.settingsPreviewText}>
                  {ttsSettings.voice === 'female' ? '👩' : '👨'} {ttsSettings.speed.toFixed(1)}x
                </Text>
              </View>
            </TouchableOpacity>

            {/* Playback Controls */}
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={[styles.button, styles.playButton, (isLoadingAudio || isPlaying) && styles.buttonDisabled]}
                onPress={speakChapter}
                disabled={isLoadingAudio || isPlaying}
              >
                {isLoadingAudio ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>▶️ Đọc</Text>
                )}
              </TouchableOpacity>

              {textChunks.length > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.pauseButton]}
                  onPress={togglePlayPause}
                >
                  <Text style={styles.buttonText}>
                    {isPlaying ? '⏸️ Tạm dừng' : '▶️ Tiếp tục'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.stopButton, textChunks.length === 0 && styles.buttonDisabled]}
                onPress={stopPlayback}
                disabled={textChunks.length === 0}
              >
                <Text style={styles.buttonText}>⏹️ Dừng</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar & Seek Slider */}
            {textChunks.length > 0 && (
              <View style={styles.progressSection}>
                {/* Visual Progress Bar (Read-only) */}
                <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
                  <View style={[styles.progressFill, { width: `${readingProgress}%` }]} />
                </View>
                
                {/* Seek Slider (Interactive) */}
                <View style={[styles.seekSliderContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <Text style={[styles.seekLabel, { color: colors.text }]}>⏩ Tua nhanh đến đoạn:</Text>
                  <input
                    type="range"
                    min="0"
                    max={textChunks.length - 1}
                    step="1"
                    value={seekValue}
                    onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                    onMouseDown={handleSeekStart}
                    onMouseUp={(e) => handleSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={(e) => {
                      const target = e.target as HTMLInputElement;
                      handleSeekEnd(parseFloat(target.value));
                    }}
                    disabled={!isPlaying && currentChunkIndex === -1}
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 4,
                      outline: 'none',
                      background: 'linear-gradient(to right, #f39c12, #e67e22)',
                      cursor: (!isPlaying && currentChunkIndex === -1) ? 'not-allowed' : 'pointer',
                      opacity: (!isPlaying && currentChunkIndex === -1) ? 0.5 : 1,
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
                  <Text style={styles.progressPercent}>
                    {readingProgress}% hoàn thành
                  </Text>
                </View>
              </View>
            )}

            {/* Download Button */}
            {/* <TouchableOpacity
              style={[styles.button, styles.downloadButton, textChunks.length === 0 && styles.buttonDisabled]}
              onPress={downloadAudio}
              disabled={textChunks.length === 0}
            >
              <Text style={styles.buttonText}>💾 Tải xuống MP3 (Coming soon)</Text>
            </TouchableOpacity> */}
          </View>
        )}

        {/* Voice Info */}
        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          Giọng đọc: {ttsSettings.voiceName} • Server: {TTS_SERVER_URL}
        </Text>
      </ScrollView>

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={ttsSettings}
        onSave={saveSettings}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  darkModeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkModeIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 0,
  },
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
    color: '#34495e',
    marginBottom: 12,
  },
  urlInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 8,
  },
  supportedSites: {
    marginBottom: 12,
  },
  supportedSitesText: {
    fontSize: 12,
    color: '#6c757d',
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
  playButton: {
    backgroundColor: '#27ae60',
    flex: 1,
  },
  pauseButton: {
    backgroundColor: '#f39c12',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    flex: 1,
  },
  downloadButton: {
    backgroundColor: '#9b59b6',
    marginTop: 12,
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
  chapterInfo: {
    marginBottom: 12,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  chapterMeta: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  autoNextBadge: {
    color: '#27ae60',
    fontWeight: '600',
  },
  contentScroll: {
    maxHeight: 400,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    borderRadius: 4,
    padding: 4,
  },
  contentChunk: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2c3e50',
    padding: 8,
  },
  contentChunkHighlighted: {
    fontWeight: '600',
    color: '#000',
  },
  contentHint: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 16,
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
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
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    color: '#6c757d',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
  },
  seekSliderContainer: {
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  seekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  seekValue: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 16,
  },
});
