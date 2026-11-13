import { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiService } from '@/services/api.service';
import { rssiService } from '@/services/rssi.service';
import { wsService } from '@/services/ws.service';
import { ThemeProvider } from './src/theme/ThemeContext';
import { usePoseStore } from './src/stores/poseStore';
import { useSettingsStore } from './src/stores/settingsStore';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const demoMode = useSettingsStore((state) => state.demoMode);
  const rssiScanEnabled = useSettingsStore((state) => state.rssiScanEnabled);

  useEffect(() => {
    apiService.setBaseUrl(serverUrl);
    const unsubscribe = wsService.subscribe(usePoseStore.getState().handleFrame);
    // Demo mode: wsService streams generated frames presented as a live feed, without a server.
    wsService.connect(serverUrl, { demo: demoMode });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [serverUrl, demoMode]);

  useEffect(() => {
    if (!rssiScanEnabled) {
      rssiService.stopScanning();
      return;
    }

    const unsubscribe = rssiService.subscribe(() => {
      // Consumers can subscribe elsewhere for RSSI events.
    });
    rssiService.startScanning(2000);

    return () => {
      unsubscribe();
      rssiService.stopScanning();
    };
  }, [rssiScanEnabled]);

  useEffect(() => {
    (globalThis as { __appStartTime?: number }).__appStartTime = Date.now();
  }, []);

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
      card: '#000000',
      text: '#FFFFFF',
      border: '#2B2B2B',
      primary: '#C15632',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer
            theme={navigationTheme}
            documentTitle={{ formatter: (options, route) => `${options?.title ?? route?.name ?? 'Home'} · VTLO_EyesOfGod` }}
          >
            <RootNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
