import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal as RNModal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AssistantAction } from '@/hooks/useSalesAssistant';
import { ACTION_LABELS, matchVoiceToAction } from '@/hooks/useSalesAssistant';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: AssistantAction) => void;
}

// ─── Pulsing mic animation component ────────────────────────────────────────
function PulsingMic({ isListening }: { isListening: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.ease }),
          withTiming(1, { duration: 600, easing: Easing.ease })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.15, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isListening]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="items-center justify-center" style={{ width: 96, height: 96 }}>
      {/* Outer ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: isListening ? '#FF3C00' : '#e5e7eb',
          },
          ringStyle,
        ]}
      />
      {/* Inner circle */}
      <View
        className="items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isListening ? '#FF3C00' : '#f3f4f6',
          zIndex: 2,
        }}
      >
        <Text style={{ fontSize: 28 }}>{isListening ? '🎤' : '🎙️'}</Text>
      </View>
    </View>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────
function ActionCard({
  action,
  onPress,
  delay,
}: {
  action: AssistantAction;
  onPress: () => void;
  delay: number;
}) {
  const meta = ACTION_LABELS[action];

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View
          className="items-center justify-center rounded-xl"
          style={{
            width: 48,
            height: 48,
            backgroundColor:
              action === 'low_stock'
                ? '#FEF3C7'
                : action === 'warehouse_summary'
                ? '#DBEAFE'
                : '#D1FAE5',
          }}
        >
          <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-[15px] font-bold text-gray-900">{meta.title}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">{meta.description}</Text>
        </View>
        <Text className="text-gray-300 text-lg">›</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export function VoiceAssistantModal({
  visible,
  onClose,
  onSelectAction,
}: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setIsListening(false);
      setVoiceResult(null);
      setVoiceError(null);
      setIsProcessing(false);
    }
  }, [visible]);

  const handleMicPress = () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      return;
    }

    // Start simulated voice recognition
    // Note: In production, integrate expo-speech or react-native-voice
    setIsListening(true);
    setVoiceResult(null);
    setVoiceError(null);

    // Simulate listening for 3 seconds, then show a prompt
    setTimeout(() => {
      setIsListening(false);
      // Since real speech-to-text needs native module, show guidance
      setVoiceError(
        'Voice recognition requires native build. Please select an option from the list above, or type your query on the sales screen.'
      );
    }, 3000);
  };

  const handleActionSelect = (action: AssistantAction) => {
    onSelectAction(action);
    onClose();
  };

  const actions: AssistantAction[] = ['low_stock', 'warehouse_summary', 'available_stock'];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <AnimatedPressable
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        />

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
          className="bg-gray-50 rounded-t-3xl"
          style={{ maxHeight: '80%' }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Title bar */}
          <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
            <View>
              <Text className="text-xl font-bold text-gray-900">Sales Assistant</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Choose an action or speak your query
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-200"
            >
              <Text className="text-gray-500 text-sm font-bold">✕</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mx-5" />

          {/* Action list */}
          <View className="px-5 pt-4 pb-2">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </Text>
            {actions.map((action, i) => (
              <ActionCard
                key={action}
                action={action}
                onPress={() => handleActionSelect(action)}
                delay={100 + i * 80}
              />
            ))}
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mx-5" />

          {/* Voice section */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="items-center pt-5 pb-8 px-5"
          >
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Or Ask by Voice
            </Text>

            {/* Mic button */}
            <Pressable onPress={handleMicPress}>
              <PulsingMic isListening={isListening} />
            </Pressable>

            {/* Status text */}
            <Text className="text-xs text-gray-400 mt-3 text-center">
              {isListening
                ? 'Listening… Tap to stop'
                : isProcessing
                ? 'Processing your request…'
                : 'Tap the mic to speak'}
            </Text>

            {/* Voice error/result */}
            {voiceError && (
              <View className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full">
                <Text className="text-xs text-amber-700 text-center">{voiceError}</Text>
              </View>
            )}

            {voiceResult && (
              <View className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 w-full">
                <Text className="text-xs text-green-700 text-center">
                  Heard: "{voiceResult}"
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
