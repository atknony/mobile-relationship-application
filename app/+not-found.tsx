import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function NotFound() {
  return (
    <View className="flex-1 items-center justify-center bg-imm-bg gap-4 p-8">
      <Text className="font-nunito-bold text-imm-text text-xl">Page not found</Text>
      <Link href="/(home)/" className="font-nunito text-imm-blue underline">
        Go home
      </Link>
    </View>
  );
}
