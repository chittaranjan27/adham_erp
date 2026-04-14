import { Ionicons } from "@expo/vector-icons";
import { useListDispatches } from "@workspace/api-client-react";
import type { Dispatch } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  planned: { label: "Planned", color: Colors.info, bg: Colors.infoLight, icon: "calendar" },
  loading: { label: "Loading", color: Colors.warning, bg: Colors.warningLight, icon: "archive" },
  in_transit: { label: "In Transit", color: Colors.teal, bg: Colors.tealLight, icon: "navigate" },
  delivered: { label: "Delivered", color: Colors.success, bg: Colors.successLight, icon: "checkmark-done-circle" },
  cancelled: { label: "Cancelled", color: Colors.danger, bg: Colors.dangerLight, icon: "close-circle" },
};

const FILTERS = ["all", "planned", "loading", "in_transit", "delivered"] as const;
type Filter = (typeof FILTERS)[number];

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: Colors.textSecondary, bg: Colors.border, icon: "ellipse" as const };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={11} color={meta.color} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function DispatchCard({ item }: { item: Dispatch }) {
  const meta = STATUS_META[item.status];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      onPress={() => router.push({ pathname: "/dispatch/[id]", params: { id: String(item.id) } })}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.dispatchIdBox}>
          <Text style={styles.dispatchId}>{item.dispatchNumber}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routeIcon}>
          <Ionicons name="navigate" size={14} color={Colors.primary} />
        </View>
        <Text style={styles.routeText} numberOfLines={1}>{item.routePlan}</Text>
      </View>

      <View style={styles.cardDivider} />

      {/* Vehicle & Driver */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="car-outline" size={14} color={Colors.textSecondary} />
          <View>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{item.vehicleNumber}</Text>
          </View>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
          <View>
            <Text style={styles.infoLabel}>Driver</Text>
            <Text style={styles.infoValue}>{item.driverName}</Text>
          </View>
        </View>
      </View>

      {/* E-Way Bill */}
      <View style={styles.ewayRow}>
        <Ionicons name="document-outline" size={12} color={Colors.textTertiary} />
        <Text style={styles.ewayLabel}>E-Way: </Text>
        <Text style={styles.ewayValue}>{item.eWayBillNumber ?? "Not generated"}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} style={{ marginLeft: "auto" }} />
      </View>
    </Pressable>
  );
}

export default function DispatchScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 49;
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, refetch, isRefetching } = useListDispatches({
    query: { queryKey: ["dispatches", filter] },
    request: {},
  });

  const items = data?.items ?? [];
  const filtered = filter === "all" ? items : items.filter((d) => d.status === filter);
  const inTransitCount = items.filter((d) => d.status === "in_transit").length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>Dispatch</Text>
          {inTransitCount > 0 && (
            <Text style={styles.headerSub}>{inTransitCount} shipment{inTransitCount !== 1 ? "s" : ""} in transit</Text>
          )}
        </View>
        <View style={[styles.transitBadge, { backgroundColor: inTransitCount > 0 ? Colors.teal : "rgba(255,255,255,0.1)" }]}>
          <Ionicons name="navigate" size={16} color={Colors.white} />
          <Text style={styles.transitCount}>{inTransitCount}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS as unknown as Filter[]}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: f }) => {
          const meta = STATUS_META[f];
          const count = f === "all" ? items.length : items.filter((d) => d.status === f).length;
          return (
            <Pressable
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              {meta && (
                <Ionicons
                  name={meta.icon}
                  size={12}
                  color={filter === f ? Colors.white : meta.color}
                />
              )}
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "All" : meta?.label ?? f}
              </Text>
              <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f && styles.filterBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="car-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No dispatches</Text>
          <Text style={styles.emptyText}>No {filter === "all" ? "" : filter.replace("_", " ") + " "}dispatches found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => String(d.id)}
          renderItem={({ item }) => <DispatchCard item={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: tabBarHeight + 16, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={!!isRefetching}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.teal,
    marginTop: 3,
  },
  transitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  transitCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: Colors.dark,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    gap: 5,
  },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  filterTextActive: { color: Colors.white },
  filterBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  filterBadgeTextActive: { color: Colors.white },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dispatchIdBox: {},
  dispatchId: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(232,64,28,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  routeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  infoGrid: { flexDirection: "row", gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "flex-start", gap: 6, flex: 1 },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textTertiary,
    marginBottom: 1,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
  },
  ewayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ewayLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  ewayValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.text,
  },
});
