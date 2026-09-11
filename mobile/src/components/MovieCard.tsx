import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrl, type MovieSummary } from "@/lib/api";
import { theme } from "@/lib/theme";

/** The phim kieu YouTube: anh ngang, tieu de, dong phu. */
export function MovieCard({ movie, provider }: { movie: MovieSummary; provider: string }) {
  const router = useRouter();
  const poster = imageUrl(movie.thumbUrl ?? movie.posterUrl);
  const badge = movie.episodeCurrent ?? movie.quality ?? null;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/movie/[slug]", params: { slug: movie.slug, provider } })}>
      <View style={styles.thumbWrap}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.thumb} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyText}>Không có ảnh</Text>
          </View>
        )}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {movie.name}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {[movie.originName, movie.year ? String(movie.year) : null].filter(Boolean).join(" • ")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18 },
  thumbWrap: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: theme.surface },
  thumb: { width: "100%", height: "100%" },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  thumbEmptyText: { color: theme.textMuted, fontSize: 12 },
  badge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: "60%",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  title: { color: theme.text, fontSize: 15, fontWeight: "600", marginTop: 8 },
  meta: { color: theme.textDim, fontSize: 12, marginTop: 2 },
});
