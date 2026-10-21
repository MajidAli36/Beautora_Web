import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import {
  Card,
  Field,
  Muted,
  PrimaryButton,
  Screen,
} from "../src/components/ui";

export default function ProfileScreen() {
  const { profile, updateProfile, refresh, theme, loyalty, bookings } = useApp();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setEmail(profile.email);
  }, [profile.firstName, profile.lastName, profile.phone, profile.email]);

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    const digits = phone.replace(/\D/g, "");
    if (phone.trim() && digits.length < 10) {
      setErr("Phone must include at least 10 digits.");
      setSaving(false);
      return;
    }
    if (!firstName.trim()) {
      setErr("First name is required.");
      setSaving(false);
      return;
    }
    try {
      const next = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
      await updateProfile(next);
      await refresh(next.phone);
      setMsg(
        phone.trim()
          ? "Saved. Points & bookings will sync for this phone."
          : "Saved. Add a phone later to sync loyalty and bookings."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>My profile</Text>
      <Muted>
        App customers are separate from salon CRM. Your phone is the key for points and
        booking history.
      </Muted>

      {(loyalty || bookings.length > 0) && (
        <Card>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>POINTS</Text>
              <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 22 }}>
                {loyalty?.balance ?? 0}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
                BOOKINGS
              </Text>
              <Text style={{ color: theme.text, fontWeight: "900", fontSize: 22 }}>
                {bookings.length}
              </Text>
            </View>
          </View>
        </Card>
      )}

      <Field label="First name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last name" value={lastName} onChangeText={setLastName} />
      <Field
        label="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        hint="At least 10 digits for loyalty & bookings lookup"
      />
      <Field
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <PrimaryButton
        label={saving ? "Saving…" : "Save & sync"}
        disabled={saving}
        onPress={() => void save()}
      />
      {msg ? (
        <Text style={{ color: theme.success, fontWeight: "600" }}>{msg}</Text>
      ) : null}
      {err ? <Text style={{ color: theme.danger, fontWeight: "700" }}>{err}</Text> : null}
    </Screen>
  );
}
