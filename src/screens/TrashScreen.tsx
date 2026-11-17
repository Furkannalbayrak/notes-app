import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
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
import { SEVEN_DAYS_MS, useStore } from '../store/useStore';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme';
import { RootStackParamList } from '../types';
import { getNotePlainText } from '../utils/blocks';
import { showAlert } from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Trash'>;

function formatRemainingDays(deletedAt: number): string {
  const elapsed = Date.now() - deletedAt;
  const remainingMs = Math.max(0, SEVEN_DAYS_MS - elapsed);
  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  if (days <= 1) return 'Son 1 gün';
  return `${days} gün kaldı`;
}

export default function TrashScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const progress = useSharedValue(0);
  const closingRef = useRef(false);

  const deletedNotes = useStore((s) => s.deletedNotes);
  const restoreNote = useStore((s) => s.restoreNote);
  const clearDeletedNotes = useStore((s) => s.clearDeletedNotes);
  const purgeExpiredDeletedNotes = useStore((s) => s.purgeExpiredDeletedNotes);

  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastText(null);
    }, 2200);
  }, []);

  useEffect(() => {
    // 7 günü geçen silinmiş notları otomatik temizle
    purgeExpiredDeletedNotes();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [purgeExpiredDeletedNotes]);

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

  const handleEmptyTrash = () => {
    if (deletedNotes.length === 0) return;
    showAlert(
      'Tümünü kalıcı olarak sil',
      `${deletedNotes.length} silinmiş not kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => clearDeletedNotes(),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, backdropStyle]}
      />
      <Animated.View style={[{ backgroundColor: theme.background, paddingTop: insets.top }, slideStyle]}>
        {/* Üst Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.fonts.semiBold }]}>
            Silinmiş öğeler
          </Text>

          {deletedNotes.length > 0 ? (
            <TouchableOpacity onPress={handleEmptyTrash} hitSlop={10} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={22} color={theme.danger} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <Text style={[styles.infoBanner, { color: theme.textSecondary, fontFamily: theme.fonts.regular }]}>
          Silinen notlar 7 gün sonra otomatik olarak kalıcı silinir.
        </Text>

        {deletedNotes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="trash-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>
              Silinmiş not yok
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
            showsVerticalScrollIndicator={false}
          >
            {deletedNotes.map((note) => {
              const plain = getNotePlainText(note.content).trim();
              const hasTitle = note.title.trim().length > 0;
              return (
                <View
                  key={note.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.cardBody}>
                    {hasTitle ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.cardTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}
                      >
                        {note.title}
                      </Text>
                    ) : null}

                    {plain.length > 0 ? (
                      <Text
                        numberOfLines={hasTitle ? 2 : 3}
                        style={[
                          styles.cardPreview,
                          {
                            color: hasTitle ? theme.textSecondary : theme.text,
                            fontFamily: theme.fonts.regular,
                          },
                        ]}
                      >
                        {plain}
                      </Text>
                    ) : !hasTitle ? (
                      <Text
                        style={[
                          styles.cardPreview,
                          { color: theme.textTertiary, fontFamily: theme.fonts.regular },
                        ]}
                      >
                        Boş not
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.cardMeta,
                        { color: theme.textTertiary, fontFamily: theme.fonts.regular },
                      ]}
                    >
                      {formatRemainingDays(note.deletedAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      restoreNote(note.id);
                      showToast('Not kategorisiz olarak geri yüklendi');
                    }}
                    hitSlop={8}
                    style={[styles.restoreBtn, { backgroundColor: theme.accentSoft }]}
                  >
                    <Ionicons name="refresh" size={21} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        {toastText && (
          <View
            pointerEvents="none"
            style={[styles.toastWrap, { bottom: insets.bottom + 26 }]}
          >
            <View style={[styles.toastPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.toastText, { color: theme.text, fontFamily: theme.fonts.regular }]}>
                {toastText}
              </Text>
            </View>
          </View>
        )}

        {insets.bottom > 0 && (
          <View style={{ height: insets.bottom, backgroundColor: theme.navBar }} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.semiBold, fontSize: 19 },
  infoBanner: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 15,
  },
  scroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16.5,
  },
  cardPreview: {
    fontSize: 14,
    lineHeight: 19,
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  restoreBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  toastPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: {
    fontSize: 13.5,
    textAlign: 'center',
  },
});
