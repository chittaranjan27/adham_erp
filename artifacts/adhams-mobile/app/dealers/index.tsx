import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDealers, useCreateDealer } from '@/hooks/useDealers';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { FAB } from '@/components/ui/FAB';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, tierColors } from '@/lib/formatters';
import type { Dealer } from '@/lib/types';
import Toast from 'react-native-toast-message';

export default function DealersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_orders') : false;

  const { data = [], isLoading, isError, refetch, isRefetching } = useDealers({ limit: 50 });
  const createDealer = useCreateDealer();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', city: '', state: '', gstNumber: '', creditLimit: '', commissionTier: 'Silver' });

  const handleCreate = () => {
    if (!form.name.trim()) { Toast.show({ type: 'error', text1: 'Dealer name required' }); return; }
    createDealer.mutate(form, {
      onSuccess: () => {
        Toast.show({ type: 'success', text1: 'Dealer created!' });
        setShowCreate(false);
        setForm({ name: '', contactPerson: '', phone: '', email: '', city: '', state: '', gstNumber: '', creditLimit: '', commissionTier: 'Silver' });
      },
      onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
    });
  };

  const renderItem = useCallback(({ item, index }: { item: Dealer; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">{item.name}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">{item.dealerCode}</Text>
          </View>
          {item.commissionTier && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: (tierColors[item.commissionTier] || '#6b7280') + '20' }}>
              <Text className="text-[10px] font-semibold" style={{ color: tierColors[item.commissionTier] || '#6b7280' }}>
                {item.commissionTier}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-1">
          {item.city && <Text className="text-xs text-gray-500">📍 {item.city}{item.state ? `, ${item.state}` : ''}</Text>}
          {item.phone && <Text className="text-xs text-gray-500">📞 {item.phone}</Text>}
        </View>
        <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-50">
          <Text className="text-xs text-gray-400">Credit: {formatCurrency(item.creditLimit)}</Text>
          <Text className="text-xs font-semibold text-primary">
            Outstanding: {formatCurrency(item.outstandingBalance)}
          </Text>
        </View>
      </View>
    </Animated.View>
  ), []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Dealers</Text>
        </View>

        {isLoading ? <SkeletonList /> : isError ? <ErrorState onRetry={refetch} /> : data.length === 0 ? (
          <EmptyState icon="🏪" title="No dealers" description="Dealers will appear here" />
        ) : (
          <FlatList data={data} keyExtractor={(i) => String(i.id)} renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}
            contentContainerStyle={{ paddingBottom: 100 }} />
        )}

        {canWrite && <FAB icon="+" label="Dealer" onPress={() => setShowCreate(true)} />}

        <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="Create Dealer">
          <View className="pb-8">
            <Input label="Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Dealer name" />
            <Input label="Contact Person" value={form.contactPerson} onChangeText={(v) => setForm((f) => ({ ...f, contactPerson: v }))} placeholder="Contact person" />
            <Input label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="Phone number" />
            <Input label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" placeholder="Email" />
            <View className="flex-row gap-3">
              <View className="flex-1"><Input label="City" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="City" /></View>
              <View className="flex-1"><Input label="State" value={form.state} onChangeText={(v) => setForm((f) => ({ ...f, state: v }))} placeholder="State" /></View>
            </View>
            <Input label="GSTIN" value={form.gstNumber} onChangeText={(v) => setForm((f) => ({ ...f, gstNumber: v }))} placeholder="GST number" />
            <Input label="Credit Limit (₹)" value={form.creditLimit} onChangeText={(v) => setForm((f) => ({ ...f, creditLimit: v }))} keyboardType="decimal-pad" placeholder="0" />
            <Select label="Commission Tier" options={[{ label: 'Bronze', value: 'Bronze' }, { label: 'Silver', value: 'Silver' }, { label: 'Gold', value: 'Gold' }, { label: 'Platinum', value: 'Platinum' }]} value={form.commissionTier} onChange={(v) => setForm((f) => ({ ...f, commissionTier: String(v) }))} />
            <Button title="Create Dealer" onPress={handleCreate} loading={createDealer.isPending} fullWidth size="lg" />
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
