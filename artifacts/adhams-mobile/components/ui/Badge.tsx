import React from 'react';
import { View, Text } from 'react-native';
import { getStatusLabel, getStatusColor } from '@/lib/formatters';

interface BadgeProps {
  label?: string;
  status?: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, status, color, size = 'sm' }: BadgeProps) {
  const displayLabel = label || (status ? getStatusLabel(status) : '');
  const bgColor = color || (status ? getStatusColor(status) : '#6b7280');

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <View
      className={`rounded-full ${sizeClasses} self-start`}
      style={{ backgroundColor: bgColor + '20' }}
    >
      <Text
        className={`${textSize} font-semibold`}
        style={{ color: bgColor }}
      >
        {displayLabel}
      </Text>
    </View>
  );
}
