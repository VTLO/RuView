import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

type ConnectionState = 'connected' | 'simulated' | 'disconnected';

type ConnectionBannerProps = {
  status: ConnectionState;
};

const resolveState = (status: ConnectionState) => {
  if (status === 'connected') {
    return {
      label: 'LIVE STREAM',
      backgroundColor: '#1A1A1A',
      textColor: '#FFFFFF',
    };
  }

  if (status === 'disconnected') {
    return {
      label: 'DISCONNECTED',
      backgroundColor: '#5C1414',
      textColor: '#FFE3E3',
    };
  }

  return {
    label: 'SIMULATED DATA',
    backgroundColor: '#6B2E1A',
    textColor: '#FFFFFF',
  };
};

export const ConnectionBanner = ({ status }: ConnectionBannerProps) => {
  const state = resolveState(status);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: state.backgroundColor,
          borderBottomColor: state.textColor,
        },
      ]}
    >
      <ThemedText preset="labelMd" style={[styles.text, { color: state.textColor }]}>
        {state.label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    paddingVertical: 6,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    letterSpacing: 2,
    fontWeight: '700',
  },
});
