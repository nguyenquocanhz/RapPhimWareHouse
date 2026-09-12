import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { defaultBackend, getBackend, saveBackend } from "@/lib/settings";
import { theme } from "@/lib/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const initial = getBackend();
  const [host, setHost] = useState(initial.host);
  const [apiPort, setApiPort] = useState(initial.apiPort);
  const [webPort, setWebPort] = useState(initial.webPort);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const apiBase = `http://${host.trim()}:${apiPort.trim()}/api/v1`;
  const webBase = `http://${host.trim()}:${webPort.trim()}`;

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/providers`, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const list = (body?.data ?? []) as string[];
      setTestResult({ ok: true, msg: `Kết nối OK — ${list.length} nguồn: ${list.join(", ")}` });
    } catch (e) {
      setTestResult({ ok: false, msg: `Không kết nối được: ${e instanceof Error ? e.message : e}` });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    await saveBackend({ host, apiPort, webPort });
    router.back();
  };

  const reset = () => {
    const d = defaultBackend();
    setHost(d.host);
    setApiPort(d.apiPort);
    setWebPort(d.webPort);
    setTestResult(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Text style={styles.title}>Cài đặt backend</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          App gọi thẳng REST API của backend. Đổi địa chỉ nếu homelab của bạn ở IP/cổng khác.
          Máy phải cùng mạng LAN với backend.
        </Text>

        <Field label="Địa chỉ (IP hoặc host)" value={host} onChange={setHost} placeholder="192.168.100.169" keyboardType="numbers-and-punctuation" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Cổng API" value={apiPort} onChange={setApiPort} placeholder="7101" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Cổng Web (ảnh)" value={webPort} onChange={setWebPort} placeholder="7100" keyboardType="number-pad" />
          </View>
        </View>

        <View style={styles.urls}>
          <Text style={styles.urlLine}>API: {apiBase}</Text>
          <Text style={styles.urlLine}>Web: {webBase}</Text>
        </View>

        <Pressable style={[styles.btn, styles.btnGhost]} onPress={test} disabled={testing}>
          {testing ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <>
              <Ionicons name="pulse" size={18} color={theme.text} />
              <Text style={styles.btnGhostText}>Kiểm tra kết nối</Text>
            </>
          )}
        </Pressable>

        {testResult ? (
          <Text style={[styles.testMsg, { color: testResult.ok ? "#2ecc71" : theme.primary }]}>
            {testResult.msg}
          </Text>
        ) : null}

        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={save}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Lưu</Text>
        </Pressable>

        <Pressable style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>Khôi phục mặc định</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: "number-pad" | "numbers-and-punctuation";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  bar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: theme.text, fontSize: 18, fontWeight: "700" },
  body: { padding: 16, gap: 4 },
  note: { color: theme.textDim, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  field: { marginBottom: 14 },
  label: { color: theme.textDim, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    color: theme.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", gap: 12 },
  urls: { backgroundColor: theme.surface, borderRadius: 10, padding: 12, marginVertical: 8 },
  urlLine: { color: theme.textDim, fontSize: 12, fontFamily: "monospace" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 12,
  },
  btnGhost: { backgroundColor: theme.surface2 },
  btnGhostText: { color: theme.text, fontSize: 15, fontWeight: "600" },
  btnPrimary: { backgroundColor: theme.primary },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  testMsg: { fontSize: 13, marginTop: 10, lineHeight: 19 },
  resetBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  resetText: { color: theme.textMuted, fontSize: 14 },
});
