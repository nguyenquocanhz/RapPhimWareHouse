import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { providers } from "@/lib/api";
import { theme } from "@/lib/theme";

const INFO: Record<string, { label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = {
  kkphim: { label: "KKPhim", desc: "Phim bộ, phim lẻ, hoạt hình", icon: "film" },
  nguonc: { label: "NguonC", desc: "Kho phim tổng hợp", icon: "film" },
  vsmov: { label: "VSMOV", desc: "Phim cập nhật nhanh", icon: "film" },
  homelab: { label: "Kho riêng", desc: "Phim tự lưu trên homelab", icon: "server" },
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    providers()
      .then(setSources)
      .catch(() => setSources(["kkphim", "nguonc", "vsmov", "homelab"]));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.heading}>Nguồn phim</Text>
      <View style={styles.list}>
        {sources.map((code) => {
          const info = INFO[code] ?? { label: code, desc: "Nguồn phim", icon: "film" as const };
          return (
            <Pressable
              key={code}
              style={styles.row}
              onPress={() => router.push({ pathname: "/", params: {} })}>
              <View style={styles.avatar}>
                <Ionicons name={info.icon} size={22} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{info.label}</Text>
                <Text style={styles.rowDesc}>{info.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>Chọn nguồn ngay trên hàng chip ở Trang chủ.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  heading: { color: theme.text, fontSize: 20, fontWeight: "700", padding: 16 },
  list: { paddingHorizontal: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: theme.text, fontSize: 15, fontWeight: "600" },
  rowDesc: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  note: { color: theme.textMuted, fontSize: 12, padding: 16 },
});
