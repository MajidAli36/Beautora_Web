import { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { useApp } from "../../src/context/AppContext";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { formatMoney } from "../../src/lib/format";

type ShopTab = "deals" | "products";

export default function ShopScreen() {
  const { ready, syncing, error, bundle, theme, refresh } = useApp();
  const showProducts = Boolean(bundle?.config.settings.features.product_catalog);
  const [tab, setTab] = useState<ShopTab>("deals");

  const activeTab = useMemo<ShopTab>(() => {
    if (!showProducts) return "deals";
    return tab;
  }, [showProducts, tab]);

  if (!ready) return <LoadingState label="Loading shop…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return null;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: theme.text, letterSpacing: -0.3 }}>
        Shop
      </Text>
      <Muted>Deals and products published from your salon’s customer app.</Muted>

      {showProducts ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip
            label={`Deals (${bundle.deals.length})`}
            active={activeTab === "deals"}
            onPress={() => setTab("deals")}
          />
          <Chip
            label={`Products (${bundle.products.length})`}
            active={activeTab === "products"}
            onPress={() => setTab("products")}
          />
        </View>
      ) : (
        <SectionHeader title={`Deals (${bundle.deals.length})`} />
      )}

      {activeTab === "deals" ? (
        bundle.deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            body="When your salon publishes a deal in the App dashboard, it shows up here."
          />
        ) : (
          bundle.deals.map((d) => (
            <Card key={d.id} style={{ padding: 0, overflow: "hidden" }}>
              {d.imageUrl ? (
                <Image source={{ uri: d.imageUrl }} style={{ width: "100%", height: 160 }} />
              ) : (
                <View
                  style={{
                    height: 88,
                    backgroundColor: `${theme.primary}12`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 18 }}>
                    DEAL
                  </Text>
                </View>
              )}
              <View style={{ padding: 14, gap: 6 }}>
                <Text style={{ fontWeight: "800", fontSize: 17, color: theme.text }}>
                  {d.title}
                </Text>
                {d.discountPercent != null ? (
                  <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 22 }}>
                    {d.discountPercent}% off
                  </Text>
                ) : d.discountAmount != null ? (
                  <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 22 }}>
                    Save {formatMoney(d.discountAmount)}
                  </Text>
                ) : null}
                {d.description ? <Muted>{d.description}</Muted> : null}
                {d.endsAt ? (
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                    Ends {new Date(d.endsAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
            </Card>
          ))
        )
      ) : bundle.products.length === 0 ? (
        <EmptyState
          title="No products listed"
          body="App products are separate from POS inventory. Publish them from the salon App dashboard."
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {bundle.products.map((p) => (
            <Card
              key={p.id}
              style={{
                width: "48%",
                flexGrow: 1,
                minWidth: "46%",
                padding: 0,
                overflow: "hidden",
              }}
            >
              {p.imageUrl ? (
                <Image source={{ uri: p.imageUrl }} style={{ width: "100%", height: 120 }} />
              ) : (
                <View
                  style={{
                    height: 88,
                    backgroundColor: theme.bgSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.muted, fontWeight: "700" }}>Product</Text>
                </View>
              )}
              <View style={{ padding: 12, gap: 4 }}>
                <Text
                  style={{ fontWeight: "800", color: theme.text }}
                  numberOfLines={2}
                >
                  {p.name || p.title}
                </Text>
                <Text style={{ color: theme.primary, fontWeight: "900", fontSize: 16 }}>
                  {formatMoney(p.retail_price ?? p.price)}
                </Text>
                {p.description ? (
                  <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={2}>
                    {p.description}
                  </Text>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
