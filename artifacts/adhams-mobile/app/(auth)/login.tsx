import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLogin } from '@/hooks/useAuth';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Please enter email and password',
      });
      return;
    }
    login.mutate(
      { email: email.trim().toLowerCase(), password },
      {
        onError: (error) => {
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: error.message || 'Invalid credentials',
          });
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top gradient header */}
      <LinearGradient
        colors={['#FF3C00', '#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-20 pb-16 px-8 rounded-b-[40px]"
      >
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Text className="text-white text-4xl font-bold mb-2">ADHAMS</Text>
          <Text className="text-white/80 text-base">
            Building Materials ERP Platform
          </Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              Welcome Back
            </Text>
            <Text className="text-gray-500 mb-8">
              Sign in to your account
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Text className="text-gray-400">📧</Text>}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              icon={<Text className="text-gray-400">🔒</Text>}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Text className="text-gray-400">{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
              }
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700).springify()} className="mt-4">
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
              fullWidth
              size="lg"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(800).springify()} className="mt-8 items-center">
            <Text className="text-xs text-gray-400">
              Adhams ERP v1.0 · Powered by Adhams Group
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
