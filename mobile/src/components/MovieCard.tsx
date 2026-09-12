import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrl, type MovieSummary } from "@/lib/api";
import { theme } from "@/lib/theme";

const SOURCE: Record<string, { label: string; color: string }> = {
  kkphim: { label: "KKPhim", color: "#e53935" },
  nguonc: { label: "NguonC", color: "#1e88e5" },
  vsmov: { label: "VSMOV", color: "#8e24aa" },
  homelab: { label: "Kho riêng", color: "#43a047" },
};

/** The phim kieu YouTube: thumbnail ngang, ben duoi la avatar nguon + tieu de + meta. */
export function MovieCard({ movie, provider }: { movie: MovieSummary; provider: string }) {
  const router = useRouter();
  const poster = imageUrl(movie.thumbUrl ?? movie.posterUrl);
  const badge = movie.episodeCurrent ?? movie.quality ?? null;
  const src = SOURCE[provider] ?? { label: provider, color: theme.surface2 };
  const meta = [src.label, movie.year ? String(movie.year) : null, movie.quality]
    .filter(Boolean)
    .join("  •  ");

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

      <View style={styles.info}>
        <View style={[styles.avatar, { backgroundColor: src.color }]}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
          {movie.originName ? (
            <Text style={styles.origin} numberOfLines={1}>
              {movie.originName}
            </Text>
          ) : null}
        </View>
        <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} style={styles.more} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 20 },
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
  info: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, paddingHorizontal: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  title: { color: theme.text, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  meta: { color: theme.textDim, fontSize: 12.5, marginTop: 3 },
  origin: { color: theme.textMuted, fontSize: 12, marginTop: 1 },
  more: { marginTop: 2 },
});
