import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

const CODE_LENGTH = 6;

interface InviteCodeInputProps {
  onComplete: (code: string) => void;
}

export function InviteCodeInput({ onComplete }: InviteCodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const char = text.slice(-1).toUpperCase();
    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }

    const code = next.join('');
    if (code.length === CODE_LENGTH && next.every(Boolean)) {
      onComplete(code);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
      const next = [...values];
      next[index - 1] = '';
      setValues(next);
    }
  };

  const handlePaste = (text: string, index: number) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    if (clean.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      clean.split('').forEach((c, i) => { next[i] = c; });
      setValues(next);
      if (clean.length === CODE_LENGTH) {
        onComplete(clean);
        refs.current[CODE_LENGTH - 1]?.focus();
      } else {
        refs.current[clean.length]?.focus();
      }
    } else {
      handleChange(text, index);
    }
  };

  return (
    <View className="flex-row gap-2 justify-center">
      {Array.from({ length: CODE_LENGTH }).map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={values[i]}
          onChangeText={(t) => {
            if (t.length > 1) {
              handlePaste(t, i);
            } else {
              handleChange(t, i);
            }
          }}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          maxLength={CODE_LENGTH} // allow paste of full code
          autoCapitalize="characters"
          keyboardType="default"
          style={[
            styles.cell,
            { borderColor: values[i] ? colors.coral : colors.blue },
          ]}
          textAlign="center"
          returnKeyType="done"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1B69',
  },
});
