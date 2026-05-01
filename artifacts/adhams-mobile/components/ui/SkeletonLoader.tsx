import React from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

function SkeletonBox({ width, height = 16, borderRadius = 8, className = '' }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
        },
      ]}
      className={className}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center mb-3">
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View className="ml-3 flex-1">
          <SkeletonBox width="60%" height={14} className="mb-2" />
          <SkeletonBox width="40%" height={10} />
        </View>
      </View>
      <SkeletonBox width="100%" height={12} className="mb-2" />
      <SkeletonBox width="80%" height={12} />
    </View>
  );
}

export function SkeletonKPI() {
  return (
    <View className="bg-white rounded-2xl p-4 flex-1 mx-1 border border-gray-100">
      <SkeletonBox width={32} height={32} borderRadius={16} className="mb-3" />
      <SkeletonBox width="70%" height={12} className="mb-2" />
      <SkeletonBox width="50%" height={20} />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View className="px-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
