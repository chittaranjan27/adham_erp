import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '@/lib/formatters';
import type { RevenueTrend } from '@/lib/types';

interface MiniChartProps {
  data: RevenueTrend[];
}

export function MiniChart({ data }: MiniChartProps) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = 112; // fixed pixel height

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: chartHeight, paddingHorizontal: 4 }}>
        {data.map((item, index) => {
          const barHeight = Math.max((item.value / maxValue) * chartHeight, 4);
          const isLast = index === data.length - 1;
          return (
            <View key={index} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
              <View
                style={{
                  width: '100%',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  height: barHeight,
                  backgroundColor: isLast ? '#FF3C00' : '#FF3C0030',
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
        {data.map((item, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
            <Text style={{ fontSize: 9, color: '#9ca3af' }}>{item.month}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 }}>
        {data.map((item, index) => (
          <View key={index} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
            <Text style={{ fontSize: 8, color: '#6b7280', fontWeight: '500' }}>
              {item.value > 0 ? formatCurrency(item.value) : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
