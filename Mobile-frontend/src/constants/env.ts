import Constants from 'expo-constants';

// The build profile sets EXPO_PUBLIC_RELEASE_CHANNEL at build time via eas.json.
// Falls back to 'development' when running locally in Expo Go.
const channel =
  process.env.EXPO_PUBLIC_RELEASE_CHANNEL ??
  Constants.expoConfig?.extra?.releaseChannel ??
  'development';

const DEV_API_PORT = 3000;

/**
 * In development, talk to the backend on the same machine that's serving the
 * JS bundle. Expo exposes that machine's address as hostUri (e.g.
 * "192.168.0.157:8081"), so this keeps working when the router hands the
 * computer a new IP — no more hardcoded addresses going stale.
 *
 * Override with EXPO_PUBLIC_API_URL in Mobile-frontend/.env if the backend
 * runs somewhere else (another machine, or when using `expo start --tunnel`).
 */
function devBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  // Tunnel hosts (*.exp.direct) only forward the bundler port, not the API
  if (host && !host.endsWith('.exp.direct')) {
    return `http://${host}:${DEV_API_PORT}/v1`;
  }
  return `http://localhost:${DEV_API_PORT}/v1`;
}

const BASE_URLS: Record<string, string> = {
  staging:    'https://fundly-backend-staging.up.railway.app/v1',
  production: 'https://fundly-backend-production.up.railway.app/v1',
};

const ENV = {
  BASE_URL: BASE_URLS[channel] ?? devBaseUrl(),
  IS_DEV:   channel === 'development',
  channel,
};

if (__DEV__) console.log(`[env] API: ${ENV.BASE_URL}`);

export default ENV;
