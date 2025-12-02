// VideoBackground.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VideoBackgroundProps {
  videoSource: any;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoSource }) => {
  return (
    <View style={styles.videoContainer}>
      <video
        style={styles.video}
        autoPlay
        loop
        muted
        src={typeof videoSource === 'string' ? videoSource : videoSource.uri}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
});

export default VideoBackground;