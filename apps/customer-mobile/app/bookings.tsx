import { Link, router } from "expo-router";
import { Text, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import {
  Card,
  EmptyState,
  Muted,
  OutlineButton,
  PrimaryButton,
  Screen,
  StatusPill,
} from "../src/components/ui";
import { bookingStatusMeta, formatDateTime } from "../src/lib/format";

export default function BookingsScreen() {
  const { bookings, profile, theme, syncing, refresh, bundle } = useApp();

  const salonName = (orgId: string) =>
    bundle?.salons.find((s) => s.id === orgId)?.name || "Salon";

  const upcoming = bookings.filter((b) => {
    const s = (b.status || "").toUpperCase();
    return (
      (s === "SCHEDULED" || s === "CONFIRMED" || s === "PENDING") &&
      new Date(b.scheduled_at).getTime() >= Date.now() - 60 * 60 * 1000
    );
  });
  const past = bookings.filter((b) => !upcoming.some((u) => u.id === b.id));

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>My bookings</Text>

      {!profile.phone ? (
        <EmptyState
          title="Add your phone"
          body="Bookings are looked up by the phone number saved in your profile."
          action={
            <Link href="/profile" asChild>
              <PrimaryButton label="Open profile" />
            </Link>
          }
        />
      ) : (
        <Muted>Showing visits linked to {profile.phone}</Muted>
      )}

      {profile.phone && bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="Book a visit and it will appear here after sync."
          action={
            <Link href="/book" asChild>
              <PrimaryButton label="Book now" />
            </Link>
          }
        />
      ) : null}

      {upcoming.length ? (
        <>
          <Text style={{ fontWeight: "800", color: theme.text, marginTop: 6 }}>Upcoming</Text>
          {upcoming.map((b) => {
            const meta = bookingStatusMeta(b.status);
            return (
              <Card key={b.id}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 16, color: theme.text }}>
                      {formatDateTime(b.scheduled_at)}
                    </Text>
                    <Muted>{salonName(b.organization_id)}</Muted>
                  </View>
                  <StatusPill label={meta.label} tone={meta.tone} />
                </View>
                <Muted>
                  {b.duration_minutes} min
                  {b.booking_number ? ` · #${b.booking_number}` : ""}
                  {b.source ? ` · ${b.source}` : ""}
                </Muted>
                {b.notes ? <Muted>{b.notes}</Muted> : null}
              </Card>
            );
          })}
        </>
      ) : null}

      {past.length ? (
        <>
          <Text style={{ fontWeight: "800", color: theme.text, marginTop: 6 }}>History</Text>
          {past.map((b) => {
            const meta = bookingStatusMeta(b.status);
            return (
              <Card key={b.id}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: theme.text }}>
                      {formatDateTime(b.scheduled_at)}
                    </Text>
                    <Muted>{salonName(b.organization_id)}</Muted>
                  </View>
                  <StatusPill label={meta.label} tone={meta.tone} />
                </View>
                {b.booking_number ? <Muted>#{b.booking_number}</Muted> : null}
              </Card>
            );
          })}
        </>
      ) : null}

      {profile.phone && bookings.length > 0 ? (
        <OutlineButton label="Book another visit" onPress={() => router.push("/book")} />
      ) : null}
    </Screen>
  );
}
