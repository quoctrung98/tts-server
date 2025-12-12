// useWakeLock - Screen wake lock for web and native platforms
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

/**
 * Hook to keep the screen awake while active
 * Uses expo-keep-awake for native and Screen Wake Lock API for web
 */
export function useWakeLock(isActive: boolean): void {
    // Native: useKeepAwake handles this automatically when the component is mounted
    useKeepAwake();

    // Web: Use Screen Wake Lock API
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('🔆 Wake Lock acquired - screen will stay on');

                    wakeLock.addEventListener('release', () => {
                        console.log('🔅 Wake Lock released');
                    });
                } catch (err: any) {
                    console.log('Wake Lock error:', err.message);
                }
            }
        };

        // Request wake lock when active
        if (isActive) {
            requestWakeLock();
        }

        // Re-acquire wake lock when page becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isActive) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLock) {
                wakeLock.release();
                wakeLock = null;
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isActive]);
}
