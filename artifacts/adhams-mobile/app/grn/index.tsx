import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useGRNList, useReleaseGRN } from '@/hooks/useGRN';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FAB } from '@/components/ui/FAB';
import { Modal } from '@/components/ui/Modal';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDate } from '@/lib/formatters';
import type { GRN } from '@/lib/types';
import Toast from 'react-native-toast-message';

export default function GRNScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canApprove = user?.role ? hasPermission(user.role, 'approve_grn') : false;
  const canWrite = user?.role ? hasPermission(user.role, 'write_inventory') : false;

  const { data = [], isLoading, isError, refetch, isRefetching } = useGRNList({ limit: 30 });
  const releaseGRN = useReleaseGRN();

  const [releaseItem, setReleaseItem] = useState<GRN | null>(null);

  const handleRelease = () => {
    if (!releaseItem || !user) return;
    releaseGRN.mutate(
      { id: releaseItem.id, verifiedBy: user.name },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: 'Stock released!' });
          setReleaseItem(null);
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  const renderItem = useCallback(({ item, index }: { item: GRN; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">{item.grnNumber}</Text>
            {item.supplierName && <Text className="text-xs text-gray-500 mt-0.5">{item.supplierName}</Text>}
          </View>
          <View className="items-end">
            <Badge status={item.status} />
            {item.isReleased && (
              <View className="bg-success/10 px-2 py-0.5 rounded-full mt-1">
                <Text className="text-[10px] text-success font-semibold">Released</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3 mt-1">
          <Text className="text-xs text-gray-500">📦 Received: {item.totalItemsReceived}</Text>
          {item.shortageQty > 0 && <Text className="text-xs text-warning">⚠ Shortage: {item.shortageQty}</Text>}
          {item.damageQty > 0 && <Text className="text-xs text-error">❌ Damage: {item.damageQty}</Text>}
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-[10px] text-gray-400">{formatDate(item.createdAt)}</Text>
          {canApprove && !item.isReleased && item.status === 'accepted' && (
            <Button title="Release Stock" size="sm" variant="success" onPress={() => setReleaseItem(item)} />
          )}
        </View>
      </View>
    </Animated.View>
  ), [canApprove]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">GRN</Text>
        </View>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <ErrorState message="Failed to load GRN" onRetry={refetch} />
        ) : data.length === 0 ? (
          <EmptyState icon="📥" title="No GRN records" description="Goods received notes will appear here" />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {canWrite && (
          <FAB icon="+" label="GRN" onPress={() => router.push('/grn/create')} />
        )}

        <Modal visible={!!releaseItem} onClose={() => setReleaseItem(null)} title="Release Stock">
          {releaseItem && (
            <View className="pb-8">
              <Text className="text-sm text-gray-700 mb-4">
                Release stock for <Text className="font-bold">{releaseItem.grnNumber}</Text>?
                This will make {releaseItem.totalItemsReceived} items saleable.
              </Text>
              <Button title="Confirm Release" variant="success" onPress={handleRelease} loading={releaseGRN.isPending} fullWidth />
            </View>
          )}
        </Modal>
      </SafeAreaView>
    </>
  );
}
