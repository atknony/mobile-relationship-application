import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/colors';

type Router = ReturnType<typeof useRouter>;
type Href = Parameters<Router['replace']>[0];

/** A chevron drawn from two borders of a rotated square — no icon font, no emoji. */
function BackGlyph() {
  return (
    <View
      style={{
        width: 9,
        height: 9,
        borderLeftWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: colors.text,
        transform: [{ rotate: '45deg' }],
        marginLeft: 3,
      }}
    />
  );
}

/**
 * The 34px circle that gets you back out of a pushed screen.
 *
 * `fallback` is where to land when there is nothing to pop. A screen can be
 * reached by a guard `replace` rather than a push, and `back()` on an empty
 * history does nothing at all — a dead button, which is the failure this is
 * here to prevent. It must name a route in the *current* group: which group
 * you belong in is the root guard's decision, and a manual jump across groups
 * is replaced on the next render.
 */
export function BackButton({
  fallback,
  accessibilityLabel,
}: {
  fallback: Href;
  accessibilityLabel?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const handlePress = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      accessibilityLabel={accessibilityLabel ?? t('common.back')}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BackGlyph />
    </Pressable>
  );
}
