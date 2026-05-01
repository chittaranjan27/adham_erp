import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrder, useUpdateOrder } from '@/hooks/useOrders';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatDate } from '@/lib/formatters';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_orders') : false;

  const { data: order, isLoading, isError, refetch, isRefetching } = useOrder(Number(id));
  const updateOrder = useUpdateOrder();

  const handleMarkDelivered = () => {
    if (!order) return;
    updateOrder.mutate(
      { id: order.id, status: 'delivered' },
      {
        onSuccess: () => Toast.show({ type: 'success', text1: 'Order marked as delivered!' }),
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><SkeletonList count={3} /></SafeAreaView>;
  if (isError || !order) return <SafeAreaView className="flex-1 bg-background"><ErrorState message="Order not found" onRetry={refetch} /></SafeAreaView>;

  const grandTotal = parseFloat(order.grandTotal || order.totalAmount || '0');
  const advancePaid = parseFloat(order.advancePaid || '0');
  const balance = parseFloat(order.balanceAmount || '0') || grandTotal - advancePaid;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Button title="←" variant="ghost" size="sm" onPress={() => router.back()} />
        <Text className="text-xl font-bold text-gray-900 ml-2">{order.orderNumber}</Text>
        <View className="ml-auto">
          <Badge status={order.status} size="md" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}
      >
        {/* Dealer Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card>
            <Text className="text-xs text-gray-400 mb-1">Dealer</Text>
            <Text className="text-base font-bold text-gray-900">
              {order.dealerName || `Dealer #${order.dealerId}`}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Ordered: {formatDate(order.createdAt)}</Text>
          </Card>
        </Animated.View>

        {/* Items */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Card className="mt-3">
            <Text className="text-sm font-bold text-gray-900 mb-3">Order Items</Text>
            {order.items?.map((item, i) => (
              <View key={i} className={`flex-row justify-between py-2 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <View className="flex-1 mr-3">
                  <Text className="text-sm text-gray-800">{item.productName || `Product #${item.productId}`}</Text>
                  <Text className="text-xs text-gray-400">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</Text>
                </View>
                <Text className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.total || String(item.quantity * parseFloat(item.unitPrice)))}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Totals */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card className="mt-3">
            <Text className="text-sm font-bold text-gray-900 mb-3">Summary</Text>

            {order.supplyType && (
              <Row label="Supply Type" value={order.supplyType === 'intra' ? 'Intra-State' : 'Inter-State'} />
            )}
            {order.gstRate && <Row label="GST Rate" value={`${order.gstRate}%`} />}
            {order.cgst && <Row label="CGST" value={formatCurrency(order.cgst)} />}
            {order.sgst && <Row label="SGST" value={formatCurrency(order.sgst)} />}
            {order.igst && <Row label="IGST" value={formatCurrency(order.igst)} />}
            {order.discountAmount && <Row label="Discount" value={`-${formatCurrency(order.discountAmount)}`} />}
            {order.shippingAmount && <Row label="Shipping" value={formatCurrency(order.shippingAmount)} />}

            <View className="border-t border-gray-200 mt-2 pt-2">
              <Row label="Grand Total" value={formatCurrency(grandTotal)} bold />
              <Row label="Advance Paid" value={formatCurrency(advancePaid)} />
              <Row label="Balance Due" value={formatCurrency(balance)} bold color={balance > 0 ? '#ef4444' : '#10b981'} />
            </View>
          </Card>
        </Animated.View>

        {/* Actions */}
        {canWrite && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <Animated.View entering={FadeInDown.delay(400).springify()} className="mt-4">
            <Button
              title="Mark as Delivered"
              onPress={handleMarkDelivered}
              loading={updateOrder.isPending}
              fullWidth
              variant="success"
              size="lg"
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={`text-xs ${bold ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</Text>
      <Text className={`text-xs ${bold ? 'font-bold' : 'font-medium'}`} style={{ color: color || (bold ? '#111827' : '#374151') }}>
        {value}
      </Text>
    </View>
  );
}
