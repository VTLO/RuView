import { LayoutChangeEvent, StyleSheet } from 'react-native';
import type { RefObject } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { LIVE_XRAY_HTML } from '@/assets/webview/liveXray.generated';

type GaussianSplatWebViewProps = {
  onMessage: (event: WebViewMessageEvent) => void;
  onError: () => void;
  webViewRef: RefObject<WebView | null>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export const GaussianSplatWebView = ({
  onMessage,
  onError,
  webViewRef,
  onLayout,
}: GaussianSplatWebViewProps) => {
  return (
    <WebView
      ref={webViewRef}
      source={{ html: LIVE_XRAY_HTML }}
      originWhitelist={['*']}
      allowFileAccess={false}
      javaScriptEnabled
      onMessage={onMessage}
      onError={onError}
      onLayout={onLayout}
      style={styles.webView}
    />
  );
};

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
