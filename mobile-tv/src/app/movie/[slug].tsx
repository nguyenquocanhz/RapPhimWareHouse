import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { detail, Episode, imageUrl, MovieDetail } from "../../lib/api";
import { DEFAULT_PROVIDER } from "../../lib/config";
import { theme } from "../../lib/theme";
import { BackButton } from "../../components/BackButton";
import { Focusable } from "../../components/Focusable";

export default function MovieScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug: string; provider?: string }>();
  const provider = params.provider ?? DEFAULT_PROVIDER;
  const slug = params.slug;

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverIdx, setServerIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    setMovie(null);
    setError(null);
    detail(provider, slug)
      .then((d) => alive && setMovie(d))
      .catch((e) => alive && setError(e?.message ?? "Không tải được phim"));
    return () => {
      alive = false;
    };
  }, [provider, slug]);

  const play = (ep: Episode) => {
    router.push({
      pathname: "/watch",
      params: {
        title: `${movie?.name ?? ""}${ep.name ? " · " + ep.name : ""}`,
        m3u8: ep.linkM3u8 ?? "",
        embed: ep.linkEmbed ?? "",
      },
    });
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>{error}</Text>
        <Focusable
          onPress={() => router.back()}
          hasTVPreferredFocus
          style={(f) => [styles.backBtn, f && styles.backBtnFocused]}
        >
          <Text style={styles.backText}>Quay lại</Text>
        </Focusable>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  const servers = movie.servers ?? [];
  const server = servers[serverIdx];
  const episodes = server?.episodes ?? [];
  const poster = imageUrl(movie.posterUrl ?? movie.thumbUrl);

  const meta = [movie.year, movie.quality, movie.lang, movie.time, movie.episodeCurrent]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.backRow}>
        <BackButton />
      </View>
      <View style={styles.hero}>
        {/* Cot trai: poster + the loai. */}
        <View style={styles.left}>
          <View style={styles.posterBox}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]} />
            )}
          </View>
          {movie.categories?.length ? (
            <View style={styles.tags}>
              {movie.categories.slice(0, 6).map((c) => (
                <View key={c.id ?? c.slug} style={styles.tag}>
                  <Text style={styles.tagText}>{c.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Cot phai: ten, mo ta, nut xem, danh sach tap. */}
        <View style={styles.right}>
          <Text style={styles.title}>{movie.name}</Text>
          {movie.originName ? <Text style={styles.origin}>{movie.originName}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}

          {episodes.length > 0 ? (
            <Focusable
              onPress={() => play(episodes[0])}
              hasTVPreferredFocus
              style={(f) => [styles.playBtn, f && styles.playBtnFocused]}
            >
              {(f) => (
                <>
                  <Ionicons name="play" size={22} color={f ? "#fff" : theme.text} />
                  <Text style={styles.playText}>
                    {episodes.length > 1 ? "Xem tập 1" : "Xem ngay"}
                  </Text>
                </>
              )}
            </Focusable>
          ) : (
            <Text style={styles.noEp}>Chưa có tập nào để xem.</Text>
          )}

          {movie.content ? (
            <Text style={styles.desc} numberOfLines={5}>
              {stripHtml(movie.content)}
            </Text>
          ) : null}

          {/* Chon may chu (server) neu co nhieu. */}
          {servers.length > 1 ? (
            <View style={styles.serverRow}>
              {servers.map((s, i) => (
                <Focusable
                  key={i}
                  onPress={() => setServerIdx(i)}
                  style={(f) => [
                    styles.serverChip,
                    i === serverIdx && styles.serverChipActive,
                    f && styles.serverChipFocused,
                  ]}
                >
                  <Text
                    style={[styles.serverText, i === serverIdx && styles.serverTextActive]}
                    numberOfLines={1}
                  >
                    {s.serverName || `Bản ${i + 1}`}
                  </Text>
                </Focusable>
              ))}
            </View>
          ) : null}

          {/* Luoi tap. */}
          {episodes.length > 1 ? (
            <View style={styles.epGrid}>
              {episodes.map((ep, i) => (
                <Focusable
                  key={ep.slug + i}
                  onPress={() => play(ep)}
                  style={(f) => [styles.epBtn, f && styles.epBtnFocused]}
                >
                  <Text style={styles.epText} numberOfLines={1}>
                    {ep.name || `Tập ${i + 1}`}
                  </Text>
                </Focusable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

/** Bo the HTML thô trong phần mô tả (nguồn hay trả kèm <p>, <br>...). */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 48 },
  backRow: { marginBottom: 18 },
  center: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  hero: { flexDirection: "row", gap: 40 },
  left: { width: 260 },
  posterBox: {
    width: 260,
    height: 372,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.surface2,
  },
  poster: { width: "100%", height: "100%" },
  posterPlaceholder: { backgroundColor: theme.surface2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  tag: {
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: { color: theme.textDim, fontSize: 12 },
  right: { flex: 1 },
  title: { color: theme.text, fontSize: 34, fontWeight: "800" },
  origin: { color: theme.textDim, fontSize: 17, marginTop: 4 },
  meta: { color: theme.textMuted, fontSize: 15, marginTop: 10 },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.surface2,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 22,
    borderWidth: 2,
    borderColor: "transparent",
  },
  playBtnFocused: { backgroundColor: theme.primary, borderColor: theme.text },
  playText: { color: theme.text, fontSize: 17, fontWeight: "700" },
  noEp: { color: theme.textMuted, marginTop: 22, fontSize: 15 },
  desc: { color: theme.textDim, fontSize: 15, lineHeight: 22, marginTop: 22, maxWidth: 820 },
  serverRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  serverChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  serverChipActive: { backgroundColor: theme.surface2 },
  serverChipFocused: { borderColor: theme.primary },
  serverText: { color: theme.textDim, fontSize: 14, maxWidth: 180 },
  serverTextActive: { color: theme.text, fontWeight: "600" },
  epGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  epBtn: {
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },
  epBtnFocused: { backgroundColor: theme.surface2, borderColor: theme.primary, transform: [{ scale: 1.05 }] },
  epText: { color: theme.text, fontSize: 14 },
  backBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: theme.surface2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  backBtnFocused: { borderColor: theme.primary },
  backText: { color: theme.text, fontSize: 16, fontWeight: "600" },
  errText: { color: theme.textDim, fontSize: 18 },
});
