import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import { hasModuleAccess } from '@/lib/roles';
import { getRoleLabel } from '@/lib/formatters';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  module: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: '📥', label: 'GRN', route: '/grn', module: 'grn', description: 'Goods Received Notes' },
  { icon: '🏪', label: 'Dealers', route: '/dealers', module: 'dealers', description: 'Dealer management' },
  { icon: '🚚', label: 'Logistics', route: '/logistics', module: 'logistics', description: 'Dispatch & delivery' },
  { icon: '📋', label: 'Purchase Orders', route: '/purchase-orders', module: 'purchase_orders', description: 'Procurement & imports' },
  { icon: '💰', label: 'Finance', route: '/finance', module: 'finance', description: 'Reports & analytics' },
  { icon: '📷', label: 'Barcode Scanner', route: '/(tabs)/inventory/scan', module: 'inventory', description: 'Scan inventory items' },
  { icon: '👤', label: 'Profile', route: '/profile', module: 'profile', description: 'Account & settings' },
];

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const accessibleItems = MENU_ITEMS.filter((item) =>
    user?.role ? hasModuleAccess(user.role, item.module as any) : false
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-5 pt-4 pb-6">
          <View className="bg-dark rounded-2xl p-5">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
                <Text className="text-xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">{user?.name}</Text>
                <Text className="text-white/60 text-xs mt-0.5">{user?.email}</Text>
                <View className="bg-primary/20 self-start px-2 py-0.5 rounded-full mt-1">
                  <Text className="text-primary text-[10px] font-semibold">
                    {user?.role ? getRoleLabel(user.role) : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Menu Grid */}
        <View className="px-5">
          <Text className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Modules</Text>
          {accessibleItems.map((item, index) => (
            <Animated.View key={item.route} entering={FadeInDown.delay(200 + index * 60).springify()}>
              <Link href={item.route as any} asChild>
                <Pressable
                  className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 flex-row items-center active:bg-gray-50"
                >
                  <View className="w-11 h-11 rounded-xl bg-primary/8 items-center justify-center mr-4">
                    <Text className="text-xl">{item.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{item.label}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{item.description}</Text>
                  </View>
                  <Text className="text-gray-300 text-lg">›</Text>
                </Pressable>
              </Link>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
