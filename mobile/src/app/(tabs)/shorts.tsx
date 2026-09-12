import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/lib/theme";

export default function ShortsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="flash" size={48} color={theme.primary} />
        <Text style={styles.title}>Shorts</Text>
        <Text style={styles.sub}>Sắp ra mắt — clip ngắn giới thiệu phim.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  title: { color: theme.text, fontSize: 20, fontWeight: "700" },
  sub: { color: theme.textMuted, textAlign: "center" },
});
