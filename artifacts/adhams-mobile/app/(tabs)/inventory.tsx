import { Ionicons } from "@expo/vector-icons";
import { useListInventory } from "@workspace/api-client-react";
import type { InventoryItem } from "@workspace/api-client-react";
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

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  available: { label: "Available", color: Colors.success, bg: Colors.successLight, icon: "checkmark-circle" },
  reserved: { label: "Reserved", color: Colors.purple, bg: Colors.purpleLight, icon: "bookmark" },
  quarantined: { label: "Quarantined", color: Colors.danger, bg: Colors.dangerLight, icon: "warning" },
  in_transit: { label: "In Transit", color: Colors.teal, bg: Colors.tealLight, icon: "navigate" },
};

const FILTERS = ["all", "available", "reserved", "quarantined", "in_transit"] as const;
type Filter = (typeof FILTERS)[number];

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: Colors.textSecondary, bg: Colors.border, icon: "ellipse" as const };
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={10} color={meta.color} />
      <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      onPress={() => router.push({ pathname: "/inventory/[id]", params: { id: String(item.id) } })}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.barcode}>{item.barcode}</Text>
        </View>
        <StatusPill status={item.status} />
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBottom}>
        <View style={styles.infoCol}>
          <Ionicons name="business-outline" size={11} color={Colors.textTertiary} />
          <Text style={styles.infoText} numberOfLines={1}>{item.warehouseName}</Text>
        </View>
        {item.binLocation ? (
          <View style={styles.infoCol}>
            <Ionicons name="location-outline" size={11} color={Colors.textTertiary} />
            <Text style={styles.infoText}>{item.binLocation}</Text>
          </View>
        ) : null}
        <View style={styles.cardRight}>
          <Text style={styles.quantity}>{item.quantity.toLocaleString("en-IN")}</Text>
          <Text style={styles.quantityUnit}>units</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.value}>{formatINR(item.totalValue)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </View>
      {item.category ? (
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category}</Text>
          {item.hsnCode ? <Text style={styles.hsnText}>HSN: {item.hsnCode}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 49;
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, refetch, isRefetching } = useListInventory({
    query: { queryKey: ["inventory", filter] },
    request: {},
  });

  const items = data?.items ?? [];
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const qcCount = items.filter((i) => i.status === "quarantined").length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          {qcCount > 0 && (
            <Text style={styles.qcAlert}>{qcCount} item{qcCount !== 1 ? "s" : ""} need QC review</Text>
          )}
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerCount}>{filtered.length}</Text>
          <Text style={styles.headerCountLabel}>items</Text>
        </View>
      </View>

      {/* Filter pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS as unknown as Filter[]}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: f }) => {
          const meta = STATUS_META[f];
          const count = f === "all" ? items.length : items.filter((i) => i.status === f).length;
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
          <Ionicons name="cube-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No items</Text>
          <Text style={styles.emptyText}>No {filter === "all" ? "" : filter.replace("_", " ") + " "}inventory found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <InventoryCard item={item} />}
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
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
  },
  qcAlert: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.warning,
    marginTop: 3,
  },
  headerStats: { alignItems: "flex-end" },
  headerCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
  },
  headerCountLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
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
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardLeft: { flex: 1, paddingRight: 10 },
  productName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  barcode: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoCol: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardRight: { alignItems: "flex-end" },
  quantity: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  quantityUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  value: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  categoryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hsnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
