import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { latest, listByType, MovieSummary, providers } from "../lib/api";
import { DEFAULT_PROVIDER } from "../lib/config";
import { theme } from "../lib/theme";
import { Focusable } from "../components/Focusable";
import { Row } from "../components/Row";
import { SideNav } from "../components/SideNav";

const PROVIDER_LABELS: Record<string, string> = {
  kkphim: "KKPhim",
  nguonc: "NguonC",
  vsmov: "VSMOV",
  homelab: "Kho nhà",
  "phim-kho": "Phim Kho",
};

/** Cac hang phim hien tren trang chu, theo thu tu tu tren xuong. */
const ROWS: { title: string; type?: string }[] = [
  { title: "Mới cập nhật" },
  { title: "Phim bộ", type: "phim-bo" },
  { title: "Phim lẻ", type: "phim-le" },
  { title: "Hoạt hình", type: "hoat-hinh" },
  { title: "TV Shows", type: "tv-shows" },
];

export default function Home() {
  const router = useRouter();
  const [provider, setProvider] = useState<string>(DEFAULT_PROVIDER);
  const [providerList, setProviderList] = useState<string[]>([DEFAULT_PROVIDER]);

  useEffect(() => {
    providers()
      .then((list) => {
        if (list && list.length) setProviderList(list);
      })
      .catch(() => {
        // Khong lay duoc danh sach nguon thi giu mac dinh.
      });
  }, []);

  const openMovie = (m: MovieSummary) =>
    router.push({ pathname: "/movie/[slug]", params: { slug: m.slug, provider } });

  return (
    <View style={styles.screen}>
      <SideNav active="home" />

      <View style={styles.content}>
        {/* Chip chon nguon phim - kieu chip danh muc dau trang cua YouTube. */}
        <View style={styles.chipBar}>
          {providerList.map((p) => {
            const active = p === provider;
            return (
              <Focusable
                key={p}
                onPress={() => setProvider(p)}
                style={(focused) => [
                  styles.chip,
                  active && styles.chipActive,
                  focused && styles.chipFocused,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {PROVIDER_LABELS[p] ?? p}
                </Text>
              </Focusable>
            );
          })}
        </View>

        <ScrollView
          style={styles.rows}
          contentContainerStyle={styles.rowsContent}
          showsVerticalScrollIndicator={false}
        >
          {ROWS.map((r, i) => (
            <Row
              key={`${provider}:${r.title}`}
              title={r.title}
              preferredFocus={i === 0}
              load={() => (r.type ? listByType(provider, r.type) : latest(provider))}
              onSelect={openMovie}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.bg,
  },
  content: {
    flex: 1,
    paddingTop: 30,
  },
  chipBar: {
    flexDirection: "row",
    gap: 10,
    paddingLeft: 48,
    paddingRight: 24,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: theme.primary,
  },
  chipFocused: {
    borderColor: theme.text,
    transform: [{ scale: 1.06 }],
  },
  chipText: {
    color: theme.textDim,
    fontSize: 15,
    fontWeight: "600",
  },
  chipTextActive: {
    color: theme.text,
  },
  rows: {
    flex: 1,
  },
  rowsContent: {
    paddingTop: 6,
  },
});
