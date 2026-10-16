import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.timeescoladenegocios.app",
  appName: "TIME Escola de Negócios",
  webDir: "mobile-shell",
  loggingBehavior: "none",
  appendUserAgent: "TIME-Mobile/1.0.0",
  backgroundColor: "#050829",
  server: {
    url: "https://app.timeescoladenegocios.com.br",
    cleartext: false,
    allowNavigation: ["app.timeescoladenegocios.com.br"],
    errorPath: "offline.html",
  },
  ios: {
    backgroundColor: "#050829",
    contentInset: "automatic",
    preferredContentMode: "mobile",
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
  },
  android: {
    backgroundColor: "#050829",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#050829",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "light",
      backgroundColor: "#050829",
    },
  },
};

export default config;
