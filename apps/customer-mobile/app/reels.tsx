import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../src/context/AppContext";
import type { ReelRow } from "../src/api/types";
import { ErrorState, LoadingState } from "../src/components/ui";

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

export default function ReelsScreen() {
  const { ready, bundle, error, refresh, theme } = useApp();
  const insets = useSafeAreaInsets();
  const reels = bundle?.reels ?? [];
  const pageHeight = WINDOW_HEIGHT;
  const [activeId, setActiveId] = useState<string | null>(reels[0]?.id ?? null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0]?.item as ReelRow | undefined;
      if (first?.id) setActiveId(first.id);
    },
    []
  );

  if (!ready) return <LoadingState label="Loading reels…" />;
  if (error && !bundle) return <ErrorState message={error} onRetry={() => void refresh()} />;

  if (!reels.length) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backChip}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.emptyTitle}>No reels yet</Text>
        <Text style={styles.muted}>Publish clips from salon App dashboard → Reels.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Reels</Text>
        <Text style={styles.topMeta}>
          {(reels.findIndex((r) => r.id === activeId) + 1) || 1}/{reels.length}
        </Text>
      </View>

      <FlatList
        data={reels}
        keyExtractor={(i) => i.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={pageHeight}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
        getItemLayout={(_, index) => ({
          length: pageHeight,
          offset: pageHeight * index,
          index,
        })}
        renderItem={({ item }) => {
          const active = item.id === activeId;
          return (
            <ImageBackground
              source={{
                uri:
                  item.posterUrl ||
                  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80",
              }}
              style={{ height: pageHeight, justifyContent: "flex-end" }}
            >
              <View style={[styles.overlay, active && styles.overlayActive]}>
                <Text style={styles.kicker}>REEL</Text>
                <Text style={styles.title}>{item.title || "Salon reel"}</Text>
                {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
                <Pressable
                  style={[styles.playBtn, { backgroundColor: theme.primary }]}
                  onPress={() => void Linking.openURL(item.videoUrl)}
                >
                  <Text style={styles.playText}>Play clip</Text>
                </Pressable>
              </View>
            </ImageBackground>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  topMeta: { color: "rgba(255,255,255,0.7)", fontWeight: "700", minWidth: 40, textAlign: "right" },
  backChip: {
    position: "absolute",
    top: 56,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  overlay: {
    padding: 20,
    paddingBottom: 72,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  overlayActive: { backgroundColor: "rgba(0,0,0,0.38)" },
  kicker: {
    color: "#7DD3FC",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "800" },
  caption: { color: "#e2e8f0", marginTop: 8, fontSize: 15, lineHeight: 21 },
  playBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  playText: { fontWeight: "800", color: "#fff" },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  muted: { color: "#94a3b8", textAlign: "center", lineHeight: 20 },
});
