import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { theme } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="movie/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="watch" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
