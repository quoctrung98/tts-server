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

export interface TTSSettings {
  voice: 'male' | 'female';
  voiceName: string;
  speed: number;
  pitch: number;
  volume: number;
  autoNextChapter: boolean;
  enablePitchBlack?: boolean;
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: TTSSettings;
  onSave: (settings: TTSSettings) => void;
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

export default function SettingsModal({ visible, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<TTSSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
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
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>⚙️ Cài đặt</Text>
            <Text style={styles.subtitle}>
              Tùy chỉnh trải nghiệm nghe của bạn bằng cách điều chỉnh giọng nói, tốc độ, cao độ và âm lượng.
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Voice Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎤 Giọng nói</Text>
              <Text style={styles.sectionSubtitle}>Chọn giọng nói tiếng Việt</Text>

              <View style={styles.voiceOptions}>
                <TouchableOpacity
                  style={[
                    styles.voiceOption,
                    localSettings.voice === 'female' && styles.voiceOptionSelected,
                  ]}
                  onPress={() => {
                    updateSetting('voice', 'female');
                    updateSetting('voiceName', VOICE_OPTIONS.female.name);
                  }}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    localSettings.voice === 'female' && styles.voiceOptionTextSelected,
                  ]}>
                    👩 {VOICE_OPTIONS.female.label}
                  </Text>
                  {localSettings.voice === 'female' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voiceOption,
                    localSettings.voice === 'male' && styles.voiceOptionSelected,
                  ]}
                  onPress={() => {
                    updateSetting('voice', 'male');
                    updateSetting('voiceName', VOICE_OPTIONS.male.name);
                  }}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    localSettings.voice === 'male' && styles.voiceOptionTextSelected,
                  ]}>
                    👨 {VOICE_OPTIONS.male.label}
                  </Text>
                  {localSettings.voice === 'male' && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Speed Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>⚡ Tốc độ phát</Text>
                <Text style={styles.sliderValue}>{formatSpeed(localSettings.speed)}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
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
                  style={sliderStyle}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0.5x</Text>
                <Text style={styles.sliderLabel}>1.0x</Text>
                <Text style={styles.sliderLabel}>2.0x</Text>
              </View>
            </View>

            {/* Pitch Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>🎵 Cao độ</Text>
                <Text style={styles.sliderValue}>{formatPitch(localSettings.pitch)}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
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
                  style={sliderStyle}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>-10 Hz</Text>
                <Text style={styles.sliderLabel}>0 Hz</Text>
                <Text style={styles.sliderLabel}>+10 Hz</Text>
              </View>
            </View>

            {/* Volume Control */}
            <View style={styles.section}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sectionTitle}>🔊 Âm lượng</Text>
                <Text style={styles.sliderValue}>{formatVolume(localSettings.volume)}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
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
                  style={sliderStyle}
                />
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0%</Text>
                <Text style={styles.sliderLabel}>50%</Text>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
            </View>

            {/* Auto Continue Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.sectionTitle}>🔄 Tự động phát chương tiếp theo</Text>
                  <Text style={styles.sectionSubtitle}>
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
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Pitch Black Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.sectionTitle}>🖤 Nền đen hoàn toàn (Pitch Black)</Text>
                  <Text style={styles.sectionSubtitle}>
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
                    }}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
    backgroundColor: 'white',
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
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
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
    color: '#2c3e50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6c757d',
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
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceOptionSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  voiceOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#495057',
  },
  voiceOptionTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#3498db',
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
    color: '#3498db',
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
    color: '#6c757d',
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
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

