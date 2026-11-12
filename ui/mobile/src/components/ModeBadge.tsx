import { StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { colors } from '../theme/colors';

type Mode = 'CSI' | 'RSSI' | 'SIM' | 'LIVE';

const modeStyle: Record<
  Mode,
  {
    background: string;
    border: string;
    color: string;
  }
> = {
  CSI: {
    background: 'rgba(193, 86, 50, 0.22)',
    border: colors.accent,
    color: colors.accent,
  },
  RSSI: {
    background: 'rgba(232, 163, 61, 0.2)',
    border: colors.warn,
    color: colors.warn,
  },
  SIM: {
    background: 'rgba(229, 72, 77, 0.18)',
    border: colors.simulated,
    color: colors.simulated,
  },
  LIVE: {
    background: 'rgba(255, 255, 255, 0.12)',
    border: colors.connected,
    color: colors.connected,
  },
};

type ModeBadgeProps = {
  mode: Mode;
};

export const ModeBadge = ({ mode }: ModeBadgeProps) => {
  const style = modeStyle[mode];

  return (
    <ThemedText
      preset="labelMd"
      style={[
        styles.badge,
        {
          backgroundColor: style.background,
          borderColor: style.border,
          color: style.color,
        },
      ]}
    >
      {mode}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
