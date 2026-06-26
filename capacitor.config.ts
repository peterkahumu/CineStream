import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cinemaphora.app',
  appName: 'CinemaPhora',
  webDir: 'public',
  server: {
    url: 'https://cine-stream.live',
    cleartext: true
  }
};

export default config;
