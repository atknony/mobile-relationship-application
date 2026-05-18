import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/colors';

export function LoadingSpinner({ fullScreen = false }: { fullScreen?: boolean }) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-imm-bg">
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }
  return <ActivityIndicator size="small" color={colors.blue} />;
}
