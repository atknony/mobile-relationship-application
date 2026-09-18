import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { currentLanguage, LANGUAGE_NAMES, LANGUAGES, type Language } from '@/lib/i18n';
import { switchLanguage } from '@/lib/languageTransition';
import { colors } from '@/constants/colors';

const HAIRLINE = { height: 1, backgroundColor: 'rgba(45,27,105,0.07)' } as const;

function CheckGlyph() {
  // Warm: it marks *your* choice — the same coding as everywhere else.
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        d="M3.5 9.5 L7.5 13.5 L14.5 4.5"
        stroke={colors.emberText}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Every supported language as a list — grows with LANGUAGES, no layout change.
 * Each row leads with the language's own name (the one its speakers can read)
 * and, underneath, its name in the current language.
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
          const ownName = LANGUAGE_NAMES[language];
          const localName = t(`languages.${language}`);
          return (
            <Fragment key={language}>
              {i > 0 ? <View style={HAIRLINE} /> : null}
              <Pressable
                onPress={() => choose(language)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={ownName === localName ? ownName : `${ownName}, ${localName}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    className={selected ? 'font-nunito-semibold text-imm-text' : 'font-nunito text-imm-text'}
                    style={{ fontSize: 16 }}
                  >
                    {ownName}
                  </Text>
                  {ownName !== localName ? (
                    <Text className="font-nunito text-imm-muted" style={{ fontSize: 12 }}>
                      {localName}
                    </Text>
                  ) : null}
                </View>
                {selected ? <CheckGlyph /> : null}
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </BottomSheet>
  );
}
