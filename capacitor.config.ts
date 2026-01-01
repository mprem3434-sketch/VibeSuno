
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibesun.ai.musicplayer',
  appName: 'VibeSun',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#020617",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#2563eb"
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    }
  }
};

export default config;
