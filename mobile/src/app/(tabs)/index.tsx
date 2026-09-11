import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MovieCard } from "@/components/MovieCard";
import { latest, listByType, LIST_TYPES, providers, type MovieSummary } from "@/lib/api";
import { DEFAULT_PROVIDER } from "@/lib/config";
import { theme } from "@/lib/theme";

const CATEGORIES = [{ type: "", label: "Mới cập nhật" }, ...LIST_TYPES];

export default function HomeScreen() {
  const router = useRouter();
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [sources, setSources] = useState<string[]>([DEFAULT_PROVIDER]);
  const [category, setCategory] = useState("");
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    providers()
      .then((list) => {
        if (list.length) setSources(list);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const res = category
          ? await listByType(provider, category, nextPage)
          : await latest(provider, nextPage);
        setMovies((prev) => (replace ? res.items : [...prev, ...res.items]));
        setPage(nextPage);
        setDone(nextPage >= (res.meta?.totalPages ?? nextPage));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [provider, category, loading],
  );

  // Doi nguon/loai -> nap lai tu dau.
  useEffect(() => {
    setMovies([]);
    setDone(false);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, category]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Ionicons name="play-circle" size={26} color={theme.primary} />
          <Text style={styles.brandText}>
            Rap<Text style={{ color: theme.primary }}>Phim</Text>
          </Text>
        </View>
        <Pressable onPress={() => router.push("/search")} hitSlop={10}>
          <Ionicons name="search" size={24} color={theme.text} />
        </Pressable>
      </View>

      <FlatList
        data={movies}
        keyExtractor={(m, i) => `${m.slug}-${i}`}
        renderItem={({ item }) => <MovieCard movie={item} provider={provider} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!done && !loading) load(page + 1, false);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.text}
            onRefresh={() => {
              setRefreshing(true);
              load(1, true);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <ChipRow
              items={sources.map((s) => ({ key: s, label: nguonLabel(s) }))}
              active={provider}
              onSelect={setProvider}
            />
            <ChipRow
              items={CATEGORIES.map((c) => ({ key: c.type, label: c.label }))}
              active={category}
              onSelect={setCategory}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListFooterComponent={
          loading && movies.length > 0 ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>Không có phim nào.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function ChipRow({
  items,
  active,
  onSelect,
}: {
  items: { key: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(i) => i.key || "all"}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      renderItem={({ item }) => {
        const on = item.key === active;
        return (
          <Pressable
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onSelect(item.key)}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

function nguonLabel(code: string) {
  const map: Record<string, string> = {
    kkphim: "KKPhim",
    nguonc: "NguonC",
    vsmov: "VSMOV",
    homelab: "Kho riêng",
  };
  return map[code] ?? code;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandText: { color: theme.text, fontSize: 20, fontWeight: "800" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  chipRow: { gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: theme.surface2,
  },
  chipOn: { backgroundColor: theme.text },
  chipText: { color: theme.text, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: theme.bg },
  error: { color: theme.primary, paddingVertical: 12 },
  empty: { color: theme.textMuted, textAlign: "center", marginTop: 40 },
});
