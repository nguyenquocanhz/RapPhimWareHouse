import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { loadBackend } from "../lib/settings";
import { loadPremium } from "../lib/premium";
import { theme } from "../lib/theme";

/**
 * Neo ngan xep vao trang chu: du mo bang deep-link hay khoi phuc trang thai, cac man
 * phu (Premium, Truyen hinh...) van co trang chu ben duoi -> bam Back luon ve trang
 * chu, khong thoat app ra launcher.
 */
export const unstable_settings = { initialRouteName: "index" };

/**
 * Tang goc: nap dia chi backend da luu truoc khi ve giao dien (de API goi dung noi
 * ngay tu dau), roi dung Stack khong thanh tieu de - man hinh tivi tu ve tieu de.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadBackend(), loadPremium()]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: "fade",
        }}
      />
    </View>
  );
}
