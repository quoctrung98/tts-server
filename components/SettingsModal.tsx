// Settings Modal Component
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';

import { ThemeColors } from '../hooks/useDarkMode';

export interface TTSSettings {
  voice: 'male' | 'female';
  voiceName: string;
  speed: number;
  pitch: number;
  volume: number;
  autoNextChapter: boolean;
  enablePitchBlack?: boolean;
  wallpaperInterval?: number; // 0 for off, or minutes
  username?: string;
}



interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: TTSSettings;
  onSave: (settings: TTSSettings) => void;
  colors: ThemeColors;
  onCloudLoad?: () => Promise<void>;
}


const VOICE_OPTIONS = {
  female: {
    name: 'vi-VN-HoaiMyNeural',
    label: 'Hoai My (Nữ)',
  },
  male: {
    name: 'vi-VN-NamMinhNeural',
    label: 'Nam Minh (Nam)',
  },
};

export default function SettingsModal({ visible, onClose, settings, onSave, colors, onCloudLoad }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<TTSSettings>(settings);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleCloudLoad = async () => {
    if (!onCloudLoad) return;
    setIsLoadingCloud(true);
    try {
      await onCloudLoad();
    } finally {
      setIsLoadingCloud(false);
    }
  };


  const updateSetting = (key: keyof TTSSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const formatSpeed = (speed: number) => `${speed.toFixed(1)}x`;
  const formatPitch = (pitch: number) => `${pitch > 0 ? '+' : ''}${pitch} Hz`;
  const formatVolume = (volume: number) => `${Math.round(volume * 100)}%`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.sectionTitle }]}>⚙️ Cài đặt</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Tùy chỉnh trải nghiệm nghe của bạn bằng cách điều chỉnh giọng nói, tốc độ, cao độ và âm lượng.
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Voice Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🎤 Giọng nói</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Chọn giọng nói tiếng Việt</Text>

              <View style={styles.voiceOptions}>
                <TouchableOpacity
                  style={[
                    styles.voiceOption,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    localSettings.voice === 'female' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    updateSetting('voice', 'female');
                    updateSetting('voiceName', VOICE_OPTIONS.female.name);
                  }}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    { color: colors.text },
                    localSettings.voice === 'female' && { color: colors.primary, fontWeight: 'bold' },
                  ]}>
                    👩 {VOICE_OPTIONS.female.label}
                  </Text>
                  {localSettings.voice === 'female' && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voiceOption,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    localSettings.voice === 'male' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    updateSetting('voice', 'male');
                    updateSetting('voiceName', VOICE_OPTIONS.male.name);
                  }}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    { color: colors.text },
                    localSettings.voice === 'male' && { color: colors.primary, fontWeight: 'bold' },
                  ]}>
                    👨 {VOICE_OPTIONS.male.label}
                  </Text>
                  {localSettings.voice === 'male' && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Speed Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>⚡ Tốc độ phát</Text>
                <Text style={[styles.sliderValue, { color: colors.primary }]}>{formatSpeed(localSettings.speed)}</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Điều chỉnh tốc độ phát từ 0.5x (chậm) đến 2.0x (nhanh)
              </Text>

              <View style={styles.sliderContainer}>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={localSettings.speed}
                  onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
                  style={{ ...sliderStyle, background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}80)` }}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0.5x</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>1.0x</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>2.0x</Text>
              </View>
            </View>

            {/* Pitch Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🎵 Cao độ</Text>
                <Text style={[styles.sliderValue, { color: colors.primary }]}>{formatPitch(localSettings.pitch)}</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Điều chỉnh cao độ giọng nói từ -10 Hz (thấp hơn) đến +10 Hz (cao hơn)
              </Text>

              <View style={styles.sliderContainer}>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={localSettings.pitch}
                  onChange={(e) => updateSetting('pitch', parseInt(e.target.value))}
                  style={{ ...sliderStyle, background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}80)` }}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>-10 Hz</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0 Hz</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>+10 Hz</Text>
              </View>
            </View>

            {/* Volume Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🔊 Âm lượng</Text>
                <Text style={[styles.sliderValue, { color: colors.primary }]}>{formatVolume(localSettings.volume)}</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Điều chỉnh âm lượng từ 0% (tắt tiếng) đến 100% (tối đa)
              </Text>

              <View style={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localSettings.volume}
                  onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
                  style={{ ...sliderStyle, background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}80)` }}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0%</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>50%</Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>100%</Text>
              </View>
            </View>

            {/* Cloud Sync Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>☁️ Đồng bộ đám mây (Cloud Sync)</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Nhập username để lưu và đồng bộ tiến độ đọc truyện của bạn qua Supabase.
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <input
                  type="text"
                  placeholder="Nhập username của bạn..."
                  value={localSettings.username || ''}
                  onChange={(e) => updateSetting('username', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    background: 'transparent',
                    color: colors.text,
                    fontSize: '16px',
                    outline: 'none',
                  }}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.loadCloudButton,
                  { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  isLoadingCloud && { opacity: 0.7 }
                ]}
                onPress={handleCloudLoad}
                disabled={isLoadingCloud || !localSettings.username}
              >
                <Text style={[styles.loadCloudButtonText, { color: colors.primary }]}>
                  {isLoadingCloud ? '⏳ Đang tải...' : '📥 Tải tiến độ từ Cloud'}
                </Text>
              </TouchableOpacity>
              {!(typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) && (
                <Text style={[styles.noteText, { color: colors.warning || '#f39c12' }]}>
                  ⚠️ Lưu ý: Bạn cần cấu hình SUPABASE_URL trong config.ts để tính năng này hoạt động.
                </Text>
              )}
            </View>

            {/* Auto Continue Toggle */}


            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>🔄 Tự động phát chương tiếp theo</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Tự động chuyển và phát chương tiếp theo khi chương hiện tại kết thúc
                  </Text>
                </View>
                <View style={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={localSettings.autoNextChapter}
                    onChange={(e) => updateSetting('autoNextChapter', e.target.checked)}
                    style={{
                      width: 44,
                      height: 24,
                      cursor: 'pointer',
                      accentColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Wallpaper Interval */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🖼️ Tự động đổi hình nền</Text>
                <Text style={[styles.sliderValue, { color: colors.primary }]}>
                  {localSettings.wallpaperInterval ? `${localSettings.wallpaperInterval} phút` : 'Tắt'}
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Tự động thay đổi hình nền sau một khoảng thời gian
              </Text>

              <View style={styles.intervalOptions}>
                {[0, 1, 5, 15, 30, 60].map((interval) => (
                  <TouchableOpacity
                    key={interval}
                    style={[
                      styles.intervalButton,
                      { borderColor: colors.border, backgroundColor: colors.inputBackground },
                      (localSettings.wallpaperInterval || 0) === interval && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => updateSetting('wallpaperInterval', interval)}
                  >
                    <Text style={[
                      styles.intervalText,
                      { color: colors.text },
                      (localSettings.wallpaperInterval || 0) === interval && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      {interval === 0 ? 'Tắt' : `${interval}p`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pitch Black Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>🖤 Nền đen hoàn toàn (Pitch Black)</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Sử dụng nền đen tuyệt đối, tiết kiệm pin cho màn hình OLED (chỉ hiển thị tốt khi bật chế độ tối)
                  </Text>
                </View>
                <View style={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={localSettings.enablePitchBlack || false}
                    onChange={(e) => updateSetting('enablePitchBlack', e.target.checked)}
                    style={{
                      width: 44,
                      height: 24,
                      cursor: 'pointer',
                      accentColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.inputBackground }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>💾 Lưu cài đặt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sliderStyle = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  outline: 'none',
  background: 'linear-gradient(to right, #3498db, #2980b9)',
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    padding: 24,
    maxHeight: '60%',
    flexGrow: 0,
    flexShrink: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  voiceOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  voiceOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    paddingVertical: 12,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleSwitch: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  noteText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadCloudButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadCloudButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});



