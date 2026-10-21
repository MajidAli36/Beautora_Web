import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../src/context/AppContext";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  OutlineButton,
  PrimaryButton,
  Screen,
} from "../src/components/ui";

export default function SalonsScreen() {
  const { ready, syncing, error, bundle, theme, refresh } = useApp();

  if (!ready) return <LoadingState label="Loading salons…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return null;

  const canBook = Boolean(bundle.config.settings.features.online_appointments);

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>Our salons</Text>
      <Muted>Locations assigned to this published customer app.</Muted>

      {bundle.salons.length === 0 ? (
        <EmptyState
          title="No salons yet"
          body="Ask the salon to assign locations to this customer app."
        />
      ) : (
        bundle.salons.map((s) => (
          <Card key={s.id}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${theme.primary}14`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: "900" }}>
                {s.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontWeight: "800", fontSize: 18, color: theme.text }}>{s.name}</Text>
            {s.tagline ? <Muted>{s.tagline}</Muted> : null}
            {s.city ? <Muted>{s.city}</Muted> : null}
            {s.address ? <Muted>{s.address}</Muted> : null}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {canBook ? (
                <View style={{ flexGrow: 1, minWidth: 120 }}>
                  <PrimaryButton label="Book here" onPress={() => router.push("/book")} />
                </View>
              ) : null}
              {s.phone ? (
                <View style={{ flexGrow: 1, minWidth: 120 }}>
                  <OutlineButton
                    label="Call"
                    onPress={() => void Linking.openURL(`tel:${s.phone}`)}
                  />
                </View>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
