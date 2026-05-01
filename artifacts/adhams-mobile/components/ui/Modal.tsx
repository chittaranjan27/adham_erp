import React from 'react';
import { View, Text, Pressable, Modal as RNModal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <AnimatedPressable
          entering={FadeIn}
          exiting={FadeOut}
          onPress={onClose}
          className="absolute inset-0 bg-black/50"
        />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown}
          className="bg-white rounded-t-3xl max-h-[85%] pb-8"
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <Pressable onPress={onClose} className="p-2">
              <Text className="text-gray-400 text-xl">✕</Text>
            </Pressable>
          </View>
          <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </RNModal>
  );
}
