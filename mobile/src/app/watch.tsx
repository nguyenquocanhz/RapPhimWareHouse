import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { theme } from "@/lib/theme";

/**
 * Player: mo trang xem cua web trong WebView. Tan dung nguyen bo player cua web
 * (hls.js, phu de, thuyet minh...) thay vi viet lai native - dung tinh than "mong".
 */
export default function WatchScreen() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title || "Đang phát"}
        </Text>
      </View>
      <View style={styles.player}>
        {url ? (
          <WebView
            source={{ uri: url }}
            style={styles.web}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            onLoadEnd={() => setLoading(false)}
          />
        ) : (
          <Text style={styles.msg}>Thiếu đường dẫn phát.</Text>
        )}
        {loading && url ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} size="large" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  bar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: theme.text, fontSize: 15, fontWeight: "600", flex: 1 },
  player: { flex: 1 },
  web: { flex: 1, backgroundColor: "#000" },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  msg: { color: theme.textMuted, textAlign: "center", marginTop: 40 },
});
