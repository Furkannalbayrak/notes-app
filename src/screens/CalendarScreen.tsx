import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { showAlert } from '../components/ConfirmModal';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme';
import { CalendarNote, RootStackParamList } from '../types';
import {
  DAY_NAMES_SHORT,
  MONTH_NAMES,
  formatFullDisplayDate,
  formatDateParts,
  generateMonthGrid,
  getTodayKey,
  parseDateKey,
  toDateKey,
} from '../utils/calendar';

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

export default function CalendarScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Akıcı ekran açılış / kapanış animasyonu
  const progress = useSharedValue(0);
  const closingRef = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 380,
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
        { duration: 340, easing: Easing.bezier(0.22, 1, 0.36, 1) },
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

  // Store'daki takvim notları
  const calendarNotes = useStore((s) => s.calendarNotes);
  const createCalendarNote = useStore((s) => s.createCalendarNote);
  const updateCalendarNote = useStore((s) => s.updateCalendarNote);
  const deleteCalendarNote = useStore((s) => s.deleteCalendarNote);

  // Tarih durumu
  const todayKey = useMemo(() => getTodayKey(), []);
  const todayParsed = useMemo(() => parseDateKey(todayKey), [todayKey]);

  const [currentYear, setCurrentYear] = useState<number>(todayParsed.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayParsed.month);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Düzenleme / Ekleme modal durumu
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Ayın günleri
  const monthCells = useMemo(
    () => generateMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // Hangi günlerde not var haritası: { '2026-11-14': count }
  const notesCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of calendarNotes) {
      map[n.date] = (map[n.date] ?? 0) + 1;
    }
    return map;
  }, [calendarNotes]);

  // Seçili günün notları
  const selectedDateNotes = useMemo(() => {
    return calendarNotes.filter((n) => n.date === selectedDate);
  }, [calendarNotes, selectedDate]);

  // Seçili tarihin parçaları (tarih ve gün adı iki satır için)
  const dateParts = useMemo(() => formatDateParts(selectedDate), [selectedDate]);

  // Ay değiştirme
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(todayParsed.year);
    setCurrentMonth(todayParsed.month);
    setSelectedDate(todayKey);
  };

  // Not oluşturma modalını aç
  const openNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setEditorVisible(true);
  };

  // Not düzenleme modalını aç
  const openEditNote = (note: CalendarNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setEditorVisible(true);
  };

  // Not kaydet
  const saveNote = () => {
    const t = noteTitle.trim();
    const c = noteContent.trim();
    if (!t && !c) {
      setEditorVisible(false);
      return;
    }

    if (editingNote) {
      updateCalendarNote(editingNote.id, { title: t, content: c });
    } else {
      createCalendarNote({ date: selectedDate, title: t, content: c });
    }
    setEditorVisible(false);
  };

  // Not sil
  const confirmDelete = (noteId: string) => {
    showAlert('Notu Sil', 'Bu takvim notu silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => deleteCalendarNote(noteId),
      },
    ]);
  };

  const isCurrentViewToday =
    currentYear === todayParsed.year && currentMonth === todayParsed.month;

  return (
    <View style={styles.root}>
      {/* Arka plan karartması */}
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { backgroundColor: '#000000' }, backdropStyle]}
      />

      {/* Kayarak gelen ana ekran */}
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
          slideStyle,
        ]}
      >
        {/* Üst Bar: Geri Tuşu, Başlık, Bugün Butonu */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.backBtn}
            accessibilityLabel="Geri"
          >
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.topTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            Takvim
          </Text>

          <TouchableOpacity
            onPress={jumpToToday}
            activeOpacity={0.7}
            style={[
              styles.todayBtn,
              {
                backgroundColor: isCurrentViewToday && selectedDate === todayKey
                  ? theme.surface
                  : theme.surface,
                borderColor: theme.accent,
              },
            ]}
          >
            <Ionicons name="today-outline" size={16} color={theme.accent} />
            <Text style={[styles.todayBtnText, { color: theme.accent, fontFamily: theme.fonts.semiBold }]}>
              Bugün
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ay Gezinme Çubuğu: < Kasım 2026 > */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.monthTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>

          <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Gün İsimleri Başlıkları (Pzt, Sal, Çar, Per, Cum, Cmt, Paz) */}
        <View style={styles.weekDaysRow}>
          {DAY_NAMES_SHORT.map((name, idx) => (
            <View key={idx} style={styles.weekDayCol}>
              <Text
                style={[
                  styles.weekDayText,
                  {
                    color: idx >= 5 ? theme.textTertiary : theme.textSecondary,
                    fontFamily: theme.fonts.semiBold,
                  },
                ]}
              >
                {name}
              </Text>
            </View>
          ))}
        </View>

        {/* Takvim Günleri Izgarası */}
        <View style={styles.grid}>
          {monthCells.map((cell) => {
            const isSelected = cell.dateKey === selectedDate;
            const hasNotes = (notesCountByDate[cell.dateKey] ?? 0) > 0;

            return (
              <TouchableOpacity
                key={cell.dateKey}
                activeOpacity={0.65}
                onPress={() => {
                  setSelectedDate(cell.dateKey);
                  // Farklı aya tıklandıysa ayı güncelle
                  if (cell.month !== currentMonth || cell.year !== currentYear) {
                    setCurrentYear(cell.year);
                    setCurrentMonth(cell.month);
                  }
                }}
                style={styles.dayCol}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: theme.accent },
                    cell.isToday && !isSelected && {
                      borderWidth: 1.5,
                      borderColor: theme.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        fontFamily: isSelected || cell.isToday ? theme.fonts.bold : theme.fonts.regular,
                        color: isSelected
                          ? '#000000'
                          : cell.isCurrentMonth
                          ? theme.text
                          : theme.textTertiary,
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>

                  {/* Not Noktası */}
                  {hasNotes && (
                    <View
                      style={[
                        styles.noteDot,
                        {
                          backgroundColor: isSelected ? '#000000' : theme.accent,
                        },
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Seçili Gün Detay Alanı */}
        <View style={[styles.dayDetailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dayDetailHeader}>
            <View style={styles.dayTitleWrap}>
              <Ionicons name="calendar-outline" size={22} color={theme.accent} />
              <View style={styles.dateCol}>
                <Text
                  style={[styles.dayDetailDate, { color: theme.text, fontFamily: theme.fonts.bold }]}
                  numberOfLines={1}
                >
                  {dateParts.dateStr}
                </Text>
                <Text
                  style={[styles.dayDetailWeekDay, { color: theme.textSecondary, fontFamily: theme.fonts.semiBold }]}
                  numberOfLines={1}
                >
                  {dateParts.dayName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={openNewNote}
              activeOpacity={0.7}
              style={[styles.addNoteBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="add" size={20} color="#000000" />
              <Text style={[styles.addNoteBtnText, { fontFamily: theme.fonts.bold }]}>
                Not Ekle
              </Text>
            </TouchableOpacity>
          </View>

          {/* Günün Notları Listesi */}
          <ScrollView
            style={styles.notesList}
            contentContainerStyle={[
              styles.notesListContent,
              { paddingBottom: 24 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {selectedDateNotes.length === 0 ? (
              null
            ) : (
              selectedDateNotes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  activeOpacity={0.75}
                  onPress={() => openEditNote(note)}
                  style={[
                    styles.noteCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.noteCardTop}>
                    {note.title ? (
                      <Text
                        style={[
                          styles.noteCardTitle,
                          { color: theme.text, fontFamily: theme.fonts.bold },
                        ]}
                        numberOfLines={1}
                      >
                        {note.title}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.noteCardContentTop,
                          { color: theme.text, fontFamily: theme.fonts.regular },
                        ]}
                        numberOfLines={3}
                      >
                        {note.content}
                      </Text>
                    )}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => openEditNote(note)}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons name="pencil-outline" size={17} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(note.id)}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons name="trash-outline" size={17} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {note.title && note.content ? (
                    <Text
                      style={[
                        styles.noteCardContent,
                        { color: theme.textSecondary, fontFamily: theme.fonts.regular },
                      ]}
                      numberOfLines={3}
                    >
                      {note.content}
                    </Text>
                  ) : null}

                  <Text
                    style={[
                      styles.noteCardTime,
                      { color: theme.textTertiary, fontFamily: theme.fonts.regular },
                    ]}
                  >
                    {new Date(note.updatedAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
        {insets.bottom > 0 && (
          <View style={{ height: insets.bottom, backgroundColor: theme.navBar }} />
        )}
      </Animated.View>

      {/* Not Ekleme / Düzenleme Modalı */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.editorModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.editorContainer,
              { backgroundColor: theme.surface, paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0, 24) + 20 },
            ]}
          >
            {/* Modal Üst Barı */}
            <View style={styles.editorHeader}>
              <TouchableOpacity
                onPress={() => setEditorVisible(false)}
                hitSlop={8}
                style={styles.editorCancelBtn}
              >
                <Text style={[styles.editorCancelText, { color: theme.textSecondary, fontFamily: theme.fonts.regular }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>

              <View style={styles.editorTitleWrap}>
                <Text
                  style={[styles.editorDateTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}
                  numberOfLines={1}
                >
                  {formatFullDisplayDate(selectedDate)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={saveNote}
                hitSlop={8}
                style={[styles.editorSaveBtn, { backgroundColor: theme.accent }]}
              >
                <Ionicons name="checkmark" size={20} color="#000000" />
                <Text style={[styles.editorSaveText, { fontFamily: theme.fonts.bold }]}>
                  Kaydet
                </Text>
              </TouchableOpacity>
            </View>

            {/* Başlık Girişi */}
            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Başlık (isteğe bağlı)"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.titleInput,
                { color: theme.text, fontFamily: theme.fonts.bold },
              ]}
              maxLength={120}
              returnKeyType="next"
            />

            <View style={[styles.editorDivider, { backgroundColor: theme.border }]} />

            {/* İçerik Girişi */}
            <TextInput
              autoFocus
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Notunuzu buraya yazın..."
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.contentInput,
                { color: theme.text, fontFamily: theme.fonts.regular },
              ]}
              multiline
              textAlignVertical="top"
              selectionColor={theme.accent}
            />
          </View>
          {insets.bottom > 0 && (
            <View style={{ height: insets.bottom, backgroundColor: theme.navBar }} />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    flex: 1,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 13,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 19,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  dayCol: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
  },
  noteDot: {
    position: 'absolute',
    bottom: 3,
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
  },
  dayDetailCard: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  dayTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  dateCol: {
    flex: 1,
    justifyContent: 'center',
  },
  dayDetailDate: {
    fontSize: 16,
    lineHeight: 20,
  },
  dayDetailWeekDay: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 1,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
  },
  addNoteBtnText: {
    color: '#000000',
    fontSize: 14.5,
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    padding: 12,
    gap: 10,
  },
  emptyDayNotes: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyDayText: {
    fontSize: 14,
  },
  noteCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  noteCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  noteCardTitle: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  noteCardContentTop: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    marginRight: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 2,
  },
  noteCardContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteCardTime: {
    fontSize: 11.5,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  editorModalRoot: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  editorCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  editorCancelText: {
    fontSize: 15,
  },
  editorTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  editorDateTitle: {
    fontSize: 15.5,
  },
  editorSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editorSaveText: {
    color: '#000000',
    fontSize: 13.5,
  },
  titleInput: {
    fontSize: 18,
    paddingVertical: 8,
  },
  editorDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    lineHeight: 22,
  },
});
