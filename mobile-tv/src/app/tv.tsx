import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { PREMIUM_FEATURES } from "../lib/config";
import { Channel, fetchChannels } from "../lib/iptv";
import { usePremium } from "../lib/premium";
import { theme } from "../lib/theme";
import { BackButton } from "../components/BackButton";
import { ChannelCard } from "../components/ChannelCard";
import { Focusable } from "../components/Focusable";

export default function TvChannels() {
  const router = useRouter();
  const premium = usePremium();
  const gated = PREMIUM_FEATURES.liveTv && !premium;
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gated) return;
    let alive = true;
    fetchChannels()
      .then((list) => alive && setChannels(list))
      .catch((e) => alive && setError(e?.message ?? "Không tải được kênh"));
    return () => {
      alive = false;
    };
  }, [gated]);

  // Truyen hinh la tinh nang Premium: chua mua thi hien man moi chao nang cap.
  if (gated) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Truyền hình trực tiếp</Text>
        </View>
        <View style={styles.lockWrap}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={40} color={theme.text} />
          </View>
          <Text style={styles.lockTitle}>Tính năng Premium</Text>
          <Text style={styles.lockDesc}>
            Truyền hình trực tiếp (kênh VN) dành cho bản Premium. Nâng cấp để mở khoá và
            ủng hộ tác giả duy trì ứng dụng.
          </Text>
          <Focusable
            onPress={() => router.push("/premium")}
            hasTVPreferredFocus
            style={(f) => [styles.upgradeBtn, f && styles.upgradeBtnFocused]}
          >
            {(f) => (
              <>
                <Ionicons name="star" size={20} color={f ? "#fff" : theme.text} />
                <Text style={styles.upgradeText}>Nâng cấp Premium</Text>
              </>
            )}
          </Focusable>
        </View>
      </View>
    );
  }

  const openChannel = (c: Channel) =>
    router.push({ pathname: "/watch", params: { title: c.name, m3u8: c.url } });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Truyền hình trực tiếp</Text>
        <Text style={styles.count}>{channels ? `${channels.length} kênh` : ""}</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
        </View>
      ) : channels === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={styles.dim}>Đang tải danh sách kênh…</Text>
        </View>
      ) : (
        <FlatList
          data={channels}
          key="ch-grid"
          numColumns={4}
          keyExtractor={(c, i) => c.id + i}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <ChannelCard channel={item} onPress={() => openChannel(item)} hasTVPreferredFocus={index === 0} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, paddingTop: 28 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 48,
    marginBottom: 22,
  },
  title: { color: theme.text, fontSize: 26, fontWeight: "800" },
  count: { color: theme.textMuted, fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  dim: { color: theme.textMuted, fontSize: 16 },
  grid: { paddingHorizontal: 48, paddingBottom: 40 },
  lockWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 80,
  },
  lockIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: { color: theme.text, fontSize: 26, fontWeight: "800" },
  lockDesc: {
    color: theme.textDim,
    fontSize: 17,
    textAlign: "center",
    lineHeight: 25,
    maxWidth: 640,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.primaryDim,
    borderWidth: 2,
    borderColor: "transparent",
  },
  upgradeBtnFocused: { backgroundColor: theme.primary, borderColor: theme.text },
  upgradeText: { color: theme.text, fontSize: 17, fontWeight: "700" },
});

