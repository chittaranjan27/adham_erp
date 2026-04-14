import { Ionicons } from "@expo/vector-icons";
import { useListDispatches } from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
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

const TIMELINE = ["planned", "loading", "in_transit", "delivered"];

export default function DispatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data } = useListDispatches();
  const dispatch = data?.items?.find((d) => String(d.id) === id);

  if (!data) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!dispatch) {
    return (
      <View style={styles.loadingBox}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
        <Text style={styles.notFound}>Dispatch not found</Text>
      </View>
    );
  }

  const meta = STATUS_META[dispatch.status] ?? { label: dispatch.status, color: Colors.textSecondary, bg: Colors.border, icon: "ellipse" as const };
  const currentStep = TIMELINE.indexOf(dispatch.status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroId}>{dispatch.dispatchNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {dispatch.routePlan && (
          <View style={styles.routeRow}>
            <Ionicons name="navigate" size={16} color={Colors.primary} />
            <Text style={styles.routeText}>{dispatch.routePlan}</Text>
          </View>
        )}
        {dispatch.dispatchDate && (
          <Text style={styles.heroDate}>
            Dispatched {new Date(dispatch.dispatchDate).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </Text>
        )}
      </View>

      {/* Timeline */}
      {dispatch.status !== "cancelled" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipment Progress</Text>
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

      {/* Fleet & Driver */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fleet & Driver</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="car" size={18} color={Colors.info} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Vehicle Number</Text>
              <Text style={styles.infoValue}>{dispatch.vehicleNumber ?? "Not assigned"}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.purpleLight }]}>
              <Ionicons name="person" size={18} color={Colors.purple} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{dispatch.driverName ?? "Not assigned"}</Text>
            </View>
            {dispatch.driverPhone && (
              <Pressable
                style={({ pressed }) => [styles.callBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => Linking.openURL(`tel:${dispatch.driverPhone}`)}
              >
                <Ionicons name="call" size={16} color={Colors.white} />
              </Pressable>
            )}
          </View>
          {dispatch.driverPhone && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{dispatch.driverPhone}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={[styles.docIcon, dispatch.eWayBillNumber ? { backgroundColor: Colors.successLight } : { backgroundColor: Colors.border }]}>
              <Ionicons
                name="document-text"
                size={18}
                color={dispatch.eWayBillNumber ? Colors.success : Colors.textTertiary}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>E-Way Bill</Text>
              <Text style={[styles.infoValue, !dispatch.eWayBillNumber && { color: Colors.textTertiary }]}>
                {dispatch.eWayBillNumber ?? "Not generated"}
              </Text>
            </View>
            {dispatch.eWayBillNumber && (
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            )}
          </View>
          {dispatch.proofOfDelivery && (
            <>
              <View style={styles.divider} />
              <View style={styles.docRow}>
                <View style={[styles.docIcon, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="image" size={18} color={Colors.success} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Proof of Delivery</Text>
                  <Text style={styles.infoValue}>Available</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              </View>
            </>
          )}
        </View>
      </View>

      {/* Delivery dates */}
      {dispatch.deliveryDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <View style={[styles.card, styles.deliveredCard]}>
            <Ionicons name="checkmark-done-circle" size={32} color={Colors.success} />
            <Text style={styles.deliveredText}>
              Delivered on {new Date(dispatch.deliveryDate).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric"
              })}
            </Text>
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
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  heroId: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  routeText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.85)", flex: 1 },
  heroDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 },
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
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  callBtn: {
    backgroundColor: Colors.success,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  deliveredCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  deliveredText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.success, flex: 1 },
});
