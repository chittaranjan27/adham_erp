import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDealers } from '@/hooks/useDealers';
import { useProducts } from '@/hooks/useInventory';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/formatters';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface LineItem {
  productId: number;
  productName: string;
  quantity: string;
  unitPrice: string;
}

const GST_RATES = [
  { label: '0%', value: '0' },
  { label: '5%', value: '5' },
  { label: '12%', value: '12' },
  { label: '18%', value: '18' },
  { label: '28%', value: '28' },
];

export default function CreateOrderScreen() {
  const router = useRouter();
  const { data: dealers = [] } = useDealers({ limit: 200 });
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [dealerId, setDealerId] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ productId: 0, productName: '', quantity: '', unitPrice: '' }]);
  const [gstRate, setGstRate] = useState('18');
  const [supplyType, setSupplyType] = useState('intra');
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');

  const addItem = () => setItems([...items, { productId: 0, productName: '', quantity: '', unitPrice: '' }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      if (field === 'productId') {
        const product = products.find((p) => p.id === value);
        return { ...item, productId: Number(value), productName: product?.name || '', unitPrice: product?.basePrice || '' };
      }
      return { ...item, [field]: value };
    }));
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }, 0);
  }, [items]);

  const gstAmount = subtotal * (parseFloat(gstRate) || 0) / 100;
  const discountAmount = parseFloat(discount) || 0;
  const shippingAmount = parseFloat(shipping) || 0;
  const grandTotal = subtotal + gstAmount - discountAmount + shippingAmount;

  const handleSubmit = () => {
    if (!dealerId) { Toast.show({ type: 'error', text1: 'Select a dealer' }); return; }
    const validItems = items.filter((i) => i.productId && i.quantity && i.unitPrice);
    if (!validItems.length) { Toast.show({ type: 'error', text1: 'Add at least one item' }); return; }

    createOrder.mutate(
      {
        dealerId,
        items: validItems.map((i) => ({ productId: i.productId, quantity: parseInt(i.quantity), unitPrice: i.unitPrice })),
        gstRate,
        supplyType,
        discountAmount: discount || undefined,
        shippingAmount: shipping || undefined,
        advancePaid: advancePaid || undefined,
      },
      {
        onSuccess: () => { Toast.show({ type: 'success', text1: 'Order created!' }); router.back(); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Create Order</Text>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Select
              label="Dealer *"
              placeholder="Select dealer..."
              options={dealers.map((d) => ({ label: `${d.name} (${d.dealerCode})`, value: d.id }))}
              value={dealerId}
              onChange={(val) => setDealerId(Number(val))}
            />
          </Animated.View>

          {/* Line Items */}
          <Text className="text-sm font-bold text-gray-900 mb-2">Line Items</Text>
          {items.map((item, index) => (
            <Animated.View key={index} entering={FadeInDown.delay(150 + index * 50).springify()}>
              <Card className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-semibold text-gray-500">Item {index + 1}</Text>
                  {items.length > 1 && (
                    <Pressable onPress={() => removeItem(index)}>
                      <Text className="text-error text-xs">Remove</Text>
                    </Pressable>
                  )}
                </View>
                <Select
                  label="Product"
                  placeholder="Select product..."
                  options={products.map((p) => ({ label: p.name, value: p.id }))}
                  value={item.productId}
                  onChange={(val) => updateItem(index, 'productId', val)}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input label="Qty" placeholder="0" value={item.quantity} onChangeText={(v) => updateItem(index, 'quantity', v)} keyboardType="numeric" />
                  </View>
                  <View className="flex-1">
                    <Input label="Unit Price (₹)" placeholder="0" value={item.unitPrice} onChangeText={(v) => updateItem(index, 'unitPrice', v)} keyboardType="decimal-pad" />
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))}
          <Button title="+ Add Item" variant="outline" size="sm" onPress={addItem} />

          {/* GST & Supply */}
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <Select label="GST Rate" options={GST_RATES} value={gstRate} onChange={(v) => setGstRate(String(v))} />
            </View>
            <View className="flex-1">
              <Select label="Supply Type" options={[{ label: 'Intra-State', value: 'intra' }, { label: 'Inter-State', value: 'inter' }]} value={supplyType} onChange={(v) => setSupplyType(String(v))} />
            </View>
          </View>

          <Input label="Discount (₹)" placeholder="0" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
          <Input label="Shipping (₹)" placeholder="0" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad" />
          <Input label="Advance Paid (₹)" placeholder="0" value={advancePaid} onChangeText={setAdvancePaid} keyboardType="decimal-pad" />

          {/* Total Preview */}
          <Card className="mt-2 bg-gray-50">
            <Text className="text-sm font-bold text-gray-900 mb-2">Order Total Preview</Text>
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row label={`GST (${gstRate}%)`} value={formatCurrency(gstAmount)} />
            {discountAmount > 0 && <Row label="Discount" value={`-${formatCurrency(discountAmount)}`} />}
            {shippingAmount > 0 && <Row label="Shipping" value={formatCurrency(shippingAmount)} />}
            <View className="border-t border-gray-200 mt-1 pt-1">
              <Row label="Grand Total" value={formatCurrency(grandTotal)} bold />
            </View>
          </Card>

          <View className="mt-6">
            <Button title="Create Order" onPress={handleSubmit} loading={createOrder.isPending} fullWidth size="lg" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={`text-xs ${bold ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</Text>
      <Text className={`text-xs ${bold ? 'font-bold text-primary' : 'text-gray-800 font-medium'}`}>{value}</Text>
    </View>
  );
}
