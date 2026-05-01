import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📦', title, description, action }: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="flex-1 items-center justify-center py-16 px-8"
    >
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-lg font-bold text-gray-800 text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-gray-500 text-center mb-6">
          {description}
        </Text>
      )}
      {action}
    </Animated.View>
  );
}
