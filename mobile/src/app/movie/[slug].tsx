import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { detail, imageUrl, type Episode, type MovieDetail } from "@/lib/api";
import { DEFAULT_PROVIDER, WEB_BASE } from "@/lib/config";
import { theme } from "@/lib/theme";

export default function MovieScreen() {
  const router = useRouter();
  const { slug, provider = DEFAULT_PROVIDER } = useLocalSearchParams<{ slug: string; provider?: string }>();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    detail(provider, slug)
      .then((m) => alive && setMovie(m))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Không tải được"));
    return () => {
      alive = false;
    };
  }, [slug, provider]);

  const watchUrl = `${WEB_BASE}/phim/${encodeURIComponent(slug)}?provider=${encodeURIComponent(provider)}`;
  const openWatch = () =>
    router.push({ pathname: "/watch", params: { url: watchUrl, title: movie?.name ?? "" } });

  const poster = movie ? imageUrl(movie.posterUrl ?? movie.thumbUrl) : null;
  const episodes: Episode[] = movie?.servers?.[0]?.episodes ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !movie ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.hero} onPress={openWatch}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.heroImg} contentFit="cover" />
            ) : (
              <View style={[styles.heroImg, styles.heroEmpty]} />
            )}
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={64} color="#fff" />
            </View>
          </Pressable>

          <Text style={styles.title}>{movie.name}</Text>
          {movie.originName ? <Text style={styles.origin}>{movie.originName}</Text> : null}
          <Text style={styles.meta}>
            {[movie.year, movie.quality, movie.lang, movie.episodeCurrent].filter(Boolean).join(" • ")}
          </Text>

          <Pressable style={styles.watchBtn} onPress={openWatch}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.watchText}>Xem phim</Text>
          </Pressable>

          {movie.categories?.length ? (
            <View style={styles.tags}>
              {movie.categories.map((c) => (
                <View key={c.slug} style={styles.tag}>
                  <Text style={styles.tagText}>{c.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {movie.content ? <Text style={styles.content}>{stripHtml(movie.content)}</Text> : null}

          {episodes.length > 1 ? (
            <View style={styles.epsWrap}>
              <Text style={styles.epsHeading}>Tập phim</Text>
              <View style={styles.eps}>
                {episodes.map((ep, i) => (
                  <Pressable key={`${ep.slug}-${i}`} style={styles.ep} onPress={openWatch}>
                    <Text style={styles.epText} numberOfLines={1}>
                      {ep.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  back: { paddingHorizontal: 16, paddingVertical: 8 },
  body: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  hero: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: theme.surface },
  heroImg: { width: "100%", height: "100%" },
  heroEmpty: { backgroundColor: theme.surface },
  playOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  title: { color: theme.text, fontSize: 20, fontWeight: "700", marginTop: 14 },
  origin: { color: theme.textDim, fontSize: 14, marginTop: 2 },
  meta: { color: theme.textMuted, fontSize: 13, marginTop: 6 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  watchText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  tag: { backgroundColor: theme.surface2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  tagText: { color: theme.textDim, fontSize: 12 },
  content: { color: theme.textDim, fontSize: 14, lineHeight: 21, marginTop: 16 },
  epsWrap: { marginTop: 22 },
  epsHeading: { color: theme.text, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  eps: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ep: { backgroundColor: theme.surface2, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, minWidth: 64, alignItems: "center" },
  epText: { color: theme.text, fontSize: 13, fontWeight: "600" },
  error: { color: theme.primary, textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
});
