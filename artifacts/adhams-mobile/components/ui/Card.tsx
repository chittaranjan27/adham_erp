import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  delay?: number;
}

export function Card({ children, className = '', style, delay = 0 }: CardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={style}
      className={`bg-card rounded-2xl p-4 shadow-sm border border-gray-100 ${className}`}
    >
      {children}
    </Animated.View>
  );
}
