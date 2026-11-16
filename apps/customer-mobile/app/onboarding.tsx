import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import {
  Field,
  Muted,
  PrimaryButton,
  Screen,
} from "../src/components/ui";
import { THEME_PRESETS, type ThemePresetId } from "../src/theme/presets";
import { radius, space } from "../src/theme";

type Step = "profile" | "theme";

export default function OnboardingScreen() {
  const {
    theme,
    profile,
    preferences,
    updateProfile,
    setThemeId,
    completeOnboarding,
    refresh,
    bundle,
  } = useApp();

  const startStep: Step =
    preferences.onboardingComplete && !preferences.themeSelected ? "theme" : "profile";
  const [step, setStep] = useState<Step>(startStep);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [picked, setPicked] = useState<ThemePresetId>(preferences.themeId || "salon");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.onboardingComplete && !preferences.themeSelected) {
      setStep("theme");
    }
  }, [preferences.onboardingComplete, preferences.themeSelected]);

  const salonName =
    bundle?.config.settings.branding.appName ||
    bundle?.config.settings.branding.salonDisplayName ||
    "your salon";

  const brandPrimary = bundle?.config.settings.branding.primaryColor;
  const brandAccent = bundle?.config.settings.branding.accentColor;

  const previewPresets = useMemo(
    () =>
      THEME_PRESETS.map((p) =>
        p.id === "salon"
          ? {
              ...p,
              primary: brandPrimary || p.primary,
              accent: brandAccent || p.accent,
            }
          : p
      ),
    [brandAccent, brandPrimary]
  );

  async function saveProfileStep() {
    setErr(null);
    if (!firstName.trim()) {
      setErr("First name is required.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (!phone.trim() || digits.length < 10) {
      setErr("Phone with at least 10 digits is required for points & bookings.");
      return;
    }
    setBusy(true);
    try {
      const next = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
      await updateProfile(next);
      await completeOnboarding();
      await refresh(next.phone);
      setStep("theme");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function finishTheme() {
    setBusy(true);
    setErr(null);
    try {
      await setThemeId(picked, true);
      // Root layout redirects to tabs once themeSelected is saved (avoids bounce race).
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save theme");
    } finally {
      setBusy(false);
    }
  }

  if (step === "theme") {
    return (
      <Screen>
        <Text style={{ fontSize: 26, fontWeight: "900", color: theme.text, letterSpacing: -0.4 }}>
          Choose your look
        </Text>
        <Muted>
          Pick a theme for {salonName}. You can change this anytime from More → Appearance.
        </Muted>

        <View style={{ gap: 12, marginTop: 8 }}>
          {previewPresets.map((p) => {
            const active = picked === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPicked(p.id)}
                style={{
                  borderRadius: radius.lg,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? p.primary : theme.border,
                  backgroundColor: theme.card,
                  padding: space.md,
                  flexDirection: "row",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View
                    style={{
                      width: 28,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: p.primary,
                    }}
                  />
                  <View
                    style={{
                      width: 28,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: p.bg,
                      borderWidth: 1,
                      borderColor: p.border,
                    }}
                  />
                  <View
                    style={{
                      width: 28,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: p.accent,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: theme.text }}>
                    {p.name}
                  </Text>
                  <Muted>{p.description}</Muted>
                </View>
                {active ? (
                  <Text style={{ color: p.primary, fontWeight: "900" }}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={busy ? "Saving…" : "Continue to app"}
          disabled={busy}
          onPress={() => void finishTheme()}
        />
        {err ? (
          <Text style={{ color: theme.danger, fontWeight: "700" }}>{err}</Text>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: "900", color: theme.text, letterSpacing: -0.4 }}>
        Welcome
      </Text>
      <Muted>
        Create your profile for {salonName}. Your phone links bookings, points, and your virtual
        card.
      </Muted>

      <Field label="First name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last name" value={lastName} onChangeText={setLastName} />
      <Field
        label="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        hint="Required · at least 10 digits"
      />
      <Field
        label="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <PrimaryButton
        label={busy ? "Saving…" : "Continue"}
        disabled={busy}
        onPress={() => void saveProfileStep()}
      />
      {err ? <Text style={{ color: theme.danger, fontWeight: "700" }}>{err}</Text> : null}
    </Screen>
  );
}
