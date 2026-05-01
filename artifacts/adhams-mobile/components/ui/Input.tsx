import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, Pressable } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  icon,
  rightIcon,
  containerClassName = '',
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      )}
      <View
        className={`
          flex-row items-center bg-gray-50 rounded-xl border px-3
          ${focused ? 'border-primary bg-white' : 'border-gray-200'}
          ${error ? 'border-error' : ''}
        `}
      >
        {icon && <View className="mr-2">{icon}</View>}
        <TextInput
          className="flex-1 py-3 text-base text-gray-900"
          placeholderTextColor="#9ca3af"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && (
        <Text className="text-xs text-error mt-1">{error}</Text>
      )}
    </View>
  );
}
