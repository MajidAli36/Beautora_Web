import { Link, router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useApp } from "../../src/context/AppContext";
import {
  Card,
  ErrorState,
  HeroBanner,
  LoadingState,
  Muted,
  OutlineButton,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui";
import { formatMoney } from "../../src/lib/format";

export default function HomeScreen() {
  const { ready, syncing, error, bundle, theme, loyalty, refresh, profile, bookings } =
    useApp();

  if (!ready) return <LoadingState label="Opening your salon app…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return <ErrorState message="No app data" onRetry={() => void refresh()} />;

  const b = bundle.config.settings.branding;
  const x = bundle.config.settings.experience;
  const f = bundle.config.settings.features;
  const upcoming = bookings
    .filter((row) => {
      const s = (row.status || "").toUpperCase();
      return s === "SCHEDULED" || s === "CONFIRMED" || s === "PENDING";
    })
    .slice(0, 1)[0];
  const featuredDeal = bundle.deals[0];
  const featuredReel = bundle.reels[0];

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <HeroBanner
        brand={b.brandName || b.salonDisplayName || "Beautora"}
        title={b.appName}
        subtitle={x.welcomeMessage || b.shortDescription || undefined}
      />

      {(x.homepageHeadline || x.homepageDescription) && (
        <Card>
          <Text style={{ fontWeight: "800", fontSize: 17, color: theme.text }}>
            {x.homepageHeadline || "Welcome"}
          </Text>
          {x.homepageDescription ? <Muted>{x.homepageDescription}</Muted> : null}
        </Card>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {f.online_appointments ? (
          <View style={{ flex: 1 }}>
            <Link href="/book" asChild>
              <PrimaryButton label="Book now" />
            </Link>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Link href="/reels" asChild>
            <OutlineButton label="Watch reels" />
          </Link>
        </View>
      </View>

      {loyalty ? (
        <Card onPress={() => router.push("/(tabs)/rewards")}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: `${theme.primary}14`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 22, fontWeight: "900" }}>
                {loyalty.balance}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
                YOUR POINTS
              </Text>
              <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16, marginTop: 2 }}>
                {profile.phone ? "Tap to view rewards" : "Add phone to unlock points"}
              </Text>
              {loyalty.note ? <Muted>{loyalty.note}</Muted> : null}
            </View>
          </View>
        </Card>
      ) : null}

      {upcoming ? (
        <Card onPress={() => router.push("/bookings")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontWeight: "800", color: theme.text }}>Next visit</Text>
            <StatusPill label={upcoming.status} tone="ok" />
          </View>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "700", marginTop: 4 }}>
            {new Date(upcoming.scheduled_at).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          {upcoming.booking_number ? (
            <Muted>Booking #{upcoming.booking_number}</Muted>
          ) : null}
        </Card>
      ) : null}

      {featuredDeal ? (
        <>
          <SectionHeader
            title="Featured deal"
            actionLabel="All"
            onAction={() => router.push("/(tabs)/shop")}
          />
          <Card onPress={() => router.push("/(tabs)/shop")}>
            {featuredDeal.imageUrl ? (
              <Image
                source={{ uri: featuredDeal.imageUrl }}
                style={{ width: "100%", height: 150, borderRadius: 14, marginBottom: 10 }}
              />
            ) : null}
            <Text style={{ fontWeight: "800", fontSize: 17, color: theme.text }}>
              {featuredDeal.title}
            </Text>
            {featuredDeal.discountPercent != null ? (
              <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 20 }}>
                {featuredDeal.discountPercent}% off
              </Text>
            ) : featuredDeal.discountAmount != null ? (
              <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 20 }}>
                Save {formatMoney(featuredDeal.discountAmount)}
              </Text>
            ) : null}
            {featuredDeal.description ? <Muted>{featuredDeal.description}</Muted> : null}
          </Card>
        </>
      ) : null}

      {featuredReel ? (
        <>
          <SectionHeader
            title="From the salon"
            actionLabel="Reels"
            onAction={() => router.push("/reels")}
          />
          <Pressable onPress={() => router.push("/reels")}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <Image
                source={{
                  uri:
                    featuredReel.posterUrl ||
                    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80",
                }}
                style={{ width: "100%", height: 180 }}
              />
              <View style={{ padding: 14, gap: 4 }}>
                <Text style={{ fontWeight: "800", color: theme.text }}>
                  {featuredReel.title || "Salon reel"}
                </Text>
                {featuredReel.caption ? <Muted>{featuredReel.caption}</Muted> : null}
              </View>
            </Card>
          </Pressable>
        </>
      ) : null}

      <SectionHeader title="Quick links" />
      <View style={{ gap: 8 }}>
        <Link href="/salons" asChild>
          <OutlineButton label={`${bundle.salons.length || 0} salon locations`} />
        </Link>
        {f.product_catalog || bundle.deals.length ? (
          <Link href="/(tabs)/shop" asChild>
            <OutlineButton
              label={
                f.product_catalog
                  ? `${bundle.products.length} products · ${bundle.deals.length} deals`
                  : `${bundle.deals.length} deals`
              }
            />
          </Link>
        ) : null}
        {!profile.phone ? (
          <Link href="/profile" asChild>
            <OutlineButton label="Save your phone for bookings & points" />
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}
