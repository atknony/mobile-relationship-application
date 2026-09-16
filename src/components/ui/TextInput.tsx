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
    <View style={{ gap: 8 }}>
      {label ? (
        <Text
          className="font-nunito-semibold"
          style={{
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: colors.muted,
          }}
        >
          {label}
        </Text>
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
        placeholderTextColor={colors.muted}
        selectionColor={colors.mine}
        style={{
          backgroundColor: colors.white,
          borderRadius: 18,
          padding: 17,
          borderWidth: 1.5,
          borderColor: error
            ? colors.emberText
            : focused
              ? colors.warm
              : 'rgba(45,27,105,0.09)',
          fontFamily: 'Nunito_400Regular',
          fontSize: 17,
          color: colors.text,
          shadowColor: '#2D1B69',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          elevation: 1,
        }}
      />

      {error ? (
        <Text className="font-nunito" style={{ fontSize: 12, color: colors.emberText }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
