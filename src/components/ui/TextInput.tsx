import { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  type TextInputProps,
} from 'react-native';
import { colors } from '@/constants/colors';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="w-full gap-1">
      {label ? (
        <Text className="font-nunito-semibold text-sm text-imm-muted">{label}</Text>
      ) : null}
      <RNTextInput
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        className={`
          w-full rounded-2xl px-4 py-4
          bg-white font-nunito text-base text-imm-text
          border-2 ${focused ? 'border-imm-blue' : 'border-transparent'}
          ${error ? 'border-imm-coral' : ''}
        `}
        placeholderTextColor={colors.muted}
      />
      {error ? (
        <Text className="font-nunito text-sm text-imm-coral">{error}</Text>
      ) : null}
    </View>
  );
}
