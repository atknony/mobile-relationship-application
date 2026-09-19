import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { currentLanguage, LANGUAGE_NAMES, LANGUAGES, type Language } from '@/lib/i18n';
import { switchLanguage } from '@/lib/languageTransition';

const HAIRLINE = { height: 1, backgroundColor: 'rgba(45,27,105,0.07)' } as const;

/**
 * Every supported language as a list — grows with LANGUAGES, no layout change.
 * Each row is the language's own name (English, Türkçe, Español, 中文, 日本語), the
 * same whichever language the app is in: it is read by the person who speaks it.
 *
 * The current one is marked by colour alone — the accent, in ember-text, the
 * one warm colour that passes contrast as text (warm is *your* choice). Weight
 * and layout stay identical across rows, so choosing never shifts a line.
 */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const current = currentLanguage();

  const choose = (language: Language) => {
    onClose();
    // Starts together with the sheet's slide-out; the fade-out outlasts it, so
    // the sheet is gone before any text changes.
    if (language !== current) void switchLanguage(language);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('settings.language')}>
      <View accessibilityRole="radiogroup">
        {LANGUAGES.map((language, i) => {
          const selected = language === current;
          const name = LANGUAGE_NAMES[language];
          return (
            <Fragment key={language}>
              {i > 0 ? <View style={HAIRLINE} /> : null}
              <Pressable
                onPress={() => choose(language)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={name}
                accessibilityLanguage={language}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <Text
                  className={`font-nunito-semibold ${selected ? 'text-imm-ember-text' : 'text-imm-text'}`}
                  style={{ fontSize: 16 }}
                >
                  {name}
                </Text>
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </BottomSheet>
  );
}
