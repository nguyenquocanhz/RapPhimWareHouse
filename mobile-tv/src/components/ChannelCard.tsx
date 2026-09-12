import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Channel } from "../lib/iptv";
import { theme } from "../lib/theme";
import { Focusable } from "./Focusable";

export const CH_W = 196;
export const CH_H = 116;

interface Props {
  channel: Channel;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

/** O kenh truyen hinh: logo tren nen toi + ten ben duoi, vien do khi duoc chon. */
export function ChannelCard({ channel, onPress, hasTVPreferredFocus }: Props) {
  return (
    <Focusable
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={(f) => [styles.wrap, f && styles.wrapFocused]}
    >
      {(f) => (
        <>
          <View style={[styles.tile, f && styles.tileFocused]}>
            {channel.logo ? (
              <Image source={{ uri: channel.logo }} style={styles.logo} contentFit="contain" transition={150} />
            ) : (
              <Text style={styles.fallback} numberOfLines={2}>
                {channel.name}
              </Text>
            )}
          </View>
          <Text style={[styles.name, f && styles.nameFocused]} numberOfLines={1}>
            {channel.name}
          </Text>
        </>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CH_W, marginRight: 18, marginBottom: 22 },
  wrapFocused: { transform: [{ scale: 1.06 }], zIndex: 10 },
  tile: {
    width: CH_W,
    height: CH_H,
    borderRadius: 10,
    backgroundColor: theme.surface2,
    borderWidth: 3,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  tileFocused: { borderColor: theme.primary },
  logo: { width: "100%", height: "100%" },
  fallback: { color: theme.textDim, fontSize: 15, textAlign: "center", fontWeight: "600" },
  name: { color: theme.textDim, fontSize: 14, marginTop: 8 },
  nameFocused: { color: theme.text, fontWeight: "600" },
});
