import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../src/context/AppContext";
import { LoadingState } from "../src/components/ui";

function RootStack() {
  const { ready, theme, bundle, needsOnboarding, isDark } = useApp();
  const title = bundle?.config.settings.branding.appName || "Beautora";
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const onOnboarding = segments[0] === "onboarding";
    if (needsOnboarding && !onOnboarding) {
      router.replace("/onboarding");
    } else if (!needsOnboarding && onOnboarding) {
      router.replace("/(tabs)");
    }
  }, [needsOnboarding, ready, router, segments]);

  if (!ready) return <LoadingState label="Opening your salon app…" />;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.primary,
          headerTitleStyle: { fontWeight: "700", color: theme.text },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="reels" options={{ title: "Reels", headerShown: false }} />
        <Stack.Screen name="bookings" options={{ title: "My bookings" }} />
        <Stack.Screen name="salons" options={{ title: "Our salons" }} />
        <Stack.Screen name="profile" options={{ title: "My profile" }} />
        <Stack.Screen name="book" options={{ title: `Book · ${title}` }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
