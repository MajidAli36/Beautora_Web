import { router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { useApp } from "../../src/context/AppContext";
import {
  Avatar,
  Card,
  ErrorState,
  LoadingState,
  MenuRow,
  Muted,
  Screen,
} from "../../src/components/ui";
import { initials } from "../../src/lib/format";

export default function MoreScreen() {
  const { ready, syncing, error, bundle, theme, profile, bookings, loyalty, refresh, apiMeta } =
    useApp();

  if (!ready) return <LoadingState />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return null;

  const b = bundle.config.settings.branding;
  const f = bundle.config.settings.features;
  const wa = b.whatsappNumber?.replace(/[^\d]/g, "");
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Guest";

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Avatar label={initials(displayName)} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text }}>
              {displayName}
            </Text>
            <Muted>
              {profile.phone || "Add your phone to sync bookings & points"}
            </Muted>
            {loyalty ? (
              <Text style={{ color: theme.primary, fontWeight: "800", marginTop: 4 }}>
                {loyalty.balance} points
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <MenuRow
          title="My profile"
          subtitle="Name, phone, email"
          onPress={() => router.push("/profile")}
        />
        <MenuRow
          title="My bookings"
          subtitle={
            profile.phone
              ? `${bookings.length} on file`
              : "Needs phone number"
          }
          onPress={() => router.push("/bookings")}
        />
        {f.online_appointments ? (
          <MenuRow
            title="Book appointment"
            subtitle="Pick salon, service & stylist"
            onPress={() => router.push("/book")}
          />
        ) : null}
        <MenuRow
          title="Our salons"
          subtitle={`${bundle.salons.length} location(s)`}
          onPress={() => router.push("/salons")}
        />
        <MenuRow
          title="Reels"
          subtitle={`${bundle.reels.length} clip(s)`}
          onPress={() => router.push("/reels")}
        />
        {(f.loyalty || f.leaderboard) && (
          <MenuRow
            title="Rewards"
            subtitle="Points & leaderboard"
            onPress={() => router.push("/(tabs)/rewards")}
          />
        )}
        <MenuRow
          title="Shop"
          subtitle={`${bundle.deals.length} deals · ${bundle.products.length} products`}
          onPress={() => router.push("/(tabs)/shop")}
        />
        {wa ? (
          <MenuRow
            title="WhatsApp salon"
            subtitle={b.whatsappNumber}
            onPress={() => void Linking.openURL(`https://wa.me/${wa}`)}
          />
        ) : null}
        {b.supportPhone ? (
          <MenuRow
            title="Call support"
            subtitle={b.supportPhone}
            onPress={() => void Linking.openURL(`tel:${b.supportPhone}`)}
          />
        ) : null}
      </View>

      <Card>
        <Text style={{ fontWeight: "800", color: theme.text }}>App sync</Text>
        <Muted>
          {b.appName}
          {"\n"}
          Status: {bundle.config.status}
          {"\n"}
          Slug: {apiMeta.slug || "—"}
          {"\n"}
          API: {apiMeta.baseUrl}
          {"\n"}
          Last sync:{" "}
          {bundle.syncedAt ? new Date(bundle.syncedAt).toLocaleString() : "—"}
        </Muted>
        <Pressable onPress={() => void refresh()} style={{ marginTop: 10 }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>
            {syncing ? "Syncing…" : "Tap to sync now"}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
