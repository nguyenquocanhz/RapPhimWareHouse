import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SUPPORT_INFO } from "../lib/config";
import { activatePremium, clearPremium, currentLicense, usePremium } from "../lib/premium";
import { theme } from "../lib/theme";
import { BackButton } from "../components/BackButton";
import { Focusable } from "../components/Focusable";

const BENEFITS = [
  { icon: "tv", text: "Truyền hình trực tiếp (kênh VN)" },
  { icon: "sparkles", text: "Mở khoá toàn bộ tính năng mới" },
  { icon: "heart", text: "Ủng hộ tác giả duy trì & cập nhật nguồn" },
];

export default function Premium() {
  const premium = usePremium();
  const lic = currentLicense();
  const [key, setKey] = useState("");
  const [focused, setFocused] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onActivate = async () => {
    const k = key.trim();
    if (!k) return;
    const result = await activatePremium(k);
    if (result) setMsg({ ok: true, text: "Kích hoạt Premium thành công. Cảm ơn bạn!" });
    else setMsg({ ok: false, text: "Mã không hợp lệ hoặc đã hết hạn." });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.backRow}>
        <BackButton />
      </View>

      <View style={styles.header}>
        <View style={styles.crown}>
          <Ionicons name="star" size={30} color="#fff" />
        </View>
        <View>
          <Text style={styles.title}>RapPhim Premium</Text>
          <Text style={[styles.status, premium ? styles.statusOn : styles.statusOff]}>
            {premium
              ? `Đang bật${lic?.name ? " · " + lic.name : ""}${
                  lic?.exp ? " · đến " + new Date(lic.exp * 1000).toLocaleDateString("vi-VN") : ""
                }`
              : "Bản miễn phí"}
          </Text>
        </View>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefitRow}>
            <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.primary} />
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      {premium ? (
        <Focusable onPress={clearPremium} style={(f) => [styles.btn, f && styles.btnFocused]}>
          <Text style={styles.btnText}>Gỡ Premium khỏi máy này</Text>
        </Focusable>
      ) : (
        <View style={styles.activateBox}>
          <Text style={styles.label}>Nhập mã kích hoạt</Text>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={key}
            onChangeText={(v) => {
              setKey(v);
              setMsg(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onActivate}
            returnKeyType="done"
            placeholder="RAPTV...."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={theme.primary}
          />
          <Focusable
            onPress={onActivate}
            hasTVPreferredFocus
            style={(f) => [styles.btn, styles.btnPrimary, f && styles.btnFocused]}
          >
            <Text style={styles.btnText}>Kích hoạt</Text>
          </Focusable>
          <Text style={styles.support}>{SUPPORT_INFO.note}</Text>
          <Text style={styles.support}>{SUPPORT_INFO.contact}</Text>
        </View>
      )}

      {msg ? (
        <Text style={[styles.msg, msg.ok ? styles.msgOk : styles.msgErr]}>{msg.text}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 56, maxWidth: 900 },
  backRow: { marginBottom: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 30 },
  crown: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: theme.text, fontSize: 32, fontWeight: "800" },
  status: { fontSize: 16, marginTop: 4 },
  statusOn: { color: "#5ad17a" },
  statusOff: { color: theme.textMuted },
  benefits: { gap: 14, marginBottom: 34 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  benefitText: { color: theme.textDim, fontSize: 18 },
  activateBox: { gap: 14, maxWidth: 620 },
  label: { color: theme.textDim, fontSize: 15 },
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
  btn: {
    alignSelf: "flex-start",
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
  support: { color: theme.textMuted, fontSize: 14, marginTop: 6 },
  msg: { fontSize: 16, marginTop: 22, fontWeight: "600" },
  msgOk: { color: "#5ad17a" },
  msgErr: { color: "#ff5a5a" },
});
