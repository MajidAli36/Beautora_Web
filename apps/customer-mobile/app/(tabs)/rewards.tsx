import { Image, Text, View } from "react-native";
import { Link } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  OutlineButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { LoyaltyCard } from "../../src/components/LoyaltyCard";
import { initials } from "../../src/lib/format";

export default function RewardsScreen() {
  const { ready, syncing, error, bundle, theme, loyalty, profile, refresh } = useApp();

  if (!ready) return <LoadingState label="Loading rewards…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return null;

  const f = bundle.config.settings.features;
  const lb = bundle.leaderboard;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: theme.text, letterSpacing: -0.3 }}>
        Rewards
      </Text>
      <Muted>
        Virtual card, points, and leaderboard sync from the salon App dashboard. Show your QR at
        the desk to redeem.
      </Muted>

      {f.loyalty ? <LoyaltyCard /> : null}

      {f.loyalty && loyalty?.rulesText ? (
        <>
          <SectionHeader title="How to get points" />
          <Card>
            <Text
              style={{
                color: theme.text,
                fontSize: 14,
                lineHeight: 22,
                fontWeight: "500",
              }}
            >
              {loyalty.rulesText}
            </Text>
          </Card>
        </>
      ) : null}

      {f.loyalty && loyalty?.pointTypes?.length ? (
        <>
          <SectionHeader title="Point types" />
          {loyalty.pointTypes.map((t) => (
            <Card key={t.id}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    marginTop: 4,
                    backgroundColor: t.color || theme.primary,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>
                    {t.name}
                  </Text>
                  {t.earnHint ? <Muted>{t.earnHint}</Muted> : null}
                  {t.description ? <Muted>{t.description}</Muted> : null}
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {f.loyalty ? (
        <>
          <SectionHeader title="Points history" />
          {!profile.phone ? (
            <EmptyState
              title="Phone required"
              body="Your ledger is keyed by phone number."
              action={
                <Link href="/profile" asChild>
                  <OutlineButton label="Add phone" />
                </Link>
              }
            />
          ) : !loyalty?.history?.length ? (
            <EmptyState
              title="No points yet"
              body="Complete a booking or purchase to start earning."
            />
          ) : (
            loyalty.history.slice(0, 30).map((h) => (
              <Card key={h.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{h.reason}</Text>
                    <Muted>
                      {h.pointTypeName ? `${h.pointTypeName} · ` : ""}
                      {new Date(h.createdAt).toLocaleString()}
                    </Muted>
                  </View>
                  <Text
                    style={{
                      fontWeight: "900",
                      fontSize: 16,
                      color: h.deltaPoints >= 0 ? theme.success : theme.danger,
                    }}
                  >
                    {h.deltaPoints > 0 ? "+" : ""}
                    {h.deltaPoints}
                  </Text>
                </View>
                <Muted>Balance after: {h.balanceAfter}</Muted>
              </Card>
            ))
          )}
        </>
      ) : null}

      {f.leaderboard && lb ? (
        <>
          <SectionHeader title={lb.title || "Leaderboard"} />
          <Card>
            {lb.note ? <Muted>{lb.note}</Muted> : null}
            <Muted>
              Metric: {lb.metric} · last {lb.windowDays} days
            </Muted>

            {lb.tiers?.length ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ fontWeight: "800", color: theme.text }}>Reward tiers</Text>
                {lb.tiers.map((t) => (
                  <View
                    key={t.rank}
                    style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
                  >
                    {t.rewardImageUrl ? (
                      <Image
                        source={{ uri: t.rewardImageUrl }}
                        style={{ width: 56, height: 56, borderRadius: 14 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          backgroundColor: `${theme.primary}14`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontWeight: "900", color: theme.primary }}>#{t.rank}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: theme.text }}>{t.title}</Text>
                      <Muted>
                        {t.rewardKind === "custom"
                          ? t.customRewardLabel || t.description
                          : t.description || t.rewardKind}
                      </Muted>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={{ fontWeight: "800", color: theme.text }}>Rankings</Text>
              {lb.rows.length === 0 ? (
                <Muted>No rankings published yet.</Muted>
              ) : (
                lb.rows.map((r) => (
                  <View
                    key={`${r.rank}-${r.displayName}`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <Avatar
                      label={String(r.rank)}
                      size={36}
                      color={r.rank <= 3 ? theme.accent : theme.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: "700" }}>
                        {r.displayName || initials(r.displayName)}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "900", color: theme.text }}>{r.score}</Text>
                  </View>
                ))
              )}
            </View>
          </Card>
        </>
      ) : null}

      {!f.loyalty && !f.leaderboard ? (
        <EmptyState
          title="Rewards unavailable"
          body="Loyalty and leaderboard are turned off for this customer app."
        />
      ) : null}
    </Screen>
  );
}
