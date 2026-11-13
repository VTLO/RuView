import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SensingFrame } from '@/types/sensing';
import { mountXrayScene } from './xray/scene';

type Props = {
  onReady: () => void;
  onFps: (fps: number) => void;
  onError: (msg: string) => void;
  frame: SensingFrame | null;
};

export const GaussianSplatWebViewWeb = ({ onReady, onFps, onError, frame }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<SensingFrame | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  frameRef.current = frame;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const dispose = mountXrayScene(container, {
        getFrame: () => frameRef.current,
        onReady,
        onFps,
      });
      disposeRef.current = dispose;

      return () => {
        if (disposeRef.current) {
          disposeRef.current();
          disposeRef.current = null;
        }
      };
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to initialize X-ray renderer');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#000000' }} />
    </View>
  );
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#000000' } });
export default GaussianSplatWebViewWeb;
