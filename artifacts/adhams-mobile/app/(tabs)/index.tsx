import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { useDashboardSummary, useRecentActivities, useRevenueTrends } from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/authStore';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MiniChart } from '@/components/dashboard/MiniChart';
import { Card } from '@/components/ui/Card';
import { SkeletonKPI, SkeletonList } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { getRoleLabel, formatCurrency, formatNumber } from '@/lib/formatters';
import { AskAIBottomSheet } from '@/components/ui/AskAIBottomSheet';
import {
  useLowStock,
  useWarehouseSummary,
  useAvailableStock,
  ACTION_LABELS,
} from '@/hooks/useSalesAssistant';
import type {
  AssistantAction,
  LowStockItem,
  WarehouseSummaryItem,
  AvailableStockItem,
} from '@/hooks/useSalesAssistant';

// ─── AI Result Components ────────────────────────────────────────────────────

function AIResultHeader({ action, onClear }: { action: AssistantAction; onClear: () => void }) {
  const meta = ACTION_LABELS[action];
  const bg = action === 'low_stock' ? '#FEF3C7' : action === 'warehouse_summary' ? '#DBEAFE' : '#D1FAE5';
  return (
    <Animated.View entering={FadeIn.duration(200)} className="mx-4 mb-3 rounded-2xl overflow-hidden" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1">
          <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-gray-900">{meta.title}</Text>
            <Text className="text-[10px] text-gray-500">{meta.description}</Text>
          </View>
        </View>
        <Pressable onPress={onClear} className="bg-white/60 px-3 py-1.5 rounded-full">
          <Text className="text-xs text-gray-600 font-medium">✕ Close</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function StatCard({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} className="flex-1 mx-1.5">
      <View className="rounded-2xl p-3" style={{ backgroundColor: `${color}10`, borderWidth: 1, borderColor: `${color}20` }}>
        <Text className="text-xs text-gray-500 font-medium">{label}</Text>
        <Text className="text-base font-bold mt-0.5" style={{ color }} numberOfLines={1}>{value}</Text>
      </View>
    </Animated.View>
  );
}

function LowStockCard({ item, index }: { item: LowStockItem; index: number }) {
  const urgency = item.totalSaleable === 0 ? 'critical' : item.totalSaleable < 10 ? 'warning' : 'caution';
  const badgeColor = urgency === 'critical' ? '#DC2626' : urgency === 'warning' ? '#D97706' : '#6B7280';
  const badgeBg = urgency === 'critical' ? '#FEE2E2' : urgency === 'warning' ? '#FEF3C7' : '#F3F4F6';
  const badgeText = urgency === 'critical' ? '🔴 OUT' : urgency === 'warning' ? '🟡 LOW' : '🟠 CAUTION';
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3" style={{ borderWidth: 1, borderColor: badgeBg, elevation: 1 }}>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{item.productName}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">SKU: {item.sku} · {item.category}</Text>
          </View>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: badgeBg }}>
            <Text className="text-[10px] font-bold" style={{ color: badgeColor }}>{badgeText}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center flex-wrap gap-x-4 gap-y-2 flex-1 mr-2">
            <View><Text className="text-[10px] text-gray-400">Saleable</Text><Text className="text-sm font-bold text-gray-900">{formatNumber(item.totalSaleable)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Reserved</Text><Text className="text-sm font-semibold text-blue-600">{formatNumber(item.totalReserved)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Warehouses</Text><Text className="text-sm font-semibold text-gray-600">{item.warehouseCount}</Text></View>
          </View>
          <Text className="text-sm font-bold text-primary">{formatCurrency(item.avgUnitPrice)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function WarehouseCard({ item, index }: { item: WarehouseSummaryItem; index: number }) {
  const clr = item.utilization > 80 ? '#EF4444' : item.utilization > 50 ? '#F59E0B' : '#10B981';
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100" style={{ elevation: 1 }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1"><Text className="text-base font-bold text-gray-900">🏭 {item.warehouseName}</Text><Text className="text-xs text-gray-400 mt-0.5">{item.warehouseCode} · {item.location}</Text></View>
          <View className="px-2.5 py-1.5 rounded-full" style={{ backgroundColor: `${clr}15` }}><Text className="text-xs font-bold" style={{ color: clr }}>{item.utilization}%</Text></View>
        </View>
        <View className="rounded-full overflow-hidden mb-3" style={{ height: 6, backgroundColor: '#F3F4F6' }}>
          <View className="rounded-full" style={{ height: 6, width: `${Math.min(item.utilization, 100)}%`, backgroundColor: clr }} />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Products</Text><Text className="text-sm font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>{formatNumber(item.uniqueProducts)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Saleable</Text><Text className="text-sm font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>{formatNumber(item.totalSaleable)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Value</Text><Text className="text-sm font-bold text-primary" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(item.totalValue)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>QC</Text><Text className="text-sm font-bold" style={{ color: item.pendingQC > 0 ? '#EF4444' : '#10B981' }} numberOfLines={1} adjustsFontSizeToFit>{item.pendingQC}</Text></View>
        </View>
      </View>
    </Animated.View>
  );
}

function AvailableCard({ item, index }: { item: AvailableStockItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100" style={{ elevation: 1 }}>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3"><Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{item.productName}</Text><Text className="text-xs text-gray-400 mt-0.5">SKU: {item.sku} · {item.category}</Text></View>
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full"><Text className="text-[10px] font-bold text-emerald-600">✓ IN STOCK</Text></View>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center flex-wrap gap-x-4 gap-y-2 flex-1 mr-2">
            <View><Text className="text-[10px] text-gray-400">Saleable</Text><Text className="text-sm font-bold text-gray-900">{formatNumber(item.totalSaleable)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Reserved</Text><Text className="text-sm font-semibold text-blue-600">{formatNumber(item.totalReserved)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Warehouses</Text><Text className="text-sm font-semibold text-gray-600">{item.warehouseCount}</Text></View>
          </View>
          <View className="items-end">
            <Text className="text-sm font-bold text-primary">{formatCurrency(item.totalValue)}</Text>
            <Text className="text-[10px] text-gray-400">@{formatCurrency(item.avgUnitPrice)}/unit</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── DASHBOARD SCREEN ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const summary = useDashboardSummary();
  const activities = useRecentActivities();
  const trends = useRevenueTrends();

  // ─── Ask AI state ──────────────────────────────────────────────────────
  const [showAISheet, setShowAISheet] = useState(false);
  const [activeAction, setActiveAction] = useState<AssistantAction | null>(null);

  // Queries fire only when their action is active
  const lowStock = useLowStock(activeAction === 'low_stock');
  const warehouseSummary = useWarehouseSummary(activeAction === 'warehouse_summary');
  const availableStock = useAvailableStock(activeAction === 'available_stock');

  // Speak results
  React.useEffect(() => {
    if (activeAction === 'low_stock' && lowStock.isSuccess && lowStock.data) {
      Speech.speak(`You have ${lowStock.data.count} items in low stock.`);
    } else if (activeAction === 'warehouse_summary' && warehouseSummary.isSuccess && warehouseSummary.data) {
      Speech.speak(`Here is the summary for your ${warehouseSummary.data.count} warehouses.`);
    } else if (activeAction === 'available_stock' && availableStock.isSuccess && availableStock.data) {
      Speech.speak(`There are ${availableStock.data.summary.totalProducts} available products.`);
    }
  }, [activeAction, lowStock.isSuccess, warehouseSummary.isSuccess, availableStock.isSuccess]);

  const handleSelectAction = (action: AssistantAction) => {
    setActiveAction(action);
  };

  const handleClearAction = () => {
    setActiveAction(null);
    Speech.stop();
  };

  const handleRefreshAI = () => {
    if (activeAction === 'low_stock') lowStock.refetch();
    if (activeAction === 'warehouse_summary') warehouseSummary.refetch();
    if (activeAction === 'available_stock') availableStock.refetch();
  };

  const isLoading = summary.isLoading;
  const isRefreshing = summary.isRefetching;

  const aiIsLoading =
    (activeAction === 'low_stock' && lowStock.isLoading) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isLoading) ||
    (activeAction === 'available_stock' && availableStock.isLoading);

  const aiIsRefreshing =
    (activeAction === 'low_stock' && lowStock.isRefetching) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isRefetching) ||
    (activeAction === 'available_stock' && availableStock.isRefetching);

  const aiHasError =
    (activeAction === 'low_stock' && lowStock.isError) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isError) ||
    (activeAction === 'available_stock' && availableStock.isError);

  const aiErrorMessage =
    (activeAction === 'low_stock' && lowStock.error?.message) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.error?.message) ||
    (activeAction === 'available_stock' && availableStock.error?.message) ||
    'Failed to load data';

  const handleRefresh = () => {
    summary.refetch();
    activities.refetch();
    trends.refetch();
    if (activeAction) handleRefreshAI();
  };

  if (summary.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ErrorState message="Failed to load dashboard" onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  // ─── Render AI Results ─────────────────────────────────────────────────
  const renderAIResults = () => {
    if (!activeAction) return null;

    return (
      <Animated.View entering={FadeInUp.delay(100).springify()} className="mt-2">
        <AIResultHeader action={activeAction} onClear={handleClearAction} />

        {/* Loading */}
        {aiIsLoading && (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#FF3C00" />
            <Text className="text-sm text-gray-400 mt-3">Fetching data...</Text>
          </View>
        )}

        {/* Error */}
        {aiHasError && (
          <View className="items-center justify-center px-8 py-8">
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text className="text-base font-bold text-gray-900 mt-3">Could not load data</Text>
            <Text className="text-xs text-gray-400 text-center mt-1">
              {typeof aiErrorMessage === 'string' ? aiErrorMessage : 'Check your connection and try again'}
            </Text>
            <Pressable onPress={handleRefreshAI} className="mt-4 bg-primary px-6 py-2.5 rounded-full">
              <Text className="text-white text-sm font-semibold">Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Low Stock Results */}
        {activeAction === 'low_stock' && lowStock.isSuccess && lowStock.data && (
          <>
            <View className="flex-row mx-2.5 mb-3">
              <StatCard label="Low Items" value={String(lowStock.data.count)} color="#EF4444" delay={100} />
              <StatCard label="Threshold" value={`< ${lowStock.data.threshold}`} color="#F59E0B" delay={150} />
            </View>
            {lowStock.data.items.length === 0 ? (
              <View className="items-center py-8">
                <Text style={{ fontSize: 28 }}>✅</Text>
                <Text className="text-sm font-bold text-gray-900 mt-2">All stock levels healthy</Text>
                <Text className="text-xs text-gray-400 mt-1">No products running below safe levels.</Text>
              </View>
            ) : (
              lowStock.data.items.map((item, index) => (
                <LowStockCard key={item.productId} item={item} index={index} />
              ))
            )}
          </>
        )}

        {/* Warehouse Summary Results */}
        {activeAction === 'warehouse_summary' && warehouseSummary.isSuccess && warehouseSummary.data && (
          <>
            <View className="flex-row mx-2.5 mb-3">
              <StatCard label="Total Saleable" value={formatNumber(warehouseSummary.data.totals.totalSaleable)} color="#10B981" delay={100} />
              <StatCard label="Stock Value" value={formatCurrency(warehouseSummary.data.totals.totalValue)} color="#3B82F6" delay={150} />
            </View>
            {warehouseSummary.data.warehouses.length === 0 ? (
              <View className="items-center py-8">
                <Text style={{ fontSize: 28 }}>🏭</Text>
                <Text className="text-sm font-bold text-gray-900 mt-2">No warehouses found</Text>
                <Text className="text-xs text-gray-400 mt-1">Warehouse data will appear once configured.</Text>
              </View>
            ) : (
              warehouseSummary.data.warehouses.map((item, index) => (
                <WarehouseCard key={item.warehouseId} item={item} index={index} />
              ))
            )}
          </>
        )}

        {/* Available Stock Results */}
        {activeAction === 'available_stock' && availableStock.isSuccess && availableStock.data && (
          <>
            <View className="flex-row mx-2.5 mb-3">
              <StatCard label="Products" value={String(availableStock.data.summary.totalProducts)} color="#8B5CF6" delay={100} />
              <StatCard label="Saleable Units" value={formatNumber(availableStock.data.summary.totalSaleableUnits)} color="#10B981" delay={150} />
            </View>
            {availableStock.data.items.length === 0 ? (
              <View className="items-center py-8">
                <Text style={{ fontSize: 28 }}>📦</Text>
                <Text className="text-sm font-bold text-gray-900 mt-2">No stock available</Text>
                <Text className="text-xs text-gray-400 mt-1">Available stock will appear once inventory is received.</Text>
              </View>
            ) : (
              availableStock.data.items.map((item, index) => (
                <AvailableCard key={item.productId} item={item} index={index} />
              ))
            )}
          </>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FF3C00"
            colors={['#FF3C00']}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-5 pt-4 pb-3">
          <Text className="text-sm text-gray-500">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
          </Text>
          <Text className="text-2xl font-bold text-gray-900 mt-1">
            {user?.name || 'User'}
          </Text>
          {user?.role && (
            <View className="bg-primary/10 self-start px-3 py-1 rounded-full mt-2">
              <Text className="text-xs text-primary font-semibold">
                {getRoleLabel(user.role)}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* AI Results (rendered inline on the main screen when active) */}
        {renderAIResults()}

        {/* KPI Grid */}
        {isLoading ? (
          <View className="flex-row px-3 mb-2">
            <SkeletonKPI />
            <SkeletonKPI />
          </View>
        ) : summary.data ? (
          <>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              <KPICard
                icon="💰"
                label="Inventory Value"
                value={summary.data.totalInventoryValue}
                isCurrency
                color="#FF3C00"
                delay={100}
              />
              <KPICard
                icon="📋"
                label="Total Orders"
                value={summary.data.totalOrders}
                color="#3b82f6"
                delay={150}
              />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              <KPICard
                icon="🚚"
                label="Pending Dispatch"
                value={summary.data.pendingDispatches}
                color="#f59e0b"
                delay={200}
              />
              <KPICard
                icon="💵"
                label="Monthly Revenue"
                value={summary.data.monthlyRevenue}
                isCurrency
                color="#10b981"
                delay={250}
              />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              <KPICard
                icon="🏪"
                label="Active Dealers"
                value={summary.data.totalDealers}
                color="#8b5cf6"
                delay={300}
              />
              <KPICard
                icon="🔍"
                label="Pending QC"
                value={summary.data.pendingQC}
                color="#ef4444"
                delay={350}
              />
            </View>
          </>
        ) : null}

        {/* Revenue Trend */}
        {trends.data && trends.data.length > 0 && (
          <Card className="mx-5 mt-2" delay={400}>
            <Text className="text-sm font-bold text-gray-900 mb-1">Revenue Trends</Text>
            <Text className="text-xs text-gray-400 mb-2">Last 6 months</Text>
            <MiniChart data={trends.data} />
          </Card>
        )}

        {/* Recent Activities */}
        <Card className="mx-5 mt-4" delay={500}>
          <Text className="text-sm font-bold text-gray-900 mb-3">Recent Activity</Text>
          {activities.isLoading ? (
            <Text className="text-gray-400 text-center py-4">Loading...</Text>
          ) : (
            <ActivityFeed activities={activities.data || []} />
          )}
        </Card>
      </ScrollView>

      {/* ─── Ask AI FAB (bottom-right, dialer-style) ───────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(600).springify()}
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 100 : 80,
          right: 20,
          zIndex: 100,
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => setShowAISheet(true)}
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: '#FF3C00',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FF3C00',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 28 }}>📞</Text>
        </Pressable>
        <Text
          style={{
            fontSize: 10,
            color: '#6b7280',
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: 0.3,
          }}
        >
          Ask AI
        </Text>
      </Animated.View>

      {/* ─── Ask AI Bottom Sheet ───────────────────────────────────────────── */}
      <AskAIBottomSheet
        visible={showAISheet}
        onClose={() => setShowAISheet(false)}
        onSelectAction={handleSelectAction}
      />
    </SafeAreaView>
  );
}
