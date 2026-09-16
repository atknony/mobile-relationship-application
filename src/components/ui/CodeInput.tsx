import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { View, TextInput } from 'react-native';
import { colors } from '@/constants/colors';

const CODE_LENGTH = 6;

export interface CodeInputHandle {
  fill: (code: string) => void;
}

interface CodeInputProps {
  onComplete: (code: string) => void;
  /** Invite codes are alphanumeric; SMS codes are digits. */
  mode?: 'alphanumeric' | 'numeric';
  ref?: Ref<CodeInputHandle>;
}

/**
 * Six cells, shared by invite entry and SMS verification — same shape, same
 * states. The active cell lifts; the rest stay quiet.
 */
export function CodeInput({ onComplete, mode = 'alphanumeric', ref }: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const refs = useRef<(TextInput | null)[]>([]);

  const numeric = mode === 'numeric';
  const allowed = numeric ? /[^0-9]/g : /[^A-Z0-9]/g;

  const handleChange = (text: string, index: number) => {
    const char = numeric ? text.slice(-1).replace(allowed, '') : text.slice(-1).toUpperCase();
    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();

    const code = next.join('');
    if (code.length === CODE_LENGTH && next.every(Boolean)) onComplete(code);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
      const next = [...values];
      next[index - 1] = '';
      setValues(next);
    }
  };

  const fill = (text: string) => {
    const clean = text.toUpperCase().replace(allowed, '').slice(0, CODE_LENGTH);
    if (clean.length <= 1) return;
    const next = Array(CODE_LENGTH).fill('');
    clean.split('').forEach((c, i) => {
      next[i] = c;
    });
    setValues(next);
    if (clean.length === CODE_LENGTH) {
      onComplete(clean);
      refs.current[CODE_LENGTH - 1]?.focus();
    } else {
      refs.current[clean.length]?.focus();
    }
  };

  useImperativeHandle(ref, () => ({ fill }));

  return (
    <View className="flex-row justify-center" style={{ gap: 8 }}>
      {Array.from({ length: CODE_LENGTH }).map((_, i) => {
        const active = focusedIndex === i;
        const filled = Boolean(values[i]);
        return (
          <TextInput
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            value={values[i]}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex((current) => (current === i ? null : current))}
            onChangeText={(t) => (t.length > 1 ? fill(t) : handleChange(t, i))}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            maxLength={CODE_LENGTH} // allows a whole code to be pasted into one cell
            autoCapitalize={numeric ? 'none' : 'characters'}
            autoCorrect={false}
            keyboardType={numeric ? 'number-pad' : 'default'}
            textContentType={numeric ? 'oneTimeCode' : 'none'}
            textAlign="center"
            returnKeyType="done"
            selectionColor={colors.mine}
            style={{
              flex: 1,
              maxWidth: 52,
              height: 62,
              borderRadius: 15,
              borderWidth: 1.5,
              backgroundColor: filled || active ? colors.white : 'rgba(255,255,255,0.6)',
              borderColor: active ? colors.warm : 'rgba(45,27,105,0.08)',
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 24,
              color: colors.text,
              shadowColor: colors.heat,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: active ? 0.14 : 0,
              shadowRadius: 14,
              elevation: active ? 2 : 0,
            }}
          />
        );
      })}
    </View>
  );
}
