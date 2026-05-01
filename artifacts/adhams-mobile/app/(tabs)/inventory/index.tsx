import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useInventory, useQCDecision } from '@/hooks/useInventory';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { InventoryItem } from '@/lib/types';
import Toast from 'react-native-toast-message';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Available', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Quarantined', value: 'quarantined' },
  { label: 'Pending QC', value: 'pending_qc' },
  { label: 'In Transit', value: 'in_transit' },
];

export default function InventoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qcItem, setQcItem] = useState<InventoryItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const canWrite = user?.role ? hasPermission(user.role, 'write_inventory') : false;
  const canQC = user?.role ? ['inventory_manager', 'warehouse_manager', 'super_admin', 'admin'].includes(user.role) : false;

  const { data, isLoading, isError, refetch, isRefetching } = useInventory({
    limit: 50,
    status: statusFilter || undefined,
  });

  const qcMutation = useQCDecision();

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (item) =>
        item.productName?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q)
    );
  }, [data?.items, search]);

  const handleQCDecision = (decision: 'accept' | 'reject') => {
    if (!qcItem) return;
    if (decision === 'reject' && !rejectionReason.trim()) {
      Toast.show({ type: 'error', text1: 'Rejection reason required' });
      return;
    }
    qcMutation.mutate(
      { id: qcItem.id, decision, rejectionReason: rejectionReason.trim() || undefined },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: `QC ${decision === 'accept' ? 'Approved' : 'Rejected'}` });
          setQcItem(null);
          setRejectionReason('');
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'QC Failed', text2: err.message }),
      }
    );
  };

  const renderItem = useCallback(({ item, index }: { item: InventoryItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        onPress={() => {
          if (item.status === 'pending_qc' && canQC) {
            setQcItem(item);
          }
        }}
        className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100"
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
              {item.productName}
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
              {item.barcode}
            </Text>
          </View>
          <Badge status={item.status} />
        </View>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-gray-500">📍 {item.warehouseName}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Qty: {formatNumber(item.quantity)} · Saleable: {formatNumber(item.saleableQuantity)}
            </Text>
          </View>
          <Text className="text-sm font-bold text-primary">
            {formatCurrency(item.unitPrice)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  ), [canQC]);

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ErrorState message="Failed to load inventory" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Inventory</Text>
        {data && (
          <Text className="text-xs text-gray-400 mt-1">{data.total} items total</Text>
        )}
      </View>

      {/* Search */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white rounded-xl border border-gray-100 px-3">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 py-3 text-sm text-gray-900"
            placeholder="Search by product or barcode..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')}>
              <Text className="text-gray-400">✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Status Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        renderItem={({ item: filter }) => (
          <Pressable
            onPress={() => setStatusFilter(filter.value)}
            className={`mr-2 px-4 py-2 rounded-full border ${
              statusFilter === filter.value
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                statusFilter === filter.value ? 'text-white' : 'text-gray-600'
              }`}
            >
              {filter.label}
            </Text>
          </Pressable>
        )}
      />

      {/* List */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No inventory items"
          description={search ? 'Try a different search term' : 'Inventory will appear here'}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" colors={['#FF3C00']} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      {canWrite && (
        <FAB icon="+" label="Receive" onPress={() => router.push('/(tabs)/inventory/receive')} />
      )}

      {/* QC Modal */}
      <Modal visible={!!qcItem} onClose={() => { setQcItem(null); setRejectionReason(''); }} title="QC Decision">
        {qcItem && (
          <View className="pb-8">
            <Text className="text-base font-bold text-gray-900 mb-1">{qcItem.productName}</Text>
            <Text className="text-xs text-gray-500 mb-1">Barcode: {qcItem.barcode}</Text>
            <Text className="text-xs text-gray-500 mb-4">Qty: {qcItem.quantity}</Text>

            <Input
              label="Rejection Reason (required for reject)"
              placeholder="Enter reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <Button
                  title="✓ Approve"
                  variant="success"
                  onPress={() => handleQCDecision('accept')}
                  loading={qcMutation.isPending}
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  title="✕ Reject"
                  variant="danger"
                  onPress={() => handleQCDecision('reject')}
                  loading={qcMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}
