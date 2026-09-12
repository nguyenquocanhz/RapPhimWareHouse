import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { theme } from "../lib/theme";
import { Focusable } from "./Focusable";

/**
 * Nut Quay lai hien ro tren cac man phu. Tren tivi nguoi dung quen bam Back tren
 * remote, nhung co nut nhin thay giup ca chuot lan remote deu quay ve duoc - va cho
 * biet dang o man con, khong phai trang chu.
 */
export function BackButton({ overlay = false }: { overlay?: boolean }) {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/"); // khong con lich su -> ve trang chu, khong thoat app
  };
  return (
    <Focusable
      onPress={goBack}
      style={(f) => [styles.btn, overlay && styles.overlay, f && styles.focused]}
    >
      {(f) => (
        <>
          <Ionicons name="chevron-back" size={20} color={f ? "#fff" : theme.textDim} />
          <Text style={[styles.text, f && styles.textFocused]}>Quay lại</Text>
        </>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  overlay: {
    position: "absolute",
    top: 24,
    left: 32,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  focused: {
    backgroundColor: theme.primary,
    borderColor: theme.text,
  },
  text: {
    color: theme.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  textFocused: {
    color: theme.text,
  },
});
