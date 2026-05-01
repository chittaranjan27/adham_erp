import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  error?: string;
}

export function Select({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className={`
          flex-row items-center justify-between bg-gray-50 rounded-xl border px-4 py-3.5
          ${error ? 'border-error' : 'border-gray-200'}
        `}
      >
        <Text className={selected ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="text-gray-400">▾</Text>
      </Pressable>
      {error && <Text className="text-xs text-error mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-3xl max-h-[60%] pb-6">
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>
            {label && (
              <Text className="text-base font-bold text-gray-900 px-5 pb-3">
                {label}
              </Text>
            )}
            <ScrollView className="px-2">
              {options.map((option) => (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`
                    px-5 py-3.5 mx-2 rounded-xl mb-1
                    ${option.value === value ? 'bg-primary/10' : ''}
                  `}
                >
                  <Text
                    className={`text-base ${
                      option.value === value ? 'text-primary font-semibold' : 'text-gray-800'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
