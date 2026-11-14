import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/useTheme';
import { Theme, fonts } from '../theme';
import { FONT_CONFIGS } from '../theme/fonts';
import { AppFontFamily, AppFontSize, LayoutMode, RootStackParamList, SortOrder } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type PickerType = 'fontSize' | 'fontFamily' | 'sortBy' | 'layoutMode' | null;

const FONT_SIZE_LABELS: Record<AppFontSize, string> = {
  small: 'Küçük',
  medium: 'Orta',
  large: 'Büyük',
  huge: 'Çok büyük',
};

const SORT_LABELS: Record<SortOrder, string> = {
  updatedAt: 'Değiştirilme tarihine göre',
  createdAt: 'Oluşturulma tarihine göre',
};

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  grid: 'Izgara Görünümü',
  list: 'Liste Görünümü',
};

function Section({
  title,
  theme,
  children,
  showDivider = true,
}: {
  title: string;
  theme: Theme;
  children: React.ReactNode;
  showDivider?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>{title}</Text>
      <View>{children}</View>
      {showDivider && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
    </View>
  );
}

function StyleRow({
  label,
  valueText,
  theme,
  onPress,
}: {
  label: string;
  valueText: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} style={styles.styleRow}>
      <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.fonts.semiBold }]}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: theme.textSecondary, fontFamily: theme.fonts.regular }]}>{valueText}</Text>
        <Ionicons name="chevron-expand" size={17} color={theme.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const mode = useStore((s) => s.theme);
  const fontSize = useStore((s) => s.fontSize);
  const fontFamily = useStore((s) => s.fontFamily);
  const sortBy = useStore((s) => s.sortBy);
  const layoutMode = useStore((s) => s.layoutMode);

  const setTheme = useStore((s) => s.setTheme);
  const setFontSize = useStore((s) => s.setFontSize);
  const setFontFamily = useStore((s) => s.setFontFamily);
  const setSortBy = useStore((s) => s.setSortBy);
  const setLayoutMode = useStore((s) => s.setLayoutMode);

  const isDark = mode === 'dark';
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  const progress = useSharedValue(0);
  const closingRef = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 460,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [progress]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (closingRef.current) return;
      e.preventDefault();
      closingRef.current = true;
      const action = e.data.action;
      const finishClose = () => {
        navigation.dispatch(action);
      };
      progress.value = withTiming(
        0,
        { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) },
        (finished) => {
          if (finished) scheduleOnRN(finishClose);
        },
      );
    });
    return unsub;
  }, [navigation, progress]);

  const slideStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: (1 - progress.value) * width }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.45,
  }));

  const renderPickerContent = () => {
    if (activePicker === 'fontFamily') {
      const options: AppFontFamily[] = [
        'inter',
        'roboto',
        'poppins',
        'nunito',
        'lora',
        'playfair',
        'caveat',
        'jetbrains',
      ];
      return (
        <>
          <Text style={[styles.modalTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>Yazı tipi</Text>
          {options.map((opt) => {
            const cfg = FONT_CONFIGS[opt];
            const selected = fontFamily === opt;
            return (
              <TouchableOpacity
                key={opt}
                activeOpacity={0.65}
                onPress={() => {
                  setFontFamily(opt);
                  setActivePicker(null);
                }}
                style={[
                  styles.optionRow,
                  selected && { backgroundColor: isDark ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: selected ? theme.accent : theme.text,
                      fontFamily: cfg.regular,
                      fontSize: opt === 'caveat' ? 18.5 : 15.5,
                    },
                  ]}
                >
                  {cfg.label}
                </Text>
                {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activePicker === 'fontSize') {
      const options: AppFontSize[] = ['small', 'medium', 'large', 'huge'];
      return (
        <>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Yazı tipi boyutu</Text>
          {options.map((opt) => {
            const selected = fontSize === opt;
            return (
              <TouchableOpacity
                key={opt}
                activeOpacity={0.65}
                onPress={() => {
                  setFontSize(opt);
                  setActivePicker(null);
                }}
                style={[
                  styles.optionRow,
                  selected && { backgroundColor: isDark ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected ? theme.accent : theme.text, fontFamily: selected ? fonts.semiBold : fonts.regular },
                  ]}
                >
                  {FONT_SIZE_LABELS[opt]}
                </Text>
                {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activePicker === 'sortBy') {
      const options: SortOrder[] = ['updatedAt', 'createdAt'];
      return (
        <>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Sırala</Text>
          {options.map((opt) => {
            const selected = sortBy === opt;
            return (
              <TouchableOpacity
                key={opt}
                activeOpacity={0.65}
                onPress={() => {
                  setSortBy(opt);
                  setActivePicker(null);
                }}
                style={[
                  styles.optionRow,
                  selected && { backgroundColor: isDark ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected ? theme.accent : theme.text, fontFamily: selected ? fonts.semiBold : fonts.regular },
                  ]}
                >
                  {SORT_LABELS[opt]}
                </Text>
                {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activePicker === 'layoutMode') {
      const options: LayoutMode[] = ['grid', 'list'];
      return (
        <>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Düzen</Text>
          {options.map((opt) => {
            const selected = layoutMode === opt;
            return (
              <TouchableOpacity
                key={opt}
                activeOpacity={0.65}
                onPress={() => {
                  setLayoutMode(opt);
                  setActivePicker(null);
                }}
                style={[
                  styles.optionRow,
                  selected && { backgroundColor: isDark ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.12)' },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected ? theme.accent : theme.text, fontFamily: selected ? fonts.semiBold : fonts.regular },
                  ]}
                >
                  {LAYOUT_LABELS[opt]}
                </Text>
                {selected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, backdropStyle]}
      />
      <Animated.View style={[{ backgroundColor: theme.background, paddingTop: insets.top }, slideStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.bigTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>Notlar</Text>

          <Section title="Stil" theme={theme}>
            <StyleRow
              label="Yazı tipi"
              valueText={FONT_CONFIGS[fontFamily]?.label ?? 'Inter (Varsayılan)'}
              theme={theme}
              onPress={() => setActivePicker('fontFamily')}
            />
            <StyleRow
              label="Yazı tipi boyutu"
              valueText={FONT_SIZE_LABELS[fontSize]}
              theme={theme}
              onPress={() => setActivePicker('fontSize')}
            />
            <StyleRow
              label="Sırala"
              valueText={SORT_LABELS[sortBy]}
              theme={theme}
              onPress={() => setActivePicker('sortBy')}
            />
            <StyleRow
              label="Düzen"
              valueText={LAYOUT_LABELS[layoutMode]}
              theme={theme}
              onPress={() => setActivePicker('layoutMode')}
            />
          </Section>

          <Section title="Görünüm" theme={theme} showDivider={false}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setTheme(isDark ? 'light' : 'dark')}
              style={styles.styleRow}
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                {isDark ? 'Koyu Tema' : 'Açık Tema'}
              </Text>
              <Switch
                value={isDark}
                onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
                trackColor={{ false: theme.checkEmpty, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>
          </Section>
        </ScrollView>

        {/* Seçim Menüsü Modalı */}
        <Modal
          visible={activePicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
          statusBarTranslucent
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {renderPickerContent()}
            </Pressable>
          </Pressable>
        </Modal>

        {insets.bottom > 0 && (
          <View style={{ height: insets.bottom, backgroundColor: theme.background }} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: 22,
  },
  bigTitle: {
    fontFamily: fonts.regular,
    fontSize: 32,
    marginTop: 6,
    marginBottom: 22,
  },
  section: {
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    marginBottom: 10,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    gap: 16,
  },
  rowLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16.5,
    flexShrink: 0,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    gap: 6,
  },
  rowValue: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginBottom: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 2,
  },
  optionLabel: {
    fontSize: 15.5,
  },
});
