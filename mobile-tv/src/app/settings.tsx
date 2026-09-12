import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Backend, defaultBackend, getBackend, saveBackend } from "../lib/settings";
import { theme } from "../lib/theme";
import { Focusable } from "../components/Focusable";

export default function Settings() {
  const router = useRouter();
  const [form, setForm] = useState<Backend>({ ...getBackend() });
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Backend, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const onSave = async () => {
    await saveBackend(form);
    setForm({ ...getBackend() });
    setSaved(true);
  };

  const onReset = () => {
    setForm(defaultBackend());
    setSaved(false);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Cài đặt máy chủ</Text>
      <Text style={styles.hint}>
        Trỏ app tới backend RapPhim trong mạng nhà bạn. App chỉ gọi API, không đổi gì trên máy chủ.
      </Text>

      <Field label="Địa chỉ máy chủ (IP hoặc tên miền)" value={form.host} onChange={(v) => set("host", v)} keyboard="default" />
      <Field label="Cổng API" value={form.apiPort} onChange={(v) => set("apiPort", v)} keyboard="number-pad" />
      <Field label="Cổng Web (ảnh & trình phát)" value={form.webPort} onChange={(v) => set("webPort", v)} keyboard="number-pad" />

      <Text style={styles.preview}>
        API: http://{form.host}:{form.apiPort}/api/v1
      </Text>

      <View style={styles.actions}>
        <Focusable onPress={onSave} hasTVPreferredFocus style={(f) => [styles.btn, styles.btnPrimary, f && styles.btnFocused]}>
          <Text style={styles.btnText}>Lưu</Text>
        </Focusable>
        <Focusable onPress={onReset} style={(f) => [styles.btn, f && styles.btnFocused]}>
          <Text style={styles.btnText}>Mặc định</Text>
        </Focusable>
        <Focusable onPress={() => router.back()} style={(f) => [styles.btn, f && styles.btnFocused]}>
          <Text style={styles.btnText}>Xong</Text>
        </Focusable>
      </View>

      {saved ? <Text style={styles.saved}>Đã lưu. Các màn sẽ dùng địa chỉ mới.</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard: "default" | "number-pad";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboard}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={theme.primary}
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 56 },
  title: { color: theme.text, fontSize: 30, fontWeight: "800" },
  hint: { color: theme.textDim, fontSize: 15, marginTop: 8, marginBottom: 26, maxWidth: 760 },
  field: { marginBottom: 20, maxWidth: 620 },
  label: { color: theme.textDim, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
  },
  inputFocused: { borderColor: theme.primary, backgroundColor: theme.surface2 },
  preview: { color: theme.textMuted, fontSize: 14, marginTop: 4, marginBottom: 28 },
  actions: { flexDirection: "row", gap: 14 },
  btn: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: theme.surface2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  btnPrimary: { backgroundColor: theme.primaryDim },
  btnFocused: { borderColor: theme.text, transform: [{ scale: 1.05 }] },
  btnText: { color: theme.text, fontSize: 16, fontWeight: "700" },
  saved: { color: "#5ad17a", fontSize: 15, marginTop: 22 },
});
