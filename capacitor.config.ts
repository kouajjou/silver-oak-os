import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.silveroak.os',
  appName: 'Silver Oak OS',
  // In production: load from live URL (hybrid mode)
  // Switch to webDir for full native build
  server: {
    url: 'https://os.silveroak.one',
    cleartext: false,
    allowNavigation: ['os.silveroak.one'],
  },
  // For offline/native build (comment server block above and uncomment):
  // webDir: 'frontend/out',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#071529',
    // limitsNavigationsToAppBoundDomains requires Associated Domains capability
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#071529',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B1F3A',
    },
  },
};

export default config;
