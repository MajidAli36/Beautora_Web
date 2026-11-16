import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Share,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useApp } from "../context/AppContext";
import { fetchLoyaltyQrToken } from "../api/client";
import { radius, space } from "../theme";

type LoyaltyCardProps = {
  style?: ViewStyle;
  /** Compact strip for home; full card includes QR */
  compact?: boolean;
  onOpenRewards?: () => void;
};

function qrImageUrl(data: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    data
  )}`;
}

/**
 * Virtual membership card — shows points and a salon-scannable QR
 * used to redeem / reduce points at the desk.
 */
export function LoyaltyCard({ style, compact, onOpenRewards }: LoyaltyCardProps) {
  const { theme, loyalty, profile, bundle } = useApp();
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const brand =
    bundle?.config.settings.branding.appName ||
    bundle?.config.settings.branding.brandName ||
    "Beautora";
  const memberName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Member";
  const balance = loyalty?.balance ?? 0;

  const loadQr = useCallback(async () => {
    if (!profile.phone.trim()) {
      setQrPayload(null);
      setCode(null);
      return;
    }
    setLoadingQr(true);
    setQrError(null);
    try {
      const res = await fetchLoyaltyQrToken(profile.phone.trim());
      setQrPayload(res.qrPayload);
      setCode(res.code);
      setExpiresAt(res.expiresAt);
    } catch (e) {
      // Do not invent a fake QR — salon redeem only accepts signed tokens
      setQrPayload(null);
      setCode(null);
      setExpiresAt(null);
      setQrError(
        e instanceof Error
          ? e.message
          : "Could not load redeem QR. Pull to refresh or try again."
      );
    } finally {
      setLoadingQr(false);
    }
  }, [profile.phone]);

  useEffect(() => {
    if (!compact && profile.phone.trim()) {
      void loadQr();
    }
  }, [compact, loadQr, profile.phone]);

  if (compact) {
    return (
      <Pressable
        onPress={onOpenRewards}
        style={({ pressed }) => [
          {
            borderRadius: radius.lg,
            padding: space.md,
            backgroundColor: theme.primary,
            opacity: pressed ? 0.92 : 1,
          },
          style,
        ]}
      >
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800" }}>
          VIRTUAL CARD
        </Text>
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{memberName}</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 2, fontSize: 13 }}>
              {profile.phone || "Add phone to unlock"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>{balance}</Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700" }}>
              POINTS
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius.xl,
          overflow: "hidden",
          backgroundColor: theme.primary,
          padding: space.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -20,
          bottom: -30,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />

      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800" }}>
        {brand.toUpperCase()} · MEMBER CARD
      </Text>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6 }}>
        {memberName}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
        {profile.phone || "Save your phone to sync points"}
      </Text>

      <View
        style={{
          marginTop: 18,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800" }}>
            AVAILABLE POINTS
          </Text>
          <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900", marginTop: 2 }}>
            {balance}
          </Text>
        </View>
        {loyalty?.note ? (
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 11,
              maxWidth: 140,
              textAlign: "right",
              lineHeight: 15,
            }}
          >
            {loyalty.note}
          </Text>
        ) : null}
      </View>

      {profile.phone ? (
        <View
          style={{
            marginTop: 18,
            backgroundColor: "#fff",
            borderRadius: radius.lg,
            padding: space.md,
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 13 }}>
            Show QR to redeem points
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 4 }}>
            Salon staff scan this code to reduce points at checkout
          </Text>

          <View style={{ marginTop: 14, minHeight: 180, alignItems: "center", justifyContent: "center" }}>
            {loadingQr ? (
              <ActivityIndicator color={theme.primary} />
            ) : qrPayload ? (
              <Image
                source={{ uri: qrImageUrl(qrPayload, 200) }}
                style={{ width: 180, height: 180, borderRadius: 12 }}
                accessibilityLabel="Loyalty redeem QR code"
              />
            ) : (
              <Text style={{ color: theme.muted }}>QR unavailable</Text>
            )}
          </View>

          {code ? (
            <Text style={{ color: theme.text, fontWeight: "800", letterSpacing: 2, marginTop: 4 }}>
              {code}
            </Text>
          ) : null}
          {expiresAt ? (
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 6 }}>
              Expires {new Date(expiresAt).toLocaleTimeString()}
            </Text>
          ) : null}
          {qrError ? (
            <Text style={{ color: theme.danger, fontSize: 11, marginTop: 6, textAlign: "center" }}>
              {qrError}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14, width: "100%" }}>
            <Pressable
              onPress={() => void loadQr()}
              style={{
                flex: 1,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: theme.border,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: "800" }}>Refresh QR</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!qrPayload) return;
                void Share.share({
                  message: `Beautora redeem code${code ? `: ${code}` : ""}\n${qrPayload}`,
                });
              }}
              style={{
                flex: 1,
                borderRadius: radius.md,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Share</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={{
            marginTop: 16,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: radius.md,
            padding: space.md,
          }}
        >
          <Text style={{ color: "#fff", lineHeight: 20 }}>
            Add your phone in Profile to generate a redeem QR linked to your points.
          </Text>
        </View>
      )}
    </View>
  );
}
