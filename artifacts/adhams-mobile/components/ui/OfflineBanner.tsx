import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="bg-error/90 px-4 py-2 items-center"
    >
      <Text className="text-white text-xs font-medium">
        📡 No internet connection — data may be outdated
      </Text>
    </Animated.View>
  );
}
