import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { imageUrl, MovieSummary } from "../lib/api";
import { theme } from "../lib/theme";
import { Focusable } from "./Focusable";

export const POSTER_W = 168;
export const POSTER_H = 240;

interface Props {
  movie: MovieSummary;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

/**
 * The phim doc kieu Netflix/YouTube TV. Luc duoc chon: phong to nhe + vien do +
 * hien ten day du. Kich thuoc du lon de nhin tu xa 3m (giao dien "10-foot").
 */
export function PosterCard({ movie, onPress, hasTVPreferredFocus }: Props) {
  const uri = imageUrl(movie.posterUrl ?? movie.thumbUrl);
  const badge = movie.episodeCurrent || movie.quality || movie.lang || null;

  return (
    <Focusable
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={(focused) => [styles.wrap, focused && styles.wrapFocused]}
    >
      {(focused) => (
        <>
          <View style={[styles.posterBox, focused && styles.posterBoxFocused]}>
            {uri ? (
              <Image source={{ uri }} style={styles.poster} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.poster, styles.placeholder]}>
                <Text style={styles.placeholderText} numberOfLines={4}>
                  {movie.name}
                </Text>
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
          <Text style={[styles.title, focused && styles.titleFocused]} numberOfLines={2}>
            {movie.name}
          </Text>
          {movie.year ? <Text style={styles.year}>{movie.year}</Text> : null}
        </>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: POSTER_W,
    marginRight: 18,
  },
  wrapFocused: {
    transform: [{ scale: 1.08 }],
    zIndex: 10,
  },
  posterBox: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: theme.surface2,
    borderWidth: 3,
    borderColor: "transparent",
  },
  posterBoxFocused: {
    borderColor: theme.primary,
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  placeholderText: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    color: theme.textDim,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 18,
  },
  titleFocused: {
    color: theme.text,
    fontWeight: "600",
  },
  year: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
