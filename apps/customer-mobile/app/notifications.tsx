import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp } from "../src/context/AppContext";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  OutlineButton,
  Screen,
  SectionHeader,
} from "../src/components/ui";
import {
  loadReadNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
} from "../src/storage/notifications";
import { radius } from "../src/theme";

export default function NotificationsScreen() {
  const { ready, syncing, error, bundle, theme, refresh } = useApp();
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void loadReadNotificationIds().then(setReadIds);
  }, []);

  const items = bundle?.notifications ?? [];
  const unreadCount = useMemo(
    () => items.filter((n) => !readIds.includes(n.id)).length,
    [items, readIds]
  );

  const openItem = useCallback(async (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    const next = await markNotificationRead(id);
    setReadIds(next);
  }, []);

  const markAll = useCallback(async () => {
    const next = await markAllNotificationsRead(items.map((n) => n.id));
    setReadIds(next);
  }, [items]);

  if (!ready) return <LoadingState label="Loading notifications…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!bundle) return null;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={syncing}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: theme.text }}>
            Notifications
          </Text>
          <Muted>
            {unreadCount > 0
              ? `${unreadCount} unread · salon messages & how-to rules`
              : "Salon messages & how to earn rewards"}
          </Muted>
        </View>
        {unreadCount > 0 ? (
          <OutlineButton label="Mark all read" onPress={() => void markAll()} />
        ) : null}
      </View>

      <SectionHeader title="Inbox" />

      {items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          body="When your salon publishes updates — or enables points rules — they show up here."
        />
      ) : (
        items.map((n) => {
          const unread = !readIds.includes(n.id);
          const open = expanded === n.id;
          return (
            <Pressable key={n.id} onPress={() => void openItem(n.id)}>
              <Card
                style={{
                  borderColor: unread ? theme.primary : theme.border,
                  borderWidth: unread ? 1.5 : 1,
                }}
              >
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <View
                    style={{
                      marginTop: 4,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: unread ? theme.primary : theme.border,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>
                      {n.title}
                    </Text>
                    <Muted>
                      {n.kind}
                      {n.source === "system" ? " · from salon rules" : ""}
                      {n.createdAt && new Date(n.createdAt).getTime() > 0
                        ? ` · ${new Date(n.createdAt).toLocaleString()}`
                        : ""}
                    </Muted>
                    <Text
                      style={{
                        color: theme.text,
                        marginTop: 8,
                        lineHeight: 21,
                        fontSize: 14,
                      }}
                      numberOfLines={open ? undefined : 3}
                    >
                      {n.body}
                    </Text>
                    {!open && n.body.length > 120 ? (
                      <Text
                        style={{
                          color: theme.primary,
                          fontWeight: "700",
                          marginTop: 6,
                          fontSize: 13,
                        }}
                      >
                        Tap to read more
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}

      <Card style={{ backgroundColor: theme.bgSoft, borderRadius: radius.lg }}>
        <Text style={{ fontWeight: "800", color: theme.text }}>Tip</Text>
        <Muted>
          Points rules are set by the salon in the App dashboard. They appear here and on the
          Rewards tab so you always know how to earn and redeem.
        </Muted>
      </Card>
    </Screen>
  );
}
