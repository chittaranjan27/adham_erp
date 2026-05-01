import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useCheckAuth } from '@/hooks/useAuth';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text
        className={`text-lg ${focused ? '' : 'opacity-50'}`}
        style={{ fontSize: 22 }}
      >
        {icon}
      </Text>
      <Text
        className={`text-[10px] mt-0.5 ${
          focused ? 'text-primary font-semibold' : 'text-gray-400'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const checkAuth = useCheckAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth().then((valid) => {
        if (!valid) router.replace('/(auth)/login');
      });
    }
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#FF3C00" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingTop: 6,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📦" label="Inventory" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🛒" label="Orders" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⋯" label="More" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
