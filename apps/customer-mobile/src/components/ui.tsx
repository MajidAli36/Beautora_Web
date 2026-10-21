import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useApp } from "../context/AppContext";
import { radius, space } from "../theme";
import type { BookingStatusTone } from "../lib/format";

export function Screen({
  children,
  onRefresh,
  refreshing,
  padded = true,
  bottomPad = 40,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  padded?: boolean;
  bottomPad?: number;
}) {
  const { theme } = useApp();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={[
        styles.page,
        padded && { padding: space.lg },
        { paddingBottom: bottomPad },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>{children}</View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { theme } = useApp();
  return (
    <Center>
      <ActivityIndicator color={theme.primary} size="large" />
      {label ? (
        <Text style={{ color: theme.muted, marginTop: 12, fontSize: 14 }}>{label}</Text>
      ) : null}
    </Center>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { theme, apiMeta } = useApp();
  return (
    <Center>
      <View
        style={[
          styles.errorBadge,
          { backgroundColor: `${theme.danger}14`, borderColor: `${theme.danger}33` },
        ]}
      >
        <Text style={{ color: theme.danger, fontWeight: "800", fontSize: 13 }}>SYNC ERROR</Text>
      </View>
      <Text style={[styles.errorTitle, { color: theme.text }]}>Cannot reach your salon app</Text>
      <Text style={{ color: theme.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
        {message}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 14 }}>
        API {apiMeta.baseUrl}
        {"\n"}
        Slug {apiMeta.slug || "(missing)"}
      </Text>
      {onRetry ? (
        <PrimaryButton label="Retry sync" onPress={onRetry} style={{ marginTop: 18, minWidth: 160 }} />
      ) : null}
    </Center>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const { theme } = useApp();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 28 }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: theme.text, textAlign: "center" }}>
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            color: theme.muted,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 20,
            fontSize: 14,
          }}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 16, width: "100%" }}>{action}</View> : null}
    </Card>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { theme } = useApp();
  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.text,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      {body}
    </Pressable>
  );
}

export function HeroBanner({
  brand,
  title,
  subtitle,
}: {
  brand: string;
  title: string;
  subtitle?: string;
}) {
  const { theme } = useApp();
  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: theme.primary,
        },
      ]}
    >
      <View style={styles.heroGlow} />
      <Text style={styles.heroBrand}>{brand}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useApp();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  return <Text style={[styles.title, { color: theme.text }]}>{children}</Text>;
}

export function Muted({ children, center }: { children: React.ReactNode; center?: boolean }) {
  const { theme } = useApp();
  return (
    <Text
      style={{
        color: theme.muted,
        fontSize: 14,
        lineHeight: 20,
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </Text>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: BookingStatusTone;
}) {
  const { theme } = useApp();
  const map = {
    ok: { bg: `${theme.success}18`, fg: theme.success },
    warn: { bg: `${theme.warning}18`, fg: theme.warning },
    bad: { bg: `${theme.danger}18`, fg: theme.danger },
    neutral: { bg: theme.bgSoft, fg: theme.muted },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={{ color: map.fg, fontWeight: "700", fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function Avatar({
  label,
  size = 44,
  color,
}: {
  label: string;
  size?: number;
  color?: string;
}) {
  const { theme } = useApp();
  const bg = color || theme.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${bg}22`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: bg, fontWeight: "800", fontSize: size * 0.34 }}>{label}</Text>
    </View>
  );
}

export function MenuRow({
  title,
  subtitle,
  onPress,
  trailing,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: string;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: theme.muted, fontSize: 13 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={{ color: theme.muted, fontSize: 18 }}>{trailing || "›"}</Text>
    </Pressable>
  );
}

export const PrimaryButton = forwardRef<
  View,
  {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
  }
>(function PrimaryButton({ label, onPress, disabled, style }, ref) {
  const { theme } = useApp();
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: theme.primary,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
});

export const OutlineButton = forwardRef<
  View,
  {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
  }
>(function OutlineButton({ label, onPress, disabled, style }, ref) {
  const { theme } = useApp();
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btnOutline,
        {
          borderColor: theme.primary,
          backgroundColor: pressed ? `${theme.primary}10` : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
});

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & TextInputProps) {
  const { theme } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      <TextInput
        placeholderTextColor={`${theme.muted}99`}
        {...props}
        style={[
          styles.input,
          {
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.card,
          },
          props.style,
        ]}
      />
      {hint ? <Text style={{ color: theme.muted, fontSize: 11 }}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  sublabel,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  sublabel?: string;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primary : theme.card,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : theme.text,
          fontWeight: "700",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      {sublabel ? (
        <Text
          style={{
            color: active ? "rgba(255,255,255,0.85)" : theme.muted,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  page: { gap: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: 6,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  hero: {
    borderRadius: radius.xl,
    padding: space.lg,
    paddingVertical: 26,
    overflow: "hidden",
    minHeight: 150,
    justifyContent: "flex-end",
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroBrand: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.88)",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  btn: {
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnOutline: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorTitle: { fontSize: 18, fontWeight: "800", marginTop: 14, textAlign: "center" },
  errorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  menuRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
