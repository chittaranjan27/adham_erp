import { Ionicons } from "@expo/vector-icons";
import { useListOrders } from "@workspace/api-client-react";
import type { Order, OrderStatus } from "@workspace/api-client-react";
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

const STATUS_FILTERS = ["all", "pending", "confirmed", "reserved", "dispatched", "delivered"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningLight },
  confirmed: { label: "Confirmed", color: Colors.info, bg: Colors.infoLight },
  reserved: { label: "Reserved", color: Colors.purple, bg: Colors.purpleLight },
  dispatched: { label: "Dispatched", color: Colors.teal, bg: Colors.tealLight },
  delivered: { label: "Delivered", color: Colors.success, bg: Colors.successLight },
  cancelled: { label: "Cancelled", color: Colors.danger, bg: Colors.dangerLight },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: Colors.textSecondary, bg: Colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function OrderCard({ item }: { item: Order }) {
  const balance = item.balanceAmount;
  return (
    <Pressable
      style={({ pressed }) => [styles.orderCard, { opacity: pressed ? 0.95 : 1 }]}
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(item.id) } })}
    >
      <View style={styles.orderTop}>
        <View style={styles.orderLeft}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.dealerName}>{item.dealerName}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.orderDivider} />
      <View style={styles.orderBottom}>
        <View style={styles.orderAmountCol}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formatINR(item.totalAmount)}</Text>
        </View>
        <View style={styles.orderAmountCol}>
          <Text style={styles.amountLabel}>Advance</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>{formatINR(item.advancePaid)}</Text>
        </View>
        <View style={styles.orderAmountCol}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, { color: balance > 0 ? Colors.danger : Colors.success }]}>
            {formatINR(balance)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={{ alignSelf: "center" }} />
      </View>
      <View style={styles.orderMeta}>
        <Ionicons name="time-outline" size={11} color={Colors.textTertiary} />
        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString("en-IN")}</Text>
        <Text style={styles.orderItemCount}> · {item.items?.length ?? 0} item{item.items?.length !== 1 ? "s" : ""}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 49;
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, refetch, isRefetching } = useListOrders({
    query: { queryKey: ["orders", filter] },
    request: {},
  });

  const items = data?.items ?? [];
  const filtered = filter === "all" ? items : items.filter((o) => o.status === filter);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{filtered.length} orders</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS as unknown as Filter[]}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: f }) => (
          <Pressable
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "All" : STATUS_META[f]?.label ?? f}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No orders</Text>
          <Text style={styles.emptyText}>No {filter === "all" ? "" : filter + " "}orders found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => <OrderCard item={item} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: tabBarHeight + 16, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: Colors.dark,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  filterTextActive: { color: Colors.white },
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
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderLeft: { flex: 1 },
  orderNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  dealerName: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  orderDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  orderBottom: { flexDirection: "row", alignItems: "center" },
  orderAmountCol: { flex: 1 },
  amountLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.text,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 3,
  },
  orderDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
  orderItemCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
