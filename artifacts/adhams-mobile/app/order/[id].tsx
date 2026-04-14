import { Ionicons } from "@expo/vector-icons";
import { useGetOrder } from "@workspace/api-client-react";
import type { OrderItem } from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
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

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningLight },
  confirmed: { label: "Confirmed", color: Colors.info, bg: Colors.infoLight },
  reserved: { label: "Reserved", color: Colors.purple, bg: Colors.purpleLight },
  dispatched: { label: "Dispatched", color: Colors.teal, bg: Colors.tealLight },
  delivered: { label: "Delivered", color: Colors.success, bg: Colors.successLight },
  cancelled: { label: "Cancelled", color: Colors.danger, bg: Colors.dangerLight },
};

const TIMELINE = ["pending", "confirmed", "reserved", "dispatched", "delivered"];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading } = useGetOrder(Number(id));

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingBox}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
        <Text style={styles.notFound}>Order not found</Text>
      </View>
    );
  }

  const meta = STATUS_META[order.status] ?? { label: order.status, color: Colors.textSecondary, bg: Colors.border };
  const currentStep = TIMELINE.indexOf(order.status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroOrderNum}>{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.heroDealer}>{order.dealerName}</Text>
        <Text style={styles.heroDate}>
          Created {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </Text>
      </View>

      {/* Timeline */}
      {order.status !== "cancelled" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.timeline}>
            {TIMELINE.map((step, i) => {
              const active = i <= currentStep;
              const isCurrent = i === currentStep;
              const stepMeta = STATUS_META[step];
              return (
                <View key={step} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      active && { backgroundColor: isCurrent ? Colors.primary : Colors.success },
                    ]}>
                      {active && (
                        <Ionicons
                          name={isCurrent ? "radio-button-on" : "checkmark"}
                          size={12}
                          color={Colors.white}
                        />
                      )}
                    </View>
                    {i < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, active && i < currentStep && { backgroundColor: Colors.success }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      isCurrent && { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
                      !active && { color: Colors.textTertiary },
                    ]}>
                      {stepMeta?.label ?? step}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Financial Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.finCard}>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Order Total</Text>
            <Text style={styles.finValue}>{formatINR(order.totalAmount)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Advance Paid</Text>
            <Text style={[styles.finValue, { color: Colors.success }]}>{formatINR(order.advancePaid)}</Text>
          </View>
          <View style={[styles.finRow, styles.finTotal]}>
            <Text style={styles.finTotalLabel}>Balance Due</Text>
            <Text style={[styles.finTotalValue, { color: order.balanceAmount > 0 ? Colors.danger : Colors.success }]}>
              {formatINR(order.balanceAmount)}
            </Text>
          </View>
          {/* Progress bar */}
          <View style={styles.paymentBar}>
            <View style={[
              styles.paymentFill,
              { width: `${Math.min((order.advancePaid / order.totalAmount) * 100, 100)}%` as any }
            ]} />
          </View>
          <Text style={styles.paymentPct}>
            {((order.advancePaid / order.totalAmount) * 100).toFixed(0)}% paid
          </Text>
        </View>
      </View>

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({order.items.length})</Text>
          <View style={styles.itemsCard}>
            {order.items.map((item: OrderItem, i: number) => (
              <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemBorder]}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <Text style={styles.itemQty}>{item.quantity} units × {formatINR(item.unitPrice)}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatINR(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  heroCard: {
    margin: 16,
    backgroundColor: Colors.dark,
    borderRadius: 20,
    padding: 20,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  heroOrderNum: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  heroDealer: { fontFamily: "Inter_500Medium", fontSize: 15, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  heroDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.5)" },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 10 },
  timeline: { backgroundColor: Colors.white, borderRadius: 16, padding: 20 },
  timelineItem: { flexDirection: "row" },
  timelineLeft: { alignItems: "center", width: 24, marginRight: 12 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  timelineContent: { flex: 1, paddingVertical: 4, paddingBottom: 12 },
  timelineLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  finCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  finRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  finLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  finValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  finTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginBottom: 14,
  },
  finTotalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  finTotalValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  paymentBar: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: "hidden", marginBottom: 6 },
  paymentFill: { height: 6, borderRadius: 3, backgroundColor: Colors.success },
  paymentPct: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  itemsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemRow: { flexDirection: "row", padding: 16, alignItems: "flex-start" },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flex: 1, paddingRight: 12 },
  itemName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginBottom: 3 },
  itemQty: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  itemTotal: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text },
});
