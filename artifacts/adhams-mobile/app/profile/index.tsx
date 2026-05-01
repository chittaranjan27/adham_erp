import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import { useLogout, useChangePassword } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getRoleLabel } from '@/lib/formatters';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Toast.show({ type: 'error', text1: 'All fields required' }); return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' }); return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: 'Password changed!' });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 4, paddingRight: 8 }}>
            <Text style={{ fontSize: 14, color: '#FF3C00', fontWeight: '600' }}>← Back</Text>
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Profile</Text>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* User Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={{
              backgroundColor: '#1a2332',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#2b3453',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 16,
                  backgroundColor: 'rgba(255,60,0,0.2)',
                  alignItems: 'center', justifyContent: 'center', marginRight: 16,
                }}>
                  <Text style={{ fontSize: 30 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700' }}>{user?.name}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>{user?.email}</Text>
                  <View style={{
                    backgroundColor: 'rgba(255,60,0,0.3)',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12, paddingVertical: 4,
                    borderRadius: 20, marginTop: 8,
                  }}>
                    <Text style={{ color: '#FF3C00', fontSize: 12, fontWeight: '600' }}>
                      {user?.role ? getRoleLabel(user.role) : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Change Password */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Card className="mt-4">
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Change Password</Text>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
              />
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />
              <Pressable
                onPress={handleChangePassword}
                disabled={changePassword.isPending}
                style={{
                  backgroundColor: '#FF3C00',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity: changePassword.isPending ? 0.6 : 1,
                }}
              >
                {changePassword.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Update Password</Text>
                )}
              </Pressable>
            </Card>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 16 }}>
            <Pressable
              onPress={handleLogout}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>Logout</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()} style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Adhams ERP Mobile v1.0</Text>
            <Text style={{ fontSize: 10, color: '#d1d5db', marginTop: 4 }}>© 2026 Adhams Group</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
