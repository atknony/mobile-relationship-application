import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';
import { step } from '@/constants/transitions';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        ...step,
      }}
    />
  );
}
