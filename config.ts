// Configuration file for the app

/**
 * TTS Server Configuration
 * 
 * Priority:
 * 1. EXPO_PUBLIC_TTS_URL (set in .env or Vercel dashboard)
 * 2. Default to localhost for development
 * 
 * For production deployment:
 * - Set EXPO_PUBLIC_TTS_URL in Vercel/Netlify environment variables
 * - Example: https://your-app.onrender.com
 */
export const TTS_SERVER_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TTS_URL) ||
  'https://appreader-tts-server-production.up.railway.app';

/**
 * Default TTS Settings
 */
export const DEFAULT_TTS_SETTINGS = {
  voice: 'vi-VN-HoaiMyNeural',
  speed: 1.5,
  minSpeed: 0.5,
  maxSpeed: 2.0,
  speedStep: 0.1,
  pitch: '-10Hz',
};

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  contentPreviewLength: 500, // Number of characters to show in preview
  minChapterLength: 50, // Minimum valid chapter length
  progressUpdateInterval: 500, // ms - how often to update progress bar
};

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  fetchTimeout: 10000, // ms - timeout for fetching chapter
  retryAttempts: 3,
  retryDelay: 1000, // ms
};

/**
 * Supported Providers
 * Add new providers here as they are implemented
 */
export const SUPPORTED_PROVIDERS = [
  { name: 'Truyện Full', domains: ['truyenfull.vn', 'truyenfull.vision'], status: 'active' },
  { name: 'Tàng Thư Viện', domains: ['tangthuvien.vn', 'tangthuvien.com.vn'], status: 'active' },
  { name: 'Docln', domains: ['docln.net'], status: 'coming_soon' },
  { name: 'Truyện Dịch Miễn Phí', domains: ['truyendichmienphi.vn'], status: 'coming_soon' },
];

/**
 * App Information
 */
export const APP_INFO = {
  name: 'App Reader TTS',
  version: '1.0.0',
  description: 'Ứng dụng đọc truyện tiếng Việt với TTS',
  author: 'Your Name',
  repository: 'https://github.com/yourusername/AppReaderTTS',
};

/**
 * Get active providers (status === 'active')
 */
export function getActiveProviders() {
  return SUPPORTED_PROVIDERS.filter(p => p.status === 'active');
}

/**
 * Check if a domain is supported
 */
export function isSupportedDomain(url: string): boolean {
  const activeProviders = getActiveProviders();
  return activeProviders.some(provider =>
    provider.domains.some(domain => url.toLowerCase().includes(domain.toLowerCase()))
  );
}

