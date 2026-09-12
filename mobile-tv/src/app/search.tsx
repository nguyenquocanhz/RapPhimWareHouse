import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import { MovieSummary, search } from "../lib/api";
import { DEFAULT_PROVIDER } from "../lib/config";
import { theme } from "../lib/theme";
import { BackButton } from "../components/BackButton";
import { Focusable } from "../components/Focusable";
import { PosterCard } from "../components/PosterCard";

export default function Search() {
  const router = useRouter();
  const params = useLocalSearchParams<{ provider?: string }>();
  const provider = params.provider ?? DEFAULT_PROVIDER;

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<MovieSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    search(provider, q)
      .then((page) => setResults(page.items ?? []))
      .catch((e) => setError(e?.message ?? "Tìm kiếm lỗi"))
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <BackButton />
      </View>
      <View style={styles.bar}>
        <Ionicons name="search" size={24} color={theme.textDim} style={{ marginRight: 12 }} />
        <TextInput
          style={styles.input}
          placeholder="Tìm phim..."
          placeholderTextColor={theme.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={run}
          returnKeyType="search"
          autoFocus
          selectionColor={theme.primary}
        />
        <Focusable onPress={run} style={(f) => [styles.goBtn, f && styles.goBtnFocused]}>
          <Text style={styles.goText}>Tìm</Text>
        </Focusable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
        </View>
      ) : results === null ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Nhập tên phim rồi bấm Tìm.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Không tìm thấy phim nào.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          key="grid5"
          numColumns={5}
          keyExtractor={(m) => m.id ?? m.slug}
          columnWrapperStyle={styles.rowGap}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <PosterCard
              movie={item}
              onPress={() =>
                router.push({ pathname: "/movie/[slug]", params: { slug: item.slug, provider } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, paddingTop: 28 },
  topRow: { paddingHorizontal: 48, marginBottom: 14 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 48,
    marginBottom: 24,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: theme.text,
    fontSize: 18,
    paddingVertical: 12,
  },
  goBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.surface2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  goBtnFocused: { backgroundColor: theme.primary, borderColor: theme.text },
  goText: { color: theme.text, fontSize: 16, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: theme.textMuted, fontSize: 16 },
  grid: { paddingHorizontal: 48, paddingBottom: 40 },
  rowGap: { gap: 0, marginBottom: 22 },
});
