import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFinanceReport } from '@/hooks/useFinance';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/dashboard/KPICard';
import { SkeletonList, SkeletonKPI } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Pressable } from 'react-native';

type Period = 'monthly' | 'quarterly' | 'yearly';

export default function FinanceScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('monthly');
  const { data, isLoading, isError, refetch, isRefetching } = useFinanceReport(period);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Finance</Text>
        </View>

        {/* Period Selector */}
        <View className="flex-row px-5 mb-4 gap-2">
          {(['monthly', 'quarterly', 'yearly'] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                period === p ? 'bg-primary border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`text-xs font-medium capitalize ${period === p ? 'text-white' : 'text-gray-600'}`}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View className="px-3">
            <View className="flex-row"><SkeletonKPI /><SkeletonKPI /></View>
            <SkeletonList count={3} />
          </View>
        ) : isError ? (
          <ErrorState message="Failed to load finance data" onRetry={refetch} />
        ) : data ? (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}>

            {/* KPIs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              <KPICard icon="💰" label="Gross Revenue" value={data.grossRevenue} isCurrency color="#10b981" delay={100} />
              <KPICard icon="📊" label="Total Cost" value={data.totalCost} isCurrency color="#ef4444" delay={150} />
            </View>
            <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
              <KPICard icon="📈" label="Gross Margin %" value={data.grossMarginPercent} color="#3b82f6" delay={200} />
              <KPICard icon="🏦" label="Receivables" value={data.receivables} isCurrency color="#f59e0b" delay={250} />
            </View>

            {/* Revenue by Channel */}
            {data.revenueByChannel && data.revenueByChannel.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <Card className="mx-5 mt-2">
                  <Text className="text-sm font-bold text-gray-900 mb-3">Revenue by Channel</Text>
                  {data.revenueByChannel.map((ch, i) => {
                    const maxVal = Math.max(...data.revenueByChannel.map((c) => c.value), 1);
                    const widthPercent = (ch.value / maxVal) * 100;
                    return (
                      <View key={i} className="mb-3">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-xs text-gray-600">{ch.channel}</Text>
                          <Text className="text-xs font-medium text-gray-900">{formatCurrency(ch.value)}</Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <View className="h-full bg-primary rounded-full" style={{ width: `${widthPercent}%` }} />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </Animated.View>
            )}

            {/* Top Products */}
            {data.topProducts && data.topProducts.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <Card className="mx-5 mt-3">
                  <Text className="text-sm font-bold text-gray-900 mb-3">Top 5 Products</Text>
                  {data.topProducts.map((product, i) => (
                    <View key={i} className={`flex-row items-center py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mr-3">
                        <Text className="text-[10px] font-bold text-primary">{i + 1}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm text-gray-800" numberOfLines={1}>{product.name}</Text>
                        <Text className="text-[10px] text-gray-400">{formatNumber(product.units)} units</Text>
                      </View>
                      <Text className="text-sm font-bold text-gray-900">{formatCurrency(product.revenue)}</Text>
                    </View>
                  ))}
                </Card>
              </Animated.View>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
}
