import { Ionicons } from "@expo/vector-icons";
import {
  useGetDashboardSummary,
  useGetRecentActivities,
  useGetWarehouseStock,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useProfile } from "@/context/ProfileContext";
import type { UserProfile } from "@/context/ProfileContext";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const formatCompact = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

interface KpiCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

function KpiCard({ label, value, icon, iconBg, iconColor, sub }: KpiCardProps) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
    inward: { icon: "arrow-down-circle", bg: Colors.infoLight, color: Colors.info },
    qc_pass: { icon: "checkmark-circle", bg: Colors.successLight, color: Colors.success },
    qc_fail: { icon: "close-circle", bg: Colors.dangerLight, color: Colors.danger },
    dispatch: { icon: "car", bg: Colors.warningLight, color: Colors.warning },
    order: { icon: "document-text", bg: Colors.purpleLight, color: Colors.purple },
    delivery: { icon: "checkmark-done-circle", bg: Colors.successLight, color: Colors.success },
  };
  const item = map[type] ?? { icon: "ellipse", bg: Colors.border, color: Colors.textSecondary };
  return (
    <View style={[styles.activityIcon, { backgroundColor: item.bg }]}>
      <Ionicons name={item.icon} size={18} color={item.color} />
    </View>
  );
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 49;
  const { profile, profiles, setProfile } = useProfile();
  const [showProfile, setShowProfile] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activities, isLoading: loadingActivities } = useGetRecentActivities();
  const { data: warehouseStock } = useGetWarehouseStock();

  const handleSelectProfile = (p: UserProfile) => {
    setProfile(p);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProfile(false);
  };

  return (
    <View style={styles.container}>
      {/* Profile Switcher Modal */}
      <Modal
        visible={showProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfile(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProfile(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Switch Account</Text>
            <Text style={styles.modalSub}>Select a user to switch to</Text>

            {profiles.map((p) => {
              const isActive = p.role === profile.role;
              return (
                <Pressable
                  key={p.role}
                  style={({ pressed }) => [
                    styles.profileRow,
                    isActive && styles.profileRowActive,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => handleSelectProfile(p)}
                >
                  <View style={[styles.profileAvatar, isActive && styles.profileAvatarActive]}>
                    <Text style={[styles.profileAvatarText, isActive && { color: Colors.white }]}>
                      {p.initials}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={[styles.profileName, isActive && { color: Colors.primary }]}>{p.name}</Text>
                    <Text style={styles.profileRole}>{p.roleLabel}</Text>
                    <Text style={styles.profileEmail}>{p.email}</Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerGreeting}>Good morning 👋</Text>
          <Text style={styles.headerTitle}>Adhams Dashboard</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerBadge, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowProfile(true);
          }}
        >
          <Text style={styles.headerBadgeText}>{profile.initials}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Grid */}
        {loadingSummary ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : summary ? (
          <>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Inventory Value"
                value={formatCompact(summary.totalInventoryValue)}
                icon="layers"
                iconBg={Colors.infoLight}
                iconColor={Colors.info}
              />
              <KpiCard
                label="Monthly Revenue"
                value={formatCompact(summary.monthlyRevenue)}
                icon="trending-up"
                iconBg={Colors.successLight}
                iconColor={Colors.success}
              />
              <KpiCard
                label="Active Orders"
                value={String(summary.totalOrders)}
                icon="document-text"
                iconBg={Colors.purpleLight}
                iconColor={Colors.purple}
              />
              <KpiCard
                label="Pending Dispatch"
                value={String(summary.pendingDispatches)}
                icon="car"
                iconBg={Colors.warningLight}
                iconColor={Colors.warning}
              />
              <KpiCard
                label="In Transit"
                value={String(summary.inTransitShipments)}
                icon="navigate"
                iconBg={Colors.tealLight}
                iconColor={Colors.teal}
              />
              <KpiCard
                label="Pending QC"
                value={String(summary.pendingQC)}
                icon="shield-checkmark"
                iconBg={Colors.dangerLight}
                iconColor={Colors.danger}
                sub={summary.quarantinedItems > 0 ? `${summary.quarantinedItems} quarantined` : undefined}
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/inventory")}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.infoLight }]}>
                  <Ionicons name="cube" size={20} color={Colors.info} />
                </View>
                <Text style={styles.actionLabel}>Inventory</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/orders")}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.purpleLight }]}>
                  <Ionicons name="document-text" size={20} color={Colors.purple} />
                </View>
                <Text style={styles.actionLabel}>Orders</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/dispatch")}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="car" size={20} color={Colors.warning} />
                </View>
                <Text style={styles.actionLabel}>Dispatch</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/inventory")}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.dangerLight }]}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.danger} />
                </View>
                <Text style={styles.actionLabel}>QC Review</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* Warehouse Stock */}
        {warehouseStock && warehouseStock.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Warehouse Stock</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
              {warehouseStock.map((w, i) => (
                <View key={i} style={styles.warehouseCard}>
                  <View style={styles.warehouseHeader}>
                    <Ionicons name="business" size={16} color={Colors.primary} />
                    <Text style={styles.warehouseName} numberOfLines={1}>{w.warehouse}</Text>
                  </View>
                  <Text style={styles.warehouseValue}>{formatCompact(w.value)}</Text>
                  <Text style={styles.warehouseStock}>{w.stock.toLocaleString("en-IN")} units</Text>
                  <View style={styles.utilizationBar}>
                    <View style={[styles.utilizationFill, { width: `${Math.min(w.utilization, 100)}%` as any, backgroundColor: w.utilization > 80 ? Colors.danger : w.utilization > 60 ? Colors.warning : Colors.success }]} />
                  </View>
                  <Text style={styles.utilizationLabel}>{w.utilization.toFixed(0)}% full</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loadingActivities ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : activities && activities.length > 0 ? (
          <View style={styles.activityList}>
            {activities.slice(0, 8).map((act) => (
              <View key={act.id} style={styles.activityRow}>
                <ActivityIcon type={act.type} />
                <View style={styles.activityText}>
                  <Text style={styles.activityDescription} numberOfLines={2}>{act.description}</Text>
                  <Text style={styles.activityMeta}>{act.user} · {timeAgo(act.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="time-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.white,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.white,
  },
  scroll: { flex: 1 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
  },
  kpiCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    width: "30%",
    flexGrow: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  kpiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 2,
  },
  kpiLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  kpiSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.danger,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.text,
    textAlign: "center",
  },
  warehouseScroll: { paddingLeft: 20 },
  warehouseCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    width: 160,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  warehouseHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  warehouseName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  warehouseValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 2,
  },
  warehouseStock: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  utilizationBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  utilizationFill: { height: 4, borderRadius: 2 },
  utilizationLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textTertiary,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  activityList: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityText: { flex: 1 },
  activityDescription: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 3,
  },
  activityMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  profileRowActive: {
    backgroundColor: "rgba(232,64,28,0.06)",
    borderWidth: 1,
    borderColor: "rgba(232,64,28,0.2)",
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarActive: {
    backgroundColor: Colors.primary,
  },
  profileAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 1,
  },
  profileRole: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 1,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
