import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useProducts, useWarehouses, useCreateInventory } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ReceiveInwardScreen() {
  const router = useRouter();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();
  const createInventory = useCreateInventory();

  const [form, setForm] = useState({
    productId: 0,
    warehouseId: 0,
    quantity: '',
    unitPrice: '',
    hsnCode: '',
    grossWeight: '',
  });

  const handleSubmit = () => {
    if (!form.productId || !form.warehouseId || !form.quantity || !form.unitPrice) {
      Toast.show({ type: 'error', text1: 'Missing required fields' });
      return;
    }

    createInventory.mutate(
      {
        productId: form.productId,
        warehouseId: form.warehouseId,
        quantity: parseInt(form.quantity),
        unitPrice: form.unitPrice,
        hsnCode: form.hsnCode || undefined,
        grossWeight: form.grossWeight || undefined,
      },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: 'Inventory received successfully!' });
          router.back();
        },
        onError: (err) => {
          Toast.show({ type: 'error', text1: 'Failed', text2: err.message });
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Receive Inward</Text>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Select
              label="Product *"
              placeholder="Select product..."
              options={products.map((p) => ({ label: p.name, value: p.id }))}
              value={form.productId}
              onChange={(val) => setForm((f) => ({ ...f, productId: Number(val) }))}
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
            <Input
              label="Quantity *"
              placeholder="Enter quantity"
              value={form.quantity}
              onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
              keyboardType="numeric"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <Input
              label="Unit Price (₹) *"
              placeholder="Enter unit price"
              value={form.unitPrice}
              onChangeText={(v) => setForm((f) => ({ ...f, unitPrice: v }))}
              keyboardType="decimal-pad"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Input
              label="HSN Code"
              placeholder="Enter HSN code"
              value={form.hsnCode}
              onChangeText={(v) => setForm((f) => ({ ...f, hsnCode: v }))}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Input
              label="Gross Weight (kg)"
              placeholder="Enter gross weight"
              value={form.grossWeight}
              onChangeText={(v) => setForm((f) => ({ ...f, grossWeight: v }))}
              keyboardType="decimal-pad"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()} className="mt-4">
            <Button
              title="Submit Inward"
              onPress={handleSubmit}
              loading={createInventory.isPending}
              fullWidth
              size="lg"
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
