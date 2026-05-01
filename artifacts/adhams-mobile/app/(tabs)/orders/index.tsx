import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Order } from '@/lib/types';

export default function OrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_orders') : false;

  const { data, isLoading, isError, refetch, isRefetching } = useOrders({ limit: 50 });

  const orders = data?.orders || [];

  const renderItem = useCallback(({ item, index }: { item: Order; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        onPress={() => router.push(`/(tabs)/orders/${item.id}`)}
        className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100"
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">{item.orderNumber}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">{item.dealerName || `Dealer #${item.dealerId}`}</Text>
          </View>
          <Badge status={item.status} />
        </View>
        <View className="flex-row items-end justify-between mt-1">
          <Text className="text-xs text-gray-400">{formatDate(item.createdAt)}</Text>
          <View className="items-end">
            <Text className="text-base font-bold text-gray-900">
              {formatCurrency(item.grandTotal || item.totalAmount)}
            </Text>
            {item.balanceAmount && parseFloat(item.balanceAmount) > 0 && (
              <Text className="text-[10px] text-error mt-0.5">
                Due: {formatCurrency(item.balanceAmount)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  ), [router]);

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ErrorState message="Failed to load orders" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Orders</Text>
        <Text className="text-xs text-gray-400 mt-1">{orders.length} orders</Text>
      </View>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : orders.length === 0 ? (
        <EmptyState icon="🛒" title="No orders yet" description="Orders will appear here" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" colors={['#FF3C00']} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {canWrite && (
        <FAB icon="+" label="Order" onPress={() => router.push('/(tabs)/orders/create')} />
      )}
    </SafeAreaView>
  );
}
