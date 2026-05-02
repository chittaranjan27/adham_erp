import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface MicFABProps {
  onPress: () => void;
}

export function MicFAB({ onPress }: MicFABProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(400).springify()}
      className="absolute bottom-6 right-5"
      style={{ zIndex: 100 }}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="items-center justify-center"
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#FF3C00',
            shadowColor: '#FF3C00',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Text style={{ fontSize: 26 }}>🎙️</Text>
        </Pressable>
      </Animated.View>
      {/* Subtle label below */}
      <Text
        className="text-center mt-1"
        style={{ fontSize: 9, color: '#9ca3af', fontWeight: '600' }}
      >
        Ask
      </Text>
    </Animated.View>
  );
}
