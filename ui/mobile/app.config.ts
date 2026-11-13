export default {
  name: 'VTLO_EyesOfGod',
  slug: 'wifi-densepose',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    bundleIdentifier: 'com.ruvnet.wifidensepose',
    supportsTablet: true,
  },
  android: {
    package: 'com.ruvnet.wifidensepose',
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    name: 'VTLO_EyesOfGod',
    shortName: 'EyesOfGod',
    favicon: './assets/favicon.png',
    backgroundColor: '#000000',
    themeColor: '#000000',
  },
};
