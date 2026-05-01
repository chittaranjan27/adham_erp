import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '@/lib/apiClient';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { InventoryItem } from '@/lib/types';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setError('');

    try {
      // Search inventory by barcode
      const result = await api.get<any>(`/api/inventory?limit=1&search=${encodeURIComponent(data)}`);
      const items = result.items || [];
      const found = items.find((i: InventoryItem) => i.barcode === data);
      if (found) {
        setItem(found);
      } else {
        setError(`No inventory item found for barcode: ${data}`);
      }
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-lg font-bold text-gray-900 mb-2">Camera Access Required</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          We need camera access to scan barcodes for inventory lookup.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
        <Button title="Go Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-black/80">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white font-medium">← Back</Text>
        </Pressable>
        <Text className="text-white font-bold text-base">Barcode Scanner</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Camera */}
      {!scanned && (
        <View className="flex-1">
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View className="flex-1 items-center justify-center">
              <View className="w-64 h-64 border-2 border-white/60 rounded-2xl" />
              <Text className="text-white/80 text-sm mt-4">
                Align barcode within the frame
              </Text>
            </View>
          </CameraView>
        </View>
      )}

      {/* Result */}
      {scanned && (
        <View className="flex-1 bg-background p-5">
          {loading && (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Looking up item...</Text>
            </View>
          )}

          {error && (
            <Animated.View entering={FadeInDown.springify()} className="flex-1 items-center justify-center">
              <Text className="text-4xl mb-4">❌</Text>
              <Text className="text-base text-gray-700 text-center mb-6">{error}</Text>
              <Button title="Scan Again" onPress={() => { setScanned(false); setError(''); }} />
            </Animated.View>
          )}

          {item && (
            <Animated.View entering={FadeInDown.springify()}>
              <Card>
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">{item.productName}</Text>
                    <Text className="text-xs text-gray-400 mt-1">{item.barcode}</Text>
                  </View>
                  <Badge status={item.status} size="md" />
                </View>

                <View className="border-t border-gray-100 pt-3 mt-2">
                  <DetailRow label="Warehouse" value={item.warehouseName} />
                  <DetailRow label="Category" value={item.category} />
                  <DetailRow label="Quantity" value={formatNumber(item.quantity)} />
                  <DetailRow label="Saleable Qty" value={formatNumber(item.saleableQuantity)} />
                  <DetailRow label="Unit Price" value={formatCurrency(item.unitPrice)} />
                  <DetailRow label="Total Value" value={formatCurrency(item.totalValue)} />
                  {item.hsnCode && <DetailRow label="HSN Code" value={item.hsnCode} />}
                  {item.grnNumber && <DetailRow label="GRN" value={item.grnNumber} />}
                </View>
              </Card>

              <Button
                title="Scan Another"
                variant="outline"
                onPress={() => { setScanned(false); setItem(null); }}
                fullWidth
                style={{ marginTop: 16 }}
              />
            </Animated.View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-xs font-medium text-gray-900">{value}</Text>
    </View>
  );
}
