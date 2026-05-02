import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import {
  useLowStock,
  useWarehouseSummary,
  useAvailableStock,
  ACTION_LABELS,
  matchVoiceToAction,
} from '@/hooks/useSalesAssistant';
import type {
  AssistantAction,
  LowStockItem,
  WarehouseSummaryItem,
  AvailableStockItem,
} from '@/hooks/useSalesAssistant';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatNumber } from '@/lib/formatters';

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} className="flex-1 mx-1.5">
      <View className="rounded-2xl p-4" style={{ backgroundColor: `${color}10`, borderWidth: 1, borderColor: `${color}20` }}>
        <Text className="text-xs text-gray-500 font-medium">{label}</Text>
        <Text className="text-lg font-bold mt-1" style={{ color }} numberOfLines={1}>{value}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Low Stock Card ──────────────────────────────────────────────────────────
function LowStockCard({ item, index }: { item: LowStockItem; index: number }) {
  const urgency = item.totalSaleable === 0 ? 'critical' : item.totalSaleable < 10 ? 'warning' : 'caution';
  const badgeColor = urgency === 'critical' ? '#DC2626' : urgency === 'warning' ? '#D97706' : '#6B7280';
  const badgeBg = urgency === 'critical' ? '#FEE2E2' : urgency === 'warning' ? '#FEF3C7' : '#F3F4F6';
  const badgeText = urgency === 'critical' ? '🔴 OUT' : urgency === 'warning' ? '🟡 LOW' : '🟠 CAUTION';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3" style={{ borderWidth: 1, borderColor: badgeBg, elevation: 1 }}>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{item.productName}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">SKU: {item.sku} · {item.category}</Text>
          </View>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: badgeBg }}>
            <Text className="text-[10px] font-bold" style={{ color: badgeColor }}>{badgeText}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center flex-wrap gap-x-4 gap-y-2 flex-1 mr-2">
            <View><Text className="text-[10px] text-gray-400">Saleable</Text><Text className="text-sm font-bold text-gray-900">{formatNumber(item.totalSaleable)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Reserved</Text><Text className="text-sm font-semibold text-blue-600">{formatNumber(item.totalReserved)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Warehouses</Text><Text className="text-sm font-semibold text-gray-600">{item.warehouseCount}</Text></View>
          </View>
          <Text className="text-sm font-bold text-primary">{formatCurrency(item.avgUnitPrice)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Warehouse Card ──────────────────────────────────────────────────────────
function WarehouseCard({ item, index }: { item: WarehouseSummaryItem; index: number }) {
  const clr = item.utilization > 80 ? '#EF4444' : item.utilization > 50 ? '#F59E0B' : '#10B981';
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100" style={{ elevation: 1 }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1"><Text className="text-base font-bold text-gray-900">🏭 {item.warehouseName}</Text><Text className="text-xs text-gray-400 mt-0.5">{item.warehouseCode} · {item.location}</Text></View>
          <View className="px-2.5 py-1.5 rounded-full" style={{ backgroundColor: `${clr}15` }}><Text className="text-xs font-bold" style={{ color: clr }}>{item.utilization}%</Text></View>
        </View>
        <View className="rounded-full overflow-hidden mb-3" style={{ height: 6, backgroundColor: '#F3F4F6' }}>
          <View className="rounded-full" style={{ height: 6, width: `${Math.min(item.utilization, 100)}%`, backgroundColor: clr }} />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Products</Text><Text className="text-sm font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>{formatNumber(item.uniqueProducts)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Saleable</Text><Text className="text-sm font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>{formatNumber(item.totalSaleable)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>Value</Text><Text className="text-sm font-bold text-primary" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(item.totalValue)}</Text></View>
          <View style={{ width: 1, height: 24, backgroundColor: '#F3F4F6' }} />
          <View className="items-center flex-1 overflow-hidden px-0.5"><Text className="text-[10px] text-gray-400" numberOfLines={1}>QC</Text><Text className="text-sm font-bold" style={{ color: item.pendingQC > 0 ? '#EF4444' : '#10B981' }} numberOfLines={1} adjustsFontSizeToFit>{item.pendingQC}</Text></View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Available Stock Card ────────────────────────────────────────────────────
function AvailableCard({ item, index }: { item: AvailableStockItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View className="bg-white rounded-2xl p-4 mx-4 mb-3 border border-gray-100" style={{ elevation: 1 }}>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3"><Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{item.productName}</Text><Text className="text-xs text-gray-400 mt-0.5">SKU: {item.sku} · {item.category}</Text></View>
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full"><Text className="text-[10px] font-bold text-emerald-600">✓ IN STOCK</Text></View>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center flex-wrap gap-x-4 gap-y-2 flex-1 mr-2">
            <View><Text className="text-[10px] text-gray-400">Saleable</Text><Text className="text-sm font-bold text-gray-900">{formatNumber(item.totalSaleable)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Reserved</Text><Text className="text-sm font-semibold text-blue-600">{formatNumber(item.totalReserved)}</Text></View>
            <View><Text className="text-[10px] text-gray-400">Warehouses</Text><Text className="text-sm font-semibold text-gray-600">{item.warehouseCount}</Text></View>
          </View>
          <View className="items-end">
            <Text className="text-sm font-bold text-primary">{formatCurrency(item.totalValue)}</Text>
            <Text className="text-[10px] text-gray-400">@{formatCurrency(item.avgUnitPrice)}/unit</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Action Header (shown when data is active) ──────────────────────────────
function ActionHeader({ action, onClear }: { action: AssistantAction; onClear: () => void }) {
  const meta = ACTION_LABELS[action];
  const bg = action === 'low_stock' ? '#FEF3C7' : action === 'warehouse_summary' ? '#DBEAFE' : '#D1FAE5';
  return (
    <Animated.View entering={FadeIn.duration(200)} className="mx-4 mb-3 rounded-2xl overflow-hidden" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1">
          <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
          <View className="ml-3 flex-1"><Text className="text-sm font-bold text-gray-900">{meta.title}</Text><Text className="text-[10px] text-gray-500">{meta.description}</Text></View>
        </View>
        <Pressable onPress={onClear} className="bg-white/60 px-3 py-1.5 rounded-full"><Text className="text-xs text-gray-600 font-medium">✕ Clear</Text></Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Option Button ───────────────────────────────────────────────────────────
function OptionButton({ action, onPress, delay, isActive }: { action: AssistantAction; onPress: () => void; delay: number; isActive: boolean }) {
  const meta = ACTION_LABELS[action];
  const bg = action === 'low_stock' ? '#FEF3C7' : action === 'warehouse_summary' ? '#DBEAFE' : '#D1FAE5';
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center rounded-2xl p-4 mb-2.5"
        style={{
          backgroundColor: isActive ? bg : '#FFFFFF',
          borderWidth: 1,
          borderColor: isActive ? `${bg}` : '#F3F4F6',
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        }}
      >
        <View className="items-center justify-center rounded-xl" style={{ width: 44, height: 44, backgroundColor: bg }}>
          <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-[14px] font-bold text-gray-900">{meta.title}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">{meta.description}</Text>
        </View>
        <Text className="text-gray-300 text-lg">›</Text>
      </Pressable>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export default function AskAIScreen() {
  const user = useAuthStore((s) => s.user);
  const [activeAction, setActiveAction] = useState<AssistantAction | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  // Queries fire only when their action is active
  const lowStock = useLowStock(activeAction === 'low_stock');
  const warehouseSummary = useWarehouseSummary(activeAction === 'warehouse_summary');
  const availableStock = useAvailableStock(activeAction === 'available_stock');

  React.useEffect(() => {
    if (activeAction === 'low_stock' && lowStock.isSuccess && lowStock.data) {
      Speech.speak(`You have ${lowStock.data.count} items in low stock.`);
    } else if (activeAction === 'warehouse_summary' && warehouseSummary.isSuccess && warehouseSummary.data) {
      Speech.speak(`Here is the summary for your ${warehouseSummary.data.count} warehouses.`);
    } else if (activeAction === 'available_stock' && availableStock.isSuccess && availableStock.data) {
      Speech.speak(`There are ${availableStock.data.summary.totalProducts} available products.`);
    }
  }, [activeAction, lowStock.isSuccess, warehouseSummary.isSuccess, availableStock.isSuccess]);

  // Voice Event Listeners (works natively and on Web)
  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => setIsRecording(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscription(`"${text}"`);
    setIsRecording(false);
    
    const action = matchVoiceToAction(text);
    if (action) {
      setActiveAction(action);
    } else {
      setTranscription(`"${text}" (No matching action)`);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setTranscription(`Error: ${event.error}`);
    setIsRecording(false);
  });

  const handleSelectAction = (action: AssistantAction) => {
    // Toggle: if already active, clear it; else set it
    if (activeAction === action) {
      setActiveAction(null);
    } else {
      setActiveAction(action);
    }
  };

  const handleClearAction = () => {
    setActiveAction(null);
    setTranscription(null);
    Speech.stop();
  };

  const handleRefresh = () => {
    if (activeAction === 'low_stock') lowStock.refetch();
    if (activeAction === 'warehouse_summary') warehouseSummary.refetch();
    if (activeAction === 'available_stock') availableStock.refetch();
  };

  const handleMicPress = async () => {
    try {
      if (isRecording) {
        ExpoSpeechRecognitionModule.stop();
        setIsRecording(false);
      } else {
        Speech.stop(); // Stop any ongoing TTS
        setTranscription("Listening...");
        
        const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
        if (!available) {
          setTranscription("Speech recognition not supported on this device.");
          return;
        }

        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: false,
          maxAlternatives: 1,
        });
      }
    } catch (err) {
      console.error('Voice start/stop error:', err);
      setIsRecording(false);
      setTranscription("Microphone error");
    }
  };

  const isLoading =
    (activeAction === 'low_stock' && lowStock.isLoading) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isLoading) ||
    (activeAction === 'available_stock' && availableStock.isLoading);

  const isRefreshing =
    (activeAction === 'low_stock' && lowStock.isRefetching) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isRefetching) ||
    (activeAction === 'available_stock' && availableStock.isRefetching);

  const hasError =
    (activeAction === 'low_stock' && lowStock.isError) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.isError) ||
    (activeAction === 'available_stock' && availableStock.isError);

  const errorMessage =
    (activeAction === 'low_stock' && lowStock.error?.message) ||
    (activeAction === 'warehouse_summary' && warehouseSummary.error?.message) ||
    (activeAction === 'available_stock' && availableStock.error?.message) ||
    'Failed to load data';

  // ── WELCOME (no action selected) ──
  const renderWelcome = () => (
    <View className="flex-1 justify-between">
      {/* Top section - greeting + options */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100).springify()} className="items-center mt-6 mb-6">
          <Text className="text-lg font-bold text-gray-900">
            Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </Text>
          <Text className="text-sm text-gray-400 text-center mt-1">What would you like to check?</Text>
        </Animated.View>

        {/* Options list */}
        <View className="px-5">
          {(['low_stock', 'warehouse_summary', 'available_stock'] as AssistantAction[]).map((action, i) => (
            <OptionButton
              key={action}
              action={action}
              onPress={() => handleSelectAction(action)}
              delay={200 + i * 100}
              isActive={false}
            />
          ))}
        </View>
      </ScrollView>

      {/* Centered mic button at bottom */}
      {renderMicButton()}
    </View>
  );

  // ── MIC BUTTON (always visible at bottom center) ──
  const renderMicButton = () => (
    <Animated.View entering={FadeInDown.delay(500).springify()} className="items-center pb-4 pt-3 bg-background">
      <Pressable
        onPress={handleMicPress}
        className="items-center justify-center"
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: '#FF3C00',
          shadowColor: '#FF3C00',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <Text style={{ fontSize: 30 }}>🎙️</Text>
      </Pressable>
      <Text className="text-[12px] text-gray-500 font-semibold mt-2 text-center px-4" numberOfLines={2}>
        {isRecording ? 'Listening... (Tap to stop)' : transcription ? transcription : 'Tap to Ask AI'}
      </Text>
    </Animated.View>
  );

  // ── DATA VIEW (action is selected) ──
  const renderDataView = () => {
    if (!activeAction) return null;

    // Loading
    if (isLoading) {
      return (
        <View className="flex-1">
          <ActionHeader action={activeAction} onClear={handleClearAction} />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF3C00" />
            <Text className="text-sm text-gray-400 mt-3">Fetching data...</Text>
          </View>
        </View>
      );
    }

    // Error
    if (hasError) {
      return (
        <View className="flex-1">
          <ActionHeader action={activeAction} onClear={handleClearAction} />
          <View className="flex-1 items-center justify-center px-8">
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text className="text-base font-bold text-gray-900 mt-3">Could not load data</Text>
            <Text className="text-xs text-gray-400 text-center mt-1">{typeof errorMessage === 'string' ? errorMessage : 'Check your connection and try again'}</Text>
            <Pressable onPress={handleRefresh} className="mt-4 bg-primary px-6 py-2.5 rounded-full">
              <Text className="text-white text-sm font-semibold">Retry</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Low Stock
    if (activeAction === 'low_stock') {
      const data = lowStock.data;
      if (!data || data.items.length === 0) {
        return (
          <View className="flex-1">
            <ActionHeader action={activeAction} onClear={handleClearAction} />
            <EmptyState icon="✅" title="All stock levels healthy" description="No products running below safe levels." />
          </View>
        );
      }
      return (
        <View className="flex-1">
          <ActionHeader action={activeAction} onClear={handleClearAction} />
          <View className="flex-row mx-2.5 mb-3">
            <StatCard label="Low Items" value={String(data.count)} color="#EF4444" delay={100} />
            <StatCard label="Threshold" value={`< ${data.threshold}`} color="#F59E0B" delay={150} />
          </View>
          <FlatList
            data={data.items}
            keyExtractor={(item) => String(item.productId)}
            renderItem={({ item, index }) => <LowStockCard item={item} index={index} />}
            refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={handleRefresh} tintColor="#FF3C00" colors={['#FF3C00']} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    }

    // Warehouse Summary
    if (activeAction === 'warehouse_summary') {
      const data = warehouseSummary.data;
      if (!data || data.warehouses.length === 0) {
        return (
          <View className="flex-1">
            <ActionHeader action={activeAction} onClear={handleClearAction} />
            <EmptyState icon="🏭" title="No warehouses found" description="Warehouse data will appear once configured." />
          </View>
        );
      }
      return (
        <View className="flex-1">
          <ActionHeader action={activeAction} onClear={handleClearAction} />
          <View className="flex-row mx-2.5 mb-3">
            <StatCard label="Total Saleable" value={formatNumber(data.totals.totalSaleable)} color="#10B981" delay={100} />
            <StatCard label="Stock Value" value={formatCurrency(data.totals.totalValue)} color="#3B82F6" delay={150} />
          </View>
          <FlatList
            data={data.warehouses}
            keyExtractor={(item) => String(item.warehouseId)}
            renderItem={({ item, index }) => <WarehouseCard item={item} index={index} />}
            refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={handleRefresh} tintColor="#FF3C00" colors={['#FF3C00']} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    }

    // Available Stock
    if (activeAction === 'available_stock') {
      const data = availableStock.data;
      if (!data || data.items.length === 0) {
        return (
          <View className="flex-1">
            <ActionHeader action={activeAction} onClear={handleClearAction} />
            <EmptyState icon="📦" title="No stock available" description="Available stock will appear once inventory is received." />
          </View>
        );
      }
      return (
        <View className="flex-1">
          <ActionHeader action={activeAction} onClear={handleClearAction} />
          <View className="flex-row mx-2.5 mb-3">
            <StatCard label="Products" value={String(data.summary.totalProducts)} color="#8B5CF6" delay={100} />
            <StatCard label="Saleable Units" value={formatNumber(data.summary.totalSaleableUnits)} color="#10B981" delay={150} />
          </View>
          <FlatList
            data={data.items}
            keyExtractor={(item) => String(item.productId)}
            renderItem={({ item, index }) => <AvailableCard item={item} index={index} />}
            refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={handleRefresh} tintColor="#FF3C00" colors={['#FF3C00']} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-2xl font-bold text-gray-900">🤖 Ask AI</Text>
          <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
            {activeAction ? ACTION_LABELS[activeAction].title : 'Select an option or tap the mic'}
          </Text>
        </View>
        {activeAction && (
          <Pressable onPress={handleClearAction} className="bg-gray-100 px-3 py-1.5 rounded-full">
            <Text className="text-xs text-gray-500 font-medium">← Back</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Content */}
      {!activeAction ? renderWelcome() : renderDataView()}

      {/* Bottom mic (shown when data view is active too) */}
      {activeAction && renderMicButton()}
    </SafeAreaView>
  );
}
