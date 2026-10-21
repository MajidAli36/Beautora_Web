import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../src/context/AppContext";

function RootStack() {
  const { theme, bundle } = useApp();
  const title = bundle?.config.settings.branding.appName || "Beautora";

  return (
    <>
      <StatusBar style="dark" />
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
