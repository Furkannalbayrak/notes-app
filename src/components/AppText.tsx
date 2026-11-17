import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';

/**
 * Uygulama geliştirilirken referans alınan sistem metin boyutu çarpanı (B / Büyük ≈ 1.15).
 * Tüm cihazlarda telefonun sistem metin boyutu (K / O / B / ÇB) ne olursa olsun
 * allowFontScaling={false} ile sistem ölçeklendirmesi kapatılır ve bu sabit çarpan uygulanır.
 */
export const APP_BASE_FONT_SCALE = 1.15;

function scaleTextStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!style) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;

  const hasFontSize = typeof flat.fontSize === 'number';
  const hasLineHeight = typeof flat.lineHeight === 'number';

  if (!hasFontSize && !hasLineHeight) {
    return style;
  }

  const scaledOverride: TextStyle = {};
  if (hasFontSize && typeof flat.fontSize === 'number') {
    scaledOverride.fontSize = Math.round(flat.fontSize * APP_BASE_FONT_SCALE * 100) / 100;
  }
  if (hasLineHeight && typeof flat.lineHeight === 'number') {
    scaledOverride.lineHeight = Math.round(flat.lineHeight * APP_BASE_FONT_SCALE * 100) / 100;
  }

  return [style, scaledOverride];
}

export type Text = RNText;
export const Text = React.forwardRef<RNText, TextProps>(function AppText(
  { style, allowFontScaling = false, ...rest },
  ref,
) {
  return (
    <RNText
      ref={ref}
      allowFontScaling={allowFontScaling}
      style={scaleTextStyle(style)}
      {...rest}
    />
  );
});

export type TextInput = RNTextInput;
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function AppTextInput(
  { style, allowFontScaling = false, ...rest },
  ref,
) {
  return (
    <RNTextInput
      ref={ref}
      allowFontScaling={allowFontScaling}
      style={scaleTextStyle(style)}
      {...rest}
    />
  );
});
