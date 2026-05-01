import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FABProps {
  icon?: string;
  label?: string;
  onPress: () => void;
}

export function FAB({ icon = '+', label, onPress }: FABProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(300).springify()}
      className="absolute bottom-6 right-5"
    >
      <Pressable
        onPress={onPress}
        className="bg-primary rounded-2xl shadow-lg flex-row items-center px-5 py-4"
        style={{
          shadowColor: '#FF3C00',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text className="text-white text-xl font-bold">{icon}</Text>
        {label && (
          <Text className="text-white font-semibold ml-2">{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
