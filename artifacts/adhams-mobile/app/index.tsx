import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useCheckAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthStore();
  const checkAuth = useCheckAuth();

  useEffect(() => {
    checkAuth().then((valid) => {
      if (valid) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#FF3C00" />
    </View>
  );
}
