import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/lib/theme";

export default function LibraryScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="library" size={48} color={theme.primary} />
        <Text style={styles.title}>Thư viện</Text>
        <Text style={styles.sub}>Phim đã lưu và lịch sử xem sẽ hiện ở đây.</Text>
        <Pressable style={styles.btn} onPress={() => router.push("/search")}>
          <Text style={styles.btnText}>Tìm phim</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  title: { color: theme.text, fontSize: 20, fontWeight: "700" },
  sub: { color: theme.textMuted, textAlign: "center" },
  btn: { marginTop: 8, backgroundColor: theme.surface2, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  btnText: { color: theme.text, fontWeight: "600" },
});
