import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.finora.app",
  appName: "Finora",
  webDir: "out",
  backgroundColor: "#6b5ce7",
  android: {
    backgroundColor: "#6b5ce7",
  },
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DEFAULT",
      hidden: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: "#6b5ce7",
      showSpinner: false,
    },
  },
};

export default config;
