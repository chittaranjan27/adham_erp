import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePurchaseOrders, useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useWarehouses } from '@/hooks/useInventory';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FAB } from '@/components/ui/FAB';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PurchaseOrder } from '@/lib/types';
import Toast from 'react-native-toast-message';

export default function PurchaseOrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_inventory') : false;

  const { data = [], isLoading, isError, refetch, isRefetching } = usePurchaseOrders();
  const { data: warehouses = [] } = useWarehouses();
  const createPO = useCreatePurchaseOrder();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: 'local' as 'local' | 'import',
    supplierName: '', gstin: '', country: '', currency: 'INR',
    totalAmount: '', taxAmount: '', shippingAmount: '',
    expectedDeliveryDate: '', destinationWarehouseId: 0, attachmentUrl: '',
  });

  const handleCreate = () => {
    if (!form.supplierName || !form.totalAmount) {
      Toast.show({ type: 'error', text1: 'Supplier and amount required' }); return;
    }
    createPO.mutate(form, {
      onSuccess: () => {
        Toast.show({ type: 'success', text1: 'PO created!' + (form.type === 'import' ? ' Import workflow started.' : '') });
        setShowCreate(false);
      },
      onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
    });
  };

  const renderItem = useCallback(({ item, index }: { item: PurchaseOrder; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        onPress={() => item.type === 'import' ? router.push(`/import-workflow/${item.id}`) : null}
        className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100"
      >
        <View className="flex-row justify-between mb-2">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-gray-900">{item.poNumber}</Text>
              <Text className="text-xs">{item.type === 'import' ? '🌍' : '🇮🇳'}</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-0.5">{item.supplierName}</Text>
          </View>
          <Badge status={item.status} />
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-400">{formatDate(item.createdAt)}</Text>
          <Text className="text-sm font-bold text-gray-900">{formatCurrency(item.totalAmount)}</Text>
        </View>
        {item.type === 'import' && (
          <View className="mt-2 pt-2 border-t border-gray-50">
            <Text className="text-[10px] text-primary font-medium">Tap to view import workflow →</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  ), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Purchase Orders</Text>
        </View>

        {isLoading ? <SkeletonList /> : isError ? <ErrorState onRetry={refetch} /> : data.length === 0 ? (
          <EmptyState icon="📋" title="No purchase orders" />
        ) : (
          <FlatList data={data} keyExtractor={(i) => String(i.id)} renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}
            contentContainerStyle={{ paddingBottom: 100 }} />
        )}

        {canWrite && <FAB icon="+" label="PO" onPress={() => setShowCreate(true)} />}

        <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order">
          <View className="pb-8">
            <View className="flex-row gap-3 mb-4">
              <Pressable onPress={() => setForm((f) => ({ ...f, type: 'local' }))} className={`flex-1 py-3 rounded-xl items-center border ${form.type === 'local' ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                <Text className={`text-sm font-medium ${form.type === 'local' ? 'text-white' : 'text-gray-600'}`}>🇮🇳 Local</Text>
              </Pressable>
              <Pressable onPress={() => setForm((f) => ({ ...f, type: 'import' }))} className={`flex-1 py-3 rounded-xl items-center border ${form.type === 'import' ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
                <Text className={`text-sm font-medium ${form.type === 'import' ? 'text-white' : 'text-gray-600'}`}>🌍 Import</Text>
              </Pressable>
            </View>
            <Input label="Supplier Name *" value={form.supplierName} onChangeText={(v) => setForm((f) => ({ ...f, supplierName: v }))} placeholder="Supplier" />
            {form.type === 'local' ? (
              <Input label="GSTIN" value={form.gstin} onChangeText={(v) => setForm((f) => ({ ...f, gstin: v }))} placeholder="GST number" />
            ) : (
              <>
                <Input label="Country" value={form.country} onChangeText={(v) => setForm((f) => ({ ...f, country: v }))} placeholder="Country" />
                <Select label="Currency" options={[{ label: 'INR (₹)', value: 'INR' }, { label: 'USD ($)', value: 'USD' }, { label: 'EUR (€)', value: 'EUR' }]} value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: String(v) }))} />
              </>
            )}
            <Input label="Total Amount *" value={form.totalAmount} onChangeText={(v) => setForm((f) => ({ ...f, totalAmount: v }))} keyboardType="decimal-pad" placeholder="0" />
            <Input label="Tax Amount" value={form.taxAmount} onChangeText={(v) => setForm((f) => ({ ...f, taxAmount: v }))} keyboardType="decimal-pad" placeholder="0" />
            <Input label="Shipping Amount" value={form.shippingAmount} onChangeText={(v) => setForm((f) => ({ ...f, shippingAmount: v }))} keyboardType="decimal-pad" placeholder="0" />
            <Select label="Destination Warehouse" placeholder="Select..." options={warehouses.map((w) => ({ label: w.name, value: w.id }))} value={form.destinationWarehouseId} onChange={(v) => setForm((f) => ({ ...f, destinationWarehouseId: Number(v) }))} />
            <Button title="Create PO" onPress={handleCreate} loading={createPO.isPending} fullWidth size="lg" />
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
