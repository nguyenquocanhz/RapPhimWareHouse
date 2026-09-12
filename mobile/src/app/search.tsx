import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MovieCard } from "@/components/MovieCard";
import { search, type MovieSummary } from "@/lib/api";
import { DEFAULT_PROVIDER } from "@/lib/config";
import { theme } from "@/lib/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<MovieSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await search(DEFAULT_PROVIDER, q);
      setResults(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tìm được");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm kiếm phim"
          placeholderTextColor={theme.textMuted}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={run}
        />
        {keyword ? (
          <Pressable onPress={() => setKeyword("")} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.msg}>{error}</Text>
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(m, i) => `${m.slug}-${i}`}
          renderItem={({ item }) => <MovieCard movie={item} provider={DEFAULT_PROVIDER} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            results ? <Text style={styles.msg}>Không có kết quả.</Text> : <Text style={styles.msg}>Nhập tên phim rồi bấm tìm.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, color: theme.text, fontSize: 16, paddingVertical: 4 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  msg: { color: theme.textMuted, textAlign: "center", marginTop: 40 },
});
