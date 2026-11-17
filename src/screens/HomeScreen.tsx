import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { showAlert } from '../components/ConfirmModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore, sortNotes } from '../store/useStore';
import { useTheme } from '../theme/useTheme';
import { FAB_COLOR, fonts, Theme } from '../theme';
import { RootStackParamList } from '../types';
import { FolderBar } from '../components/FolderBar';
import { DraggableGrid } from '../components/DraggableGrid';
import { getNotePlainText } from '../utils/blocks';
import { setFoldersMoveCallback } from './FoldersScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const filter = useStore((s) => s.activeFilter);
  const fontSize = useStore((s) => s.fontSize);
  const sortBy = useStore((s) => s.sortBy);
  const layoutMode = useStore((s) => s.layoutMode);
  const setFilter = useStore((s) => s.setActiveFilter);
  const deleteNotes = useStore((s) => s.deleteNotes);
  const setPinned = useStore((s) => s.setPinned);
  const moveNotes = useStore((s) => s.moveNotes);
  const reorderNotes = useStore((s) => s.reorderNotes);

  const [selected, setSelected] = useState<string[]>([]);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastText(null);
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectionMode = selected.length > 0;
  const searchActive = searchFocused || searchQuery.trim().length > 0;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Silinen klasör aktifse "Tümü"ne dön
  useEffect(() => {
    if (filter !== 'all' && !folders.some((f) => f.id === filter)) {
      setFilter('all');
    }
  }, [folders, filter, setFilter]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    let list =
      filter === 'all'
        ? notes
        : filter === 'none'
          ? notes.filter((n) => n.folderId === null)
          : notes.filter((n) => n.folderId === filter);

    if (q.length > 0) {
      // Arama aktifken tüm notlarda veya seçili klasörde başlık + içerik eşleşmesi
      list = list.filter(
        (n) =>
          n.title.toLocaleLowerCase('tr-TR').includes(q) ||
          getNotePlainText(n.content).toLocaleLowerCase('tr-TR').includes(q),
      );
    }
    return sortNotes(list, sortBy);
  }, [notes, filter, searchQuery, sortBy]);

  // Görünmeyen notlar seçili kalmasın
  useEffect(() => {
    setSelected((cur) => {
      const ids = new Set(visible.map((n) => n.id));
      const next = cur.filter((id) => ids.has(id));
      return next.length === cur.length ? cur : next;
    });
  }, [visible]);

  const cancelSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  // Donanımsal geri tuşu seçim modunu veya aramayı kapatır
  useEffect(() => {
    if (!selectionMode && !searchActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectionMode) {
        setSelected([]);
        return true;
      }
      if (searchActive) {
        cancelSearch();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectionMode, searchActive, cancelSearch]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const onPressNote = useCallback(
    (id: string, cx: number, cy: number) => {
      if (selectedRef.current.length > 0) toggle(id);
      else navigation.navigate('Editor', { noteId: id, originX: cx, originY: cy });
    },
    [navigation, toggle],
  );

  const onLongPressNote = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur : [...cur, id]));
  }, []);

  const allSelected = visible.length > 0 && selected.length === visible.length;

  const selectedNotes = notes.filter((n) => selectedSet.has(n.id));
  const allPinned = selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);

  const doPin = () => {
    setPinned(selected, !allPinned);
    setSelected([]);
  };

  const doDelete = () => {
    const count = selected.length;
    showAlert('Notları sil', `${count} not silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteNotes(selected);
          setSelected([]);
        },
      },
    ]);
  };

  const newNote = () => {
    const folderId = filter === 'all' || filter === 'none' ? null : filter;
    navigation.navigate('Editor', { folderId, fromFab: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Üst bar: Seçim Modu veya Arama + Ayarlar Barı */}
      {selectionMode ? (
        <View style={styles.selHeader}>
          <TouchableOpacity onPress={() => setSelected([])} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.selTitle, { color: theme.text, fontFamily: theme.fonts.semiBold }]}>
            {selected.length} öge seçildi
          </Text>
          <TouchableOpacity
            onPress={() => setSelected(allSelected ? [] : visible.map((n) => n.id))}
            hitSlop={10}
            style={styles.headerBtn}
          >
            <MaterialCommunityIcons
              name={allSelected ? 'checkbox-multiple-marked' : 'checkbox-multiple-marked-outline'}
              size={24}
              color={allSelected ? theme.accent : theme.text}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchHeader}>
          <View style={[styles.searchBox, { backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Notlarda ara"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text, fontFamily: theme.fonts.regular }]}
              returnKeyType="search"
              selectionColor={theme.accent}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={[styles.clearCircle, { backgroundColor: theme.checkEmpty }]}
              >
                <Ionicons name="close" size={13} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          {searchActive ? (
            <TouchableOpacity onPress={cancelSearch} hitSlop={8} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { fontFamily: theme.fonts.semiBold }]}>İptal</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRightBtns}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Calendar')}
                hitSlop={10}
                style={styles.headerBtn}
              >
                <Ionicons name="calendar-outline" size={23} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                hitSlop={10}
                style={styles.headerBtn}
              >
                <Ionicons name="settings-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Klasör barı (arama aktif değilken gösterilir) */}
      {!searchActive && (
        <FolderBar
          theme={theme}
          folders={folders}
          active={filter}
          onChange={(f) => {
            setFilter(f);
            setSelected([]);
          }}
          onManage={() => navigation.navigate('Folders')}
        />
      )}

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={44} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>
            {searchQuery.trim() ? 'Eşleşen not bulunamadı' : 'Burada henüz not yok'}
          </Text>
        </View>
      ) : (
        <DraggableGrid
          notes={visible}
          theme={theme}
          selectedIds={selected}
          selectionMode={selectionMode}
          searchQuery={searchQuery}
          layoutMode={layoutMode}
          fontSize={fontSize}
          sortBy={sortBy}
          width={width}
          bottomInset={selectionMode ? 70 : 90}
          onPressNote={onPressNote}
          onLongPressNote={onLongPressNote}
          onReorder={reorderNotes}
        />
      )}

      {/* FAB */}
      {!selectionMode && !searchActive && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={newNote}
          style={[styles.fab, { backgroundColor: theme.accent, bottom: insets.bottom + 18 }]}
        >
          <Ionicons name="add" size={35} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Alt 3'lü aksiyon paneli */}
      {selectionMode && (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: 8,
            },
          ]}
        >
          <ActionButton
            icon={
              <MaterialCommunityIcons
                name={allPinned ? 'pin-off-outline' : 'pin-outline'}
                size={23}
                color={theme.text}
              />
            }
            label={allPinned ? 'İğnelemeyi kaldır' : 'İğnele'}
            color={theme.text}
            theme={theme}
            onPress={doPin}
          />
          <ActionButton
            icon={<Ionicons name="folder-open-outline" size={23} color={theme.text} />}
            label="Şuraya taşı"
            color={theme.text}
            theme={theme}
            onPress={() => {
              setFoldersMoveCallback((_folderId, folderName, count) => {
                setSelected([]);
                showToast(`${count} not ${folderName} klasörüne taşındı`);
              });
              navigation.navigate('Folders', {
                moveNoteIds: selected,
              });
            }}
          />
          <ActionButton
            icon={<Ionicons name="trash-outline" size={23} color={theme.text} />}
            label="Sil"
            color={theme.text}
            theme={theme}
            onPress={doDelete}
          />
        </View>
      )}

      {toastText && (
        <View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            { bottom: (selectionMode ? 76 : 26) + insets.bottom },
          ]}
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
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  theme,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.action} activeOpacity={0.6} onPress={onPress}>
      {icon}
      <Text style={[styles.actionLabel, { color, fontFamily: theme.fonts.regular }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selHeader: {
    height: 48,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchHeader: {
    height: 50,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    gap: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 4,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 15.5,
    color: '#2E7CF6',
  },
  headerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  selTitle: { fontFamily: fonts.semiBold, fontSize: 17 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 80 },
  emptyText: { fontFamily: fonts.regular, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  action: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  actionLabel: { fontFamily: fonts.regular, fontSize: 11.5 },
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
