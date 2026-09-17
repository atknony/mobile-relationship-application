import { Stack } from 'expo-router';
import { usePairActivation } from '@/hooks/usePairActivation';
import { colors } from '@/constants/colors';
import { step } from '@/constants/transitions';

export default function PairLayout() {
  // The invite's creator learns it was redeemed the moment it happens.
  usePairActivation();

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, ...step }}
    />
  );
}
