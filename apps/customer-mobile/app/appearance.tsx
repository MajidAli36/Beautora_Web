import { Pressable, Text, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import { Muted, Screen } from "../src/components/ui";
import { THEME_PRESETS, type ThemePresetId } from "../src/theme/presets";
import { radius, space } from "../src/theme";

export default function AppearanceScreen() {
  const { theme, preferences, setThemeId, bundle } = useApp();
  const brandPrimary = bundle?.config.settings.branding.primaryColor;
  const brandAccent = bundle?.config.settings.branding.accentColor;

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>Appearance</Text>
      <Muted>Choose how the customer app looks on your phone.</Muted>

      <View style={{ gap: 12, marginTop: 8 }}>
        {THEME_PRESETS.map((p) => {
          const primary = p.id === "salon" ? brandPrimary || p.primary : p.primary;
          const accent = p.id === "salon" ? brandAccent || p.accent : p.accent;
          const active = preferences.themeId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => void setThemeId(p.id as ThemePresetId, true)}
              style={{
                borderRadius: radius.lg,
                borderWidth: active ? 2 : 1,
                borderColor: active ? primary : theme.border,
                backgroundColor: theme.card,
                padding: space.md,
                flexDirection: "row",
                gap: 14,
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", gap: 6 }}>
                <View
                  style={{ width: 26, height: 40, borderRadius: 10, backgroundColor: primary }}
                />
                <View
                  style={{
                    width: 26,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: p.bg,
                    borderWidth: 1,
                    borderColor: p.border,
                  }}
                />
                <View
                  style={{ width: 26, height: 40, borderRadius: 10, backgroundColor: accent }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: theme.text }}>{p.name}</Text>
                <Muted>{p.description}</Muted>
              </View>
              {active ? (
                <Text style={{ color: primary, fontWeight: "900" }}>✓</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
