import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-imm-bg gap-4 p-8">
      <Text className="font-nunito-bold text-imm-text text-xl">{t('notFound.title')}</Text>
      <Link href="/(home)/" className="font-nunito text-imm-blue underline">
        {t('notFound.goHome')}
      </Link>
    </View>
  );
}
