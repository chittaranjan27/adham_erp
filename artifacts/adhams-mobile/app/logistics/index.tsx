import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDispatches, useCreateDispatch, useUpdateDispatch } from '@/hooks/useLogistics';
import { useOrders } from '@/hooks/useOrders';
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
import { formatDate } from '@/lib/formatters';
import type { Dispatch } from '@/lib/types';
import Toast from 'react-native-toast-message';

const DISPATCH_STATUSES = ['planned', 'loading', 'in_transit', 'delivered'];

export default function LogisticsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_dispatch') : false;

  const { data = [], isLoading, isError, refetch, isRefetching } = useDispatches({ limit: 30 });
  const { data: ordersData } = useOrders({ limit: 200 });
  const createDispatch = useCreateDispatch();
  const updateDispatch = useUpdateDispatch();

  const [showCreate, setShowCreate] = useState(false);
  const [showDeliver, setShowDeliver] = useState<Dispatch | null>(null);
  const [deliveryProof, setDeliveryProof] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [form, setForm] = useState({ orderId: 0, vehicleNumber: '', driverName: '', driverPhone: '', routePlan: '' });

  const handleCreate = () => {
    if (!form.orderId || !form.vehicleNumber || !form.driverName) {
      Toast.show({ type: 'error', text1: 'Order, vehicle, and driver required' }); return;
    }
    createDispatch.mutate(
      { orderId: form.orderId, vehicleNumber: form.vehicleNumber, driverName: form.driverName, driverPhone: form.driverPhone, routePlan: form.routePlan },
      {
        onSuccess: () => { Toast.show({ type: 'success', text1: 'Dispatch created!' }); setShowCreate(false); setForm({ orderId: 0, vehicleNumber: '', driverName: '', driverPhone: '', routePlan: '' }); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  const startDeliveryFlow = (dispatch: Dispatch) => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(code);
    setShowDeliver(dispatch);
  };

  const handleDeliver = () => {
    if (!showDeliver) return;
    if (otp !== generatedOtp) { Toast.show({ type: 'error', text1: 'Invalid OTP' }); return; }
    updateDispatch.mutate(
      { id: showDeliver.id, status: 'delivered', proofOfDelivery: deliveryProof || undefined },
      {
        onSuccess: () => { Toast.show({ type: 'success', text1: 'Marked as delivered!' }); setShowDeliver(null); setOtp(''); setDeliveryProof(''); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  const handleStatusUpdate = (dispatch: Dispatch) => {
    const currentIndex = DISPATCH_STATUSES.indexOf(dispatch.status);
    if (currentIndex < 0 || currentIndex >= DISPATCH_STATUSES.length - 1) return;
    const nextStatus = DISPATCH_STATUSES[currentIndex + 1];
    if (nextStatus === 'delivered') { startDeliveryFlow(dispatch); return; }
    updateDispatch.mutate(
      { id: dispatch.id, status: nextStatus },
      {
        onSuccess: () => Toast.show({ type: 'success', text1: `Status → ${nextStatus.replace('_', ' ')}` }),
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  const renderItem = useCallback(({ item, index }: { item: Dispatch; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100">
        <View className="flex-row justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900">{item.dispatchNumber}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">Order: {item.orderNumber || `#${item.orderId}`}</Text>
          </View>
          <Badge status={item.status} />
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {item.vehicleNumber && <Text className="text-xs text-gray-500">🚛 {item.vehicleNumber}</Text>}
          {item.driverName && <Text className="text-xs text-gray-500">👤 {item.driverName}</Text>}
        </View>
        {canWrite && item.status !== 'delivered' && (
          <View className="flex-row gap-2 mt-3 pt-2 border-t border-gray-50">
            <Button
              title={`→ ${DISPATCH_STATUSES[DISPATCH_STATUSES.indexOf(item.status) + 1]?.replace('_', ' ') || 'Next'}`}
              size="sm"
              variant="outline"
              onPress={() => handleStatusUpdate(item)}
            />
          </View>
        )}
      </View>
    </Animated.View>
  ), [canWrite]);

  const orders = ordersData?.orders || [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Logistics</Text>
        </View>

        {isLoading ? <SkeletonList /> : isError ? <ErrorState onRetry={refetch} /> : data.length === 0 ? (
          <EmptyState icon="🚚" title="No dispatches" description="Dispatches will appear here" />
        ) : (
          <FlatList data={data} keyExtractor={(i) => String(i.id)} renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}
            contentContainerStyle={{ paddingBottom: 100 }} />
        )}

        {canWrite && <FAB icon="+" label="Dispatch" onPress={() => setShowCreate(true)} />}

        {/* Create Modal */}
        <Modal visible={showCreate} onClose={() => setShowCreate(false)} title="Create Dispatch">
          <View className="pb-8">
            <Select label="Order *" placeholder="Select order..." options={orders.map((o) => ({ label: `${o.orderNumber} - ${o.dealerName || ''}`, value: o.id }))} value={form.orderId} onChange={(v) => setForm((f) => ({ ...f, orderId: Number(v) }))} />
            <Input label="Vehicle Number *" value={form.vehicleNumber} onChangeText={(v) => setForm((f) => ({ ...f, vehicleNumber: v }))} placeholder="e.g. MH02AB1234" />
            <Input label="Driver Name *" value={form.driverName} onChangeText={(v) => setForm((f) => ({ ...f, driverName: v }))} placeholder="Driver name" />
            <Input label="Driver Phone" value={form.driverPhone} onChangeText={(v) => setForm((f) => ({ ...f, driverPhone: v }))} keyboardType="phone-pad" placeholder="Phone" />
            <Input label="Route Plan" value={form.routePlan} onChangeText={(v) => setForm((f) => ({ ...f, routePlan: v }))} placeholder="Route details" multiline />
            <Button title="Create Dispatch" onPress={handleCreate} loading={createDispatch.isPending} fullWidth size="lg" />
          </View>
        </Modal>

        {/* Delivery OTP Modal */}
        <Modal visible={!!showDeliver} onClose={() => { setShowDeliver(null); setOtp(''); }} title="Mark Delivered">
          {showDeliver && (
            <View className="pb-8">
              <View className="bg-primary/10 p-4 rounded-xl mb-4 items-center">
                <Text className="text-xs text-gray-500 mb-1">Delivery OTP</Text>
                <Text className="text-3xl font-bold text-primary tracking-widest">{generatedOtp}</Text>
                <Text className="text-[10px] text-gray-400 mt-1">Share this OTP with the receiver</Text>
              </View>
              <Input label="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={4} placeholder="4-digit OTP" />
              <Input label="Proof of Delivery URL" value={deliveryProof} onChangeText={setDeliveryProof} placeholder="https://..." />
              <Button title="Confirm Delivery" variant="success" onPress={handleDeliver} loading={updateDispatch.isPending} fullWidth size="lg" />
            </View>
          )}
        </Modal>
      </SafeAreaView>
    </>
  );
}
