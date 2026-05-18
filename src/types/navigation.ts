// Typed route params for expo-router screens.
// Use: const { code } = useLocalSearchParams<{ code: string }>();

export interface AuthPhoneParams {
  redirectTo?: string;
}

export interface PairEnterParams {
  code?: string; // pre-filled from deep link
}
