import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal as RNModal,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type { AssistantAction } from '@/hooks/useSalesAssistant';
import { ACTION_LABELS, matchVoiceToAction } from '@/hooks/useSalesAssistant';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface AskAIBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: AssistantAction) => void;
}

// ─── Compact Mic Button with pulse ───────────────────────────────────────────
function MicButton({
  isListening,
  onPress,
}: {
  isListening: boolean;
  onPress: () => void;
}) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
        ),
        -1,
      );
      btnScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 450, easing: Easing.ease }),
          withTiming(1, { duration: 450, easing: Easing.ease }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(btnScale);
      ringScale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
      btnScale.value = withSpring(1);
    }
  }, [isListening]);

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const bStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const SIZE = 56;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: SIZE + 40,
        height: SIZE + 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: '#FF3C00',
          },
          rStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: isListening ? '#FF3C00' : '#1F2937',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isListening ? '#FF3C00' : '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isListening ? 0.4 : 0.15,
            shadowRadius: 10,
            elevation: 8,
          },
          bStyle,
        ]}
      >
        <Text style={{ fontSize: 24 }}>{isListening ? '⏹️' : '🎙️'}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Quick Action Card (horizontal row) ──────────────────────────────────────
function ActionChip({
  action,
  onPress,
  delay,
}: {
  action: AssistantAction;
  onPress: () => void;
  delay: number;
}) {
  const meta = ACTION_LABELS[action];
  const colors: Record<AssistantAction, { bg: string; border: string }> = {
    low_stock: { bg: '#FEF3C7', border: '#FDE68A' },
    warehouse_summary: { bg: '#DBEAFE', border: '#BFDBFE' },
    available_stock: { bg: '#D1FAE5', border: '#A7F3D0' },
  };
  const { bg, border } = colors[action];

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1, marginHorizontal: 4 }}>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 15 }}>{meta.icon}</Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#1F2937',
            textAlign: 'center',
            lineHeight: 14,
          }}
          numberOfLines={2}
        >
          {meta.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── MAIN BOTTOM SHEET ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export function AskAIBottomSheet({
  visible,
  onClose,
  onSelectAction,
}: AskAIBottomSheetProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setIsListening(false);
      setVoiceStatus(null);
      setVoiceError(null);
    }
  }, [visible]);

  // ─── Speech recognition events ──────────────────────────────────────────
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setVoiceError(null);
    setVoiceStatus(null);
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setIsListening(false);

    const action = matchVoiceToAction(text);
    if (action) {
      setVoiceStatus(`✓ "${text}"`);
      setTimeout(() => {
        onSelectAction(action);
        onClose();
      }, 400);
    } else {
      setVoiceError(
        `Couldn't match "${text}". Try: "low stock", "warehouse", or "available stock".`,
      );
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setVoiceError(`Mic error: ${event.error}`);
    setIsListening(false);
  });

  const handleMicPress = async () => {
    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        return;
      }

      setVoiceError(null);
      setVoiceStatus(null);

      // ─── Request microphone permission first ──────────────────────
      const permResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permResult.granted) {
        setVoiceError('Microphone permission denied. Please allow mic access in Settings.');
        return;
      }

      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setVoiceError('Speech recognition not available on this device.');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
        maxAlternatives: 1,
      });
    } catch (err) {
      console.error('Voice error:', err);
      setIsListening(false);
      setVoiceError('Could not start the microphone.');
    }
  };

  const handleActionSelect = (action: AssistantAction) => {
    onSelectAction(action);
    onClose();
  };

  const actions: AssistantAction[] = [
    'low_stock',
    'warehouse_summary',
    'available_stock',
  ];

  // Status text + color
  const getStatusConfig = () => {
    if (isListening) return { text: 'Listening… Tap to stop', color: '#FF3C00' };
    if (voiceStatus) return { text: voiceStatus, color: '#059669' };
    return { text: 'Tap the mic or pick an action', color: '#9CA3AF' };
  };
  const status = getStatusConfig();

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
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        />

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(140)}
          exiting={SlideOutDown.duration(200)}
          style={{
            backgroundColor: '#FAFAFA',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 6,
              paddingBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: '#FF3C00',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 16 }}>🤖</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>
                  Ask AI
                </Text>
                <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                  Voice or quick actions
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>

          {/* ─── QUICK ACTIONS FIRST (always visible) ─────────────── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 20,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: '#9CA3AF',
                letterSpacing: 1,
                textTransform: 'uppercase',
                paddingHorizontal: 8,
              }}
            >
              Quick Actions
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14 }}>
            {actions.map((action, i) => (
              <ActionChip
                key={action}
                action={action}
                onPress={() => handleActionSelect(action)}
                delay={100 + i * 50}
              />
            ))}
          </View>

          {/* ─── Divider ──────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 20,
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: '#9CA3AF',
                letterSpacing: 1,
                textTransform: 'uppercase',
                paddingHorizontal: 8,
              }}
            >
              Or Ask by Voice
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* ─── Mic Section ──────────────────────────────────────── */}
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={{ alignItems: 'center', paddingBottom: 4 }}
          >
            <MicButton isListening={isListening} onPress={handleMicPress} />

            {/* Status text */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: status.color,
                textAlign: 'center',
                marginTop: -4,
                paddingHorizontal: 30,
              }}
              numberOfLines={1}
            >
              {status.text}
            </Text>

            {/* Error inline */}
            {voiceError && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={{
                  marginTop: 8,
                  marginHorizontal: 20,
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  alignSelf: 'stretch',
                }}
              >
                <Text style={{ fontSize: 11, color: '#92400E', textAlign: 'center', lineHeight: 15 }}>
                  {voiceError}
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
