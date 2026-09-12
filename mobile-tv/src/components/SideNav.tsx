import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, TVFocusGuideView, View } from "react-native";

import { theme } from "../lib/theme";
import { Focusable } from "./Focusable";

/**
 * Thanh dieu huong doc ben trai kieu YouTube TV: thu gon chi con icon, khi mot muc
 * duoc chon (focus) thi bung rong ra kem nhan chu. La con cua mot hang flex nen luc
 * bung rong, phan noi dung ben phai tu co lai - khong can bao cho cha.
 *
 * Debounce luc blur de khong nhap nhay khi di chuyen giua cac muc; roi khoi thanh
 * nav (sang noi dung) thi thu gon lai.
 */
type NavKey = "search" | "home" | "tv" | "premium" | "settings";

const ITEMS: { key: NavKey; icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { key: "search", icon: "search", label: "Tìm kiếm", route: "/search" },
  { key: "home", icon: "home", label: "Trang chủ", route: "/" },
  { key: "tv", icon: "tv", label: "Truyền hình", route: "/tv" },
  { key: "premium", icon: "star", label: "Premium", route: "/premium" },
  { key: "settings", icon: "settings-sharp", label: "Cài đặt", route: "/settings" },
];

export const NAV_COLLAPSED = 92;
export const NAV_EXPANDED = 240;

export function SideNav({ active }: { active: NavKey }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focus = () => {
    if (timer.current) clearTimeout(timer.current);
    setExpanded(true);
  };
  const blur = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setExpanded(false), 80);
  };

  const go = (key: NavKey, route: string) => {
    if (key === active) return; // dang o day roi
    if (key === "home") router.replace(route as never);
    else router.push(route as never);
  };

  return (
    <View style={[styles.root, { width: expanded ? NAV_EXPANDED : NAV_COLLAPSED }]}>
      <View style={styles.brandRow}>
        <View style={styles.brandDot}>
          <Text style={styles.brandDotText}>R</Text>
        </View>
        {expanded ? (
          <Text style={styles.brandText} numberOfLines={1}>
            RapPhim <Text style={{ color: theme.primary }}>TV</Text>
          </Text>
        ) : null}
      </View>

      {/* Bay focus doc trong rail: len/xuong chi di giua cac muc, khong nhay ra
          noi dung (sang phai moi ra). Giong cach rail cua YouTube TV hoat dong. */}
      <TVFocusGuideView style={styles.items} trapFocusUp trapFocusDown autoFocus>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Focusable
              key={item.key}
              onFocus={focus}
              onBlur={blur}
              onPress={() => go(item.key, item.route)}
              style={styles.item}
            >
              {(f) => (
                <>
                  <View
                    style={[
                      styles.iconWrap,
                      isActive && styles.iconWrapActive,
                      f && styles.iconWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={f || isActive ? theme.text : theme.textDim}
                    />
                  </View>
                  {expanded ? (
                    <Text
                      style={[styles.label, (f || isActive) && styles.labelActive]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  ) : null}
                </>
              )}
            </Focusable>
          );
        })}
      </TVFocusGuideView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: "100%",
    backgroundColor: theme.surface,
    paddingTop: 30,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingLeft: 26,
    marginBottom: 26,
  },
  brandDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandDotText: { color: theme.text, fontSize: 22, fontWeight: "900" },
  brandText: { color: theme.text, fontSize: 20, fontWeight: "800", marginLeft: 14 },
  items: { gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingLeft: 26,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconWrapActive: { backgroundColor: theme.surface2 },
  iconWrapFocused: { backgroundColor: theme.primary, borderColor: theme.text },
  label: { color: theme.textDim, fontSize: 16, fontWeight: "600", marginLeft: 16 },
  labelActive: { color: theme.text },
});
