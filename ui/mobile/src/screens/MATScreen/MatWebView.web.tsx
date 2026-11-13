import { useEffect, useRef, useState, type RefObject } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/theme/colors';
import MAT_DASHBOARD_HTML from '@/assets/webview/mat-dashboard.html';

type MatWebViewProps = {
  webViewRef: RefObject<WebView | null>;
  onMessage: (event: WebViewMessageEvent) => void;
  style?: StyleProp<ViewStyle>;
};

const BRIDGE_TAG = '__ruviewMatBridge';

// Recreates react-native-webview's `window.ReactNativeWebView.postMessage` inside the iframe
// so the dashboard HTML runs unchanged on web.
const BRIDGE_SCRIPT = `<script>window.ReactNativeWebView={postMessage:function(d){window.parent.postMessage({${BRIDGE_TAG}:true,data:String(d)},'*');}};</script>`;

const injectBridge = (html: string): string =>
  /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${BRIDGE_SCRIPT}`) : `${BRIDGE_SCRIPT}${html}`;

// On web, Metro exports `.html` imports as a URL; on native-style bundlers it may be inline markup.
const loadDashboardHtml = async (): Promise<string> => {
  const source = String(MAT_DASHBOARD_HTML ?? '');
  if (source.trimStart().startsWith('<')) {
    return source;
  }
  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
};

export const MatWebView = ({ webViewRef, onMessage, style }: MatWebViewProps) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onMessageRef = useRef(onMessage);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  onMessageRef.current = onMessage;

  useEffect(() => {
    let cancelled = false;
    loadDashboardHtml()
      .then((html) => {
        if (!cancelled) setSrcDoc(injectBridge(html));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Expose a WebView-compatible `postMessage` so useMatBridge works unchanged.
  useEffect(() => {
    const shim = {
      postMessage: (data: string) => {
        iframeRef.current?.contentWindow?.postMessage(data, '*');
      },
    };
    (webViewRef as { current: unknown }).current = shim;
    return () => {
      (webViewRef as { current: unknown }).current = null;
    };
  }, [webViewRef]);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.source !== iframeRef.current?.contentWindow) return;
      const msg = evt.data as Record<string, unknown> | null;
      if (!msg || msg[BRIDGE_TAG] !== true || typeof msg.data !== 'string') return;
      onMessageRef.current({ nativeEvent: { data: msg.data } } as WebViewMessageEvent);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <View style={style}>
      {error ? (
        <ThemedText preset="bodySm" style={{ color: colors.danger, padding: 12 }}>
          MAT dashboard failed to load: {error}
        </ThemedText>
      ) : srcDoc ? (
        <iframe
          ref={iframeRef}
          title="MAT dashboard"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }}
        />
      ) : null}
    </View>
  );
};
