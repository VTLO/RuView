import { Image, Pressable, StyleSheet, View } from 'react-native';
import { memo, useCallback, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StatusDot } from '@/components/StatusDot';
import { ModeBadge } from '@/components/ModeBadge';
import { ThemedText } from '@/components/ThemedText';
import { formatConfidence, formatRssi } from '@/utils/formatters';
import { colors, spacing } from '@/theme';
import type { ConnectionStatus } from '@/types/sensing';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/images/logo.png');

type LiveMode = 'LIVE' | 'SIM' | 'RSSI';

type LiveHUDProps = {
  rssi?: number;
  connectionStatus: ConnectionStatus;
  fps: number;
  confidence: number;
  personCount: number;
  mode: LiveMode;
};

const statusTextMap: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  simulated: 'Simulated',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
};

const statusDotStatusMap: Record<ConnectionStatus, 'connected' | 'simulated' | 'disconnected' | 'connecting'> = {
  connected: 'connected',
  simulated: 'simulated',
  connecting: 'connecting',
  disconnected: 'disconnected',
};

export const LiveHUD = memo(
  ({ rssi, connectionStatus, fps, confidence, personCount, mode }: LiveHUDProps) => {
    const [panelVisible, setPanelVisible] = useState(true);
    const panelAlpha = useSharedValue(1);

    const togglePanel = useCallback(() => {
      const next = !panelVisible;
      setPanelVisible(next);
      panelAlpha.value = withTiming(next ? 1 : 0, { duration: 220 });
    }, [panelAlpha, panelVisible]);

    const animatedPanelStyle = useAnimatedStyle(() => ({
      opacity: panelAlpha.value,
    }));

    const statusText = statusTextMap[connectionStatus];

    return (
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePanel}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedPanelStyle]}>
          {/* App title */}
          <View style={[styles.topLeft, styles.row]}>
            <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
            <ThemedText preset="labelLg" style={styles.appTitle}>
              VTLO_EyesOfGod
            </ThemedText>
          </View>

          {/* Status + FPS */}
          <View style={styles.topRight}>
            <View style={styles.row}>
              <StatusDot status={statusDotStatusMap[connectionStatus]} size={10} />
              <ThemedText preset="labelMd" style={styles.statusText}>
                {statusText}
              </ThemedText>
            </View>
            {fps > 0 && (
              <View style={styles.row}>
                <ThemedText preset="labelMd">{fps} FPS</ThemedText>
              </View>
            )}
          </View>

          {/* Bottom panel */}
          <View style={styles.bottomPanel}>
            <View style={styles.bottomCell}>
              <ThemedText preset="bodySm">RSSI</ThemedText>
              <ThemedText preset="displayMd" style={styles.bigValue}>
                {formatRssi(rssi)}
              </ThemedText>
            </View>

            <View style={styles.bottomCell}>
              <ModeBadge mode={mode} />
            </View>

            <View style={styles.bottomCellRight}>
              <ThemedText preset="bodySm">Confidence</ThemedText>
              <ThemedText preset="bodyMd" style={styles.metaText}>
                {formatConfidence(confidence)}
              </ThemedText>
              <ThemedText preset="bodySm">People: {personCount}</ThemedText>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  logo: {
    width: 26,
    height: 26,
  },
  topLeft: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  appTitle: {
    color: colors.textPrimary,
  },
  topRight: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    alignItems: 'flex-end',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: colors.textPrimary,
  },
  bottomPanel: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(193, 86, 50,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomCell: {
    flex: 1,
    alignItems: 'center',
  },
  bottomCellRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bigValue: {
    color: colors.accent,
    marginTop: 2,
    marginBottom: 2,
  },
  metaText: {
    color: colors.textPrimary,
    marginBottom: 4,
  },
});

LiveHUD.displayName = 'LiveHUD';
