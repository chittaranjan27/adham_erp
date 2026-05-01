import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useWarehouses } from '@/hooks/useInventory';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useCreateGRN } from '@/hooks/useGRN';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function CreateGRNScreen() {
  const router = useRouter();
  const { data: warehouses = [] } = useWarehouses();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const createGRN = useCreateGRN();

  const [form, setForm] = useState({
    poId: 0,
    warehouseId: 0,
    totalItemsReceived: '',
    shortageQty: '',
    damageQty: '',
    surfaceCondition: '',
    edgeCondition: '',
    warping: '',
    shadeMatch: '',
  });

  const handleSubmit = () => {
    if (!form.warehouseId || !form.totalItemsReceived) {
      Toast.show({ type: 'error', text1: 'Warehouse and items received are required' });
      return;
    }

    createGRN.mutate(
      {
        poId: form.poId || undefined,
        warehouseId: form.warehouseId,
        totalItemsReceived: parseInt(form.totalItemsReceived),
        shortageQty: form.shortageQty ? parseInt(form.shortageQty) : undefined,
        damageQty: form.damageQty ? parseInt(form.damageQty) : undefined,
        qualityInspection: {
          surfaceCondition: form.surfaceCondition || undefined,
          edgeCondition: form.edgeCondition || undefined,
          warping: form.warping || undefined,
          shadeMatch: form.shadeMatch || undefined,
        },
      },
      {
        onSuccess: () => { Toast.show({ type: 'success', text1: 'GRN created!' }); router.back(); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-row items-center px-5 pt-4 pb-3">
            <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
            <Text className="text-xl font-bold text-gray-900 ml-2">Create GRN</Text>
          </View>

          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Select
                label="Purchase Order (optional)"
                placeholder="Select PO..."
                options={[{ label: 'None', value: 0 }, ...purchaseOrders.map((po) => ({ label: `${po.poNumber} - ${po.supplierName}`, value: po.id }))]}
                value={form.poId}
                onChange={(val) => setForm((f) => ({ ...f, poId: Number(val) }))}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Select
                label="Warehouse *"
                placeholder="Select warehouse..."
                options={warehouses.map((w) => ({ label: `${w.name} (${w.code})`, value: w.id }))}
                value={form.warehouseId}
                onChange={(val) => setForm((f) => ({ ...f, warehouseId: Number(val) }))}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Input label="Items Received *" placeholder="0" value={form.totalItemsReceived} onChangeText={(v) => setForm((f) => ({ ...f, totalItemsReceived: v }))} keyboardType="numeric" />
            </Animated.View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input label="Shortage" placeholder="0" value={form.shortageQty} onChangeText={(v) => setForm((f) => ({ ...f, shortageQty: v }))} keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <Input label="Damage" placeholder="0" value={form.damageQty} onChangeText={(v) => setForm((f) => ({ ...f, damageQty: v }))} keyboardType="numeric" />
              </View>
            </View>

            <Text className="text-sm font-bold text-gray-900 mt-4 mb-3">Quality Inspection</Text>

            <Select label="Surface Condition" placeholder="Select..." options={[{ label: 'Good', value: 'good' }, { label: 'Fair', value: 'fair' }, { label: 'Poor', value: 'poor' }]} value={form.surfaceCondition} onChange={(v) => setForm((f) => ({ ...f, surfaceCondition: String(v) }))} />
            <Select label="Edge Condition" placeholder="Select..." options={[{ label: 'Good', value: 'good' }, { label: 'Fair', value: 'fair' }, { label: 'Poor', value: 'poor' }]} value={form.edgeCondition} onChange={(v) => setForm((f) => ({ ...f, edgeCondition: String(v) }))} />
            <Select label="Warping" placeholder="Select..." options={[{ label: 'None', value: 'none' }, { label: 'Minor', value: 'minor' }, { label: 'Major', value: 'major' }]} value={form.warping} onChange={(v) => setForm((f) => ({ ...f, warping: String(v) }))} />
            <Select label="Shade Match" placeholder="Select..." options={[{ label: 'Match', value: 'match' }, { label: 'Close', value: 'close' }, { label: 'No Match', value: 'no_match' }]} value={form.shadeMatch} onChange={(v) => setForm((f) => ({ ...f, shadeMatch: String(v) }))} />

            <View className="mt-6">
              <Button title="Submit GRN" onPress={handleSubmit} loading={createGRN.isPending} fullWidth size="lg" />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
