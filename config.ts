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
 * 
 * Local development:
 * - Flask server runs on port 5000
 * - Expo dev server runs on different port (8081, 19006, etc.)
 */
function getTTSServerUrl(): string {
  // Check for environment variable first
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TTS_URL) {
    return process.env.EXPO_PUBLIC_TTS_URL;
  }

  // In browser, check if we're on production (not localhost dev ports)
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    const isLocalDev = window.location.hostname === 'localhost' && 
      (port === '8081' || port === '19006' || port === '19000' || port === '3000');
    
    if (isLocalDev) {
      // Local development: Flask server on port 5000
      return 'http://localhost:5000';
    }
    
    // Production: use same origin with /api path
    return window.location.origin + '/api';
  }

  // Fallback
  return 'http://localhost:5000';
}

export const TTS_SERVER_URL = getTTSServerUrl();

/**
 * Cloud Sync Configuration (Supabase)
 */
export const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) || 'https://wdqoppgfalqagnhhxkmi.supabase.co';
export const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || 'sb_publishable_O5GflvTod47POWWy2rGpQA_yo-kMVbZ';


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
  { name: 'Mê Truyện Chữ', domains: ['metruyenchu.com.vn'], status: 'active' },
  { name: 'Truyện Mới', domains: ['truyenmoiz.org'], status: 'active' },
];

/**
 * App Information
 */
export const APP_INFO = {
  name: 'App Reader TTS',
  version: '1.0.0',
  description: 'Ứng dụng đọc truyện tiếng Việt với TTS',
  author: 'Your Name',
  repository: 'https://github.com/yourusername/Đọc truyện Audio',
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

