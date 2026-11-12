import { Switch, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/theme/colors';

type DemoModeToggleProps = {
  enabled: boolean;
  onChange: (value: boolean) => void;
};

export const DemoModeToggle = ({ enabled, onChange }: DemoModeToggleProps) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <ThemedText preset="bodyMd">Demo Mode</ThemedText>
        <ThemedText preset="bodySm" style={{ color: colors.textSecondary }}>
          Use simulated sensing data instead of a server
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel="Demo mode"
        value={enabled}
        onValueChange={onChange}
        trackColor={{ true: colors.simulated, false: colors.surfaceAlt }}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
};
