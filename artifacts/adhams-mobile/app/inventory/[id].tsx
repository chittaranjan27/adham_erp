import { Ionicons } from "@expo/vector-icons";
import { useGetInventoryItem } from "@workspace/api-client-react";
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

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = {
  available: { label: "Available", color: Colors.success, bg: Colors.successLight, icon: "checkmark-circle", desc: "Ready for dispatch or reservation" },
  reserved: { label: "Reserved", color: Colors.purple, bg: Colors.purpleLight, icon: "bookmark", desc: "Allocated to a dealer order" },
  quarantined: { label: "Quarantined", color: Colors.danger, bg: Colors.dangerLight, icon: "warning", desc: "Held for QC inspection" },
  in_transit: { label: "In Transit", color: Colors.teal, bg: Colors.tealLight, icon: "navigate", desc: "Currently being dispatched" },
};

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data: item, isLoading } = useGetInventoryItem(Number(id));

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.loadingBox}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
        <Text style={styles.notFound}>Item not found</Text>
      </View>
    );
  }

  const meta = STATUS_META[item.status] ?? { label: item.status, color: Colors.textSecondary, bg: Colors.border, icon: "ellipse" as const, desc: "" };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.heroName}>{item.productName}</Text>
        <View style={styles.barcodeRow}>
          <Ionicons name="barcode-outline" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.barcodeText}>{item.barcode}</Text>
        </View>
        {meta.desc ? (
          <View style={styles.statusDesc}>
            <Text style={styles.statusDescText}>{meta.desc}</Text>
          </View>
        ) : null}
      </View>

      {/* Stock Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stock Details</Text>
        <View style={styles.stockGrid}>
          <View style={styles.stockCard}>
            <View style={[styles.stockIcon, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="cube" size={20} color={Colors.info} />
            </View>
            <Text style={styles.stockValue}>{item.quantity.toLocaleString("en-IN")}</Text>
            <Text style={styles.stockLabel}>Quantity</Text>
          </View>
          <View style={styles.stockCard}>
            <View style={[styles.stockIcon, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="pricetag" size={20} color={Colors.success} />
            </View>
            <Text style={styles.stockValue}>{formatINR(item.unitPrice)}</Text>
            <Text style={styles.stockLabel}>Unit Price</Text>
          </View>
          <View style={styles.stockCard}>
            <View style={[styles.stockIcon, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="trending-up" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.stockValue}>{formatINR(item.totalValue)}</Text>
            <Text style={styles.stockLabel}>Total Value</Text>
          </View>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.card}>
          <View style={styles.locationRow}>
            <View style={[styles.locIcon, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="business" size={18} color={Colors.info} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Warehouse</Text>
              <Text style={styles.infoValue}>{item.warehouseName}</Text>
            </View>
          </View>
          {item.binLocation && (
            <>
              <View style={styles.divider} />
              <View style={styles.locationRow}>
                <View style={[styles.locIcon, { backgroundColor: Colors.purpleLight }]}>
                  <Ionicons name="location" size={18} color={Colors.purple} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Bin Location</Text>
                  <Text style={styles.infoValue}>{item.binLocation}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Product Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Info</Text>
        <View style={styles.card}>
          <View style={styles.infoTableRow}>
            <Text style={styles.tableLabel}>Category</Text>
            <Text style={styles.tableValue}>{item.category}</Text>
          </View>
          {item.hsnCode && (
            <View style={styles.infoTableRow}>
              <Text style={styles.tableLabel}>HSN Code</Text>
              <Text style={styles.tableValue}>{item.hsnCode}</Text>
            </View>
          )}
          <View style={styles.infoTableRow}>
            <Text style={styles.tableLabel}>Created</Text>
            <Text style={styles.tableValue}>
              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </Text>
          </View>
          <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableLabel}>Last Updated</Text>
            <Text style={styles.tableValue}>
              {new Date(item.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* QC Action for quarantined */}
      {item.status === "quarantined" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QC Action Required</Text>
          <View style={[styles.card, styles.qcCard]}>
            <Ionicons name="warning" size={24} color={Colors.danger} />
            <Text style={styles.qcText}>This item is quarantined and awaiting QC inspection in the ERP system.</Text>
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
  heroTop: { marginBottom: 10 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, marginBottom: 6 },
  barcodeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barcodeText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 1 },
  statusDesc: { marginTop: 10, padding: 10, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10 },
  statusDescText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 10 },
  stockGrid: { flexDirection: "row", gap: 10 },
  stockCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stockIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  stockValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text, textAlign: "center", marginBottom: 2 },
  stockLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  infoTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  tableValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  qcCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
  },
  qcText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.danger, flex: 1, lineHeight: 20 },
});
