import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDashboardSummary, useRecentActivities, useRevenueTrends } from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/authStore';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MiniChart } from '@/components/dashboard/MiniChart';
import { Card } from '@/components/ui/Card';
import { SkeletonKPI, SkeletonList } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { getRoleLabel } from '@/lib/formatters';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const summary = useDashboardSummary();
  const activities = useRecentActivities();
  const trends = useRevenueTrends();

  const isLoading = summary.isLoading;
  const isRefreshing = summary.isRefetching;

  const handleRefresh = () => {
    summary.refetch();
    activities.refetch();
    trends.refetch();
  };

  if (summary.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ErrorState message="Failed to load dashboard" onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
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
    </SafeAreaView>
  );
}
