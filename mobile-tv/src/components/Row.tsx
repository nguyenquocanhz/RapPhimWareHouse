import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { MovieSummary, Page } from "../lib/api";
import { theme } from "../lib/theme";
import { PosterCard, POSTER_W } from "./PosterCard";

interface Props {
  title: string;
  /** Ham nap trang phim cho hang nay (latest / listByType...). */
  load: () => Promise<Page<MovieSummary>>;
  onSelect: (movie: MovieSummary) => void;
  /** Dat focus ban dau vao the dau tien cua hang nay khi mo man hinh. */
  preferredFocus?: boolean;
}

/**
 * Mot hang phim cuon ngang. Tu nap du lieu; neu loi hoac rong thi khong hien gi
 * (khong lam vo bo cuc chung). Moi hang doc lap nen mot nguon thieu list-type nao
 * do cung khong anh huong hang khac.
 */
export function Row({ title, load, onSelect, preferredFocus }: Props) {
  const [items, setItems] = useState<MovieSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setFailed(false);
    load()
      .then((page) => {
        if (alive) setItems(page.items ?? []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  if (failed) return null;
  if (items && items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {items === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(m) => m.id ?? m.slug}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          renderItem={({ item, index }) => (
            <PosterCard
              movie={item}
              onPress={() => onSelect(item)}
              hasTVPreferredFocus={preferredFocus && index === 0}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  heading: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
    paddingLeft: 48,
  },
  rail: {
    paddingLeft: 48,
    paddingRight: 24,
  },
  loading: {
    height: POSTER_W * 1.6,
    justifyContent: "center",
    paddingLeft: 48,
    alignItems: "flex-start",
  },
});
