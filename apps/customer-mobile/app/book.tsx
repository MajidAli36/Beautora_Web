import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { createBooking, fetchStaff } from "../src/api/client";
import type { StaffRow } from "../src/api/types";
import { useApp } from "../src/context/AppContext";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Muted,
  PrimaryButton,
  Screen,
  SectionHeader,
} from "../src/components/ui";
import {
  TIME_SLOTS,
  buildDayOptions,
  combineLocalDateTime,
  formatMoney,
} from "../src/lib/format";

export default function BookScreen() {
  const { ready, bundle, theme, profile, updateProfile, refresh } = useApp();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const days = useMemo(() => buildDayOptions(14), []);
  const [dateKey, setDateKey] = useState(days[0]?.key ?? "");
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [notes, setNotes] = useState("");
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const salons = bundle?.salons ?? [];
  const services = useMemo(
    () =>
      (bundle?.services ?? []).filter((s) => !orgId || s.organization_id === orgId),
    [bundle?.services, orgId]
  );
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedSalon = salons.find((s) => s.id === orgId);
  const selectedStaff = staff.find((s) => s.id === staffId);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone);
    setEmail(profile.email);
  }, [profile.firstName, profile.lastName, profile.phone, profile.email]);

  useEffect(() => {
    if (!bundle) return;
    if (!orgId && salons[0]?.id) setOrgId(salons[0].id);
  }, [bundle, orgId, salons]);

  useEffect(() => {
    if (!orgId) {
      setStaff([]);
      return;
    }
    void (async () => {
      setLoadingStaff(true);
      try {
        const res = await fetchStaff(orgId);
        setStaff(res.staff);
        setStaffId((prev) =>
          res.staff.some((s) => s.id === prev) ? prev : res.staff[0]?.id || ""
        );
        setLocalError(null);
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Could not load staff");
        setStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, [orgId]);

  useEffect(() => {
    if (!serviceId && services[0]?.id) setServiceId(services[0].id);
    if (serviceId && !services.some((s) => s.id === serviceId)) {
      setServiceId(services[0]?.id || "");
    }
  }, [services, serviceId]);

  if (!ready) return <LoadingState label="Preparing booking…" />;
  if (!bundle) return <ErrorState message="App not synced" onRetry={() => void refresh()} />;

  if (!bundle.config.settings.features.online_appointments) {
    return (
      <Screen>
        <EmptyState
          title="Booking unavailable"
          body="Online appointments are disabled for this customer app."
        />
      </Screen>
    );
  }

  async function submit() {
    setLocalError(null);
    if (!orgId || !serviceId || !staffId || !phone.trim() || !firstName.trim()) {
      setLocalError("Salon, service, stylist, first name, and phone are required.");
      setStep(3);
      return;
    }
    if (!dateKey || !timeSlot) {
      setLocalError("Pick a day and time.");
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      await updateProfile({ firstName, lastName, phone, email });
      const iso = combineLocalDateTime(dateKey, timeSlot);
      const res = await createBooking({
        organizationId: orgId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        scheduledAt: iso,
        staffId,
        serviceIds: [serviceId],
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        "Booking requested",
        res.bookingNumber
          ? `Booking #${res.bookingNumber} is in. Check My bookings anytime.`
          : "Your booking was created and tagged as Customer App.",
        [
          { text: "View bookings", onPress: () => router.replace("/bookings") },
          { text: "Done", style: "cancel" },
        ]
      );
      await refresh();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen bottomPad={48}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.primary }}>
        STEP {step} OF 3
      </Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text, letterSpacing: -0.3 }}>
        {step === 1 ? "Salon & service" : step === 2 ? "Stylist & time" : "Your details"}
      </Text>

      {bundle.config.settings.experience.bookingInstructions ? (
        <Card>
          <Muted>{bundle.config.settings.experience.bookingInstructions}</Muted>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              backgroundColor: n <= step ? theme.primary : theme.border,
            }}
          />
        ))}
      </View>

      {step === 1 ? (
        <>
          <SectionHeader title="Salon" />
          {!salons.length ? (
            <EmptyState title="No salons" body="This app has no assigned bookable salons." />
          ) : (
            <View style={{ gap: 8 }}>
              {salons.map((s) => (
                <Card
                  key={s.id}
                  onPress={() => setOrgId(s.id)}
                  style={{
                    borderColor: orgId === s.id ? theme.primary : theme.border,
                    borderWidth: orgId === s.id ? 2 : 1,
                  }}
                >
                  <Text style={{ fontWeight: "800", color: theme.text }}>{s.name}</Text>
                  <Muted>
                    {[s.city, s.address].filter(Boolean).join(" · ") || "Assigned salon"}
                  </Muted>
                </Card>
              ))}
            </View>
          )}

          <SectionHeader title="Service" />
          {!services.length ? (
            <Muted>No services for this salon.</Muted>
          ) : (
            <View style={{ gap: 8 }}>
              {services.map((s) => (
                <Card
                  key={s.id}
                  onPress={() => setServiceId(s.id)}
                  style={{
                    borderColor: serviceId === s.id ? theme.primary : theme.border,
                    borderWidth: serviceId === s.id ? 2 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "800", color: theme.text }}>{s.name}</Text>
                      <Muted>{s.duration_minutes} min</Muted>
                      {s.description ? <Muted>{s.description}</Muted> : null}
                    </View>
                    <Text style={{ fontWeight: "900", color: theme.primary }}>
                      {formatMoney(s.price)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <PrimaryButton
            label="Continue"
            disabled={!orgId || !serviceId}
            onPress={() => setStep(2)}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <SectionHeader title="Stylist" />
          {loadingStaff ? (
            <Muted>Loading stylists…</Muted>
          ) : !staff.length ? (
            <EmptyState
              title="No stylists online"
              body="No online-bookable staff for this salon right now."
            />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {staff.map((s) => (
                <Chip
                  key={s.id}
                  label={s.fullName}
                  sublabel={s.jobTitle || undefined}
                  active={staffId === s.id}
                  onPress={() => setStaffId(s.id)}
                />
              ))}
            </View>
          )}

          <SectionHeader title="Day" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {days.map((d) => (
              <Chip
                key={d.key}
                label={d.label}
                active={dateKey === d.key}
                onPress={() => setDateKey(d.key)}
              />
            ))}
          </View>

          <SectionHeader title="Time" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TIME_SLOTS.map((t) => (
              <Chip
                key={t}
                label={t}
                active={timeSlot === t}
                onPress={() => setTimeSlot(t)}
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Back"
                onPress={() => setStep(1)}
                style={{ backgroundColor: theme.muted }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <PrimaryButton
                label="Continue"
                disabled={!staffId || !dateKey || !timeSlot}
                onPress={() => setStep(3)}
              />
            </View>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Card>
            <Text style={{ fontWeight: "800", color: theme.text }}>Summary</Text>
            <Muted>
              {selectedSalon?.name || "Salon"}
              {"\n"}
              {selectedService?.name || "Service"}
              {selectedService ? ` · ${formatMoney(selectedService.price)}` : ""}
              {"\n"}
              {selectedStaff?.fullName || "Stylist"}
              {"\n"}
              {dateKey} at {timeSlot}
            </Muted>
          </Card>

          <Field label="First name" value={firstName} onChangeText={setFirstName} />
          <Field label="Last name" value={lastName} onChangeText={setLastName} />
          <Field
            label="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            hint="Used for bookings & loyalty sync"
          />
          <Field
            label="Email (optional)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Allergies, preferences…"
          />

          {localError ? (
            <Text style={{ color: theme.danger, fontWeight: "700" }}>{localError}</Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Back"
                onPress={() => setStep(2)}
                style={{ backgroundColor: theme.muted }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <PrimaryButton
                label={submitting ? "Booking…" : "Confirm booking"}
                disabled={submitting}
                onPress={() => void submit()}
              />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
