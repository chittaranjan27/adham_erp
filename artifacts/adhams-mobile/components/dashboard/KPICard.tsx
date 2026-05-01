import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface KPICardProps {
  icon: string;
  label: string;
  value: number;
  isCurrency?: boolean;
  color?: string;
  delay?: number;
}

export function KPICard({ icon, label, value, isCurrency = false, color = '#FF3C00', delay = 0 }: KPICardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={{
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        minWidth: 140,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          backgroundColor: color + '15',
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
        {isCurrency ? formatCurrency(value) : formatNumber(value)}
      </Text>
    </Animated.View>
  );
}
