import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { fonts } from '../theme';
import { FolderFilter, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Folders'>;

export default function FoldersScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

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

  const folders = useStore((s) => s.folders);
  const notes = useStore((s) => s.notes);
  const activeFilter = useStore((s) => s.activeFilter);
  const setActiveFilter = useStore((s) => s.setActiveFilter);
  const addFolder = useStore((s) => s.addFolder);
  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolders = useStore((s) => s.deleteFolders);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');

  const selectionMode = selectedIds.length > 0;

  useEffect(() => {
    if (!selectionMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedIds([]);
      return true;
    });
    return () => sub.remove();
  }, [selectionMode]);

  const selectFilter = (filter: FolderFilter) => {
    setActiveFilter(filter);
    navigation.goBack();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const openNewModal = () => {
    setEditingId(null);
    setFolderName('');
    setModalOpen(true);
  };

  const openRenameModal = (id: string, currentName: string) => {
    setEditingId(id);
    setFolderName(currentName);
    setModalOpen(true);
  };

  const submitModal = () => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (editingId) {
      renameFolder(editingId, trimmed);
    } else {
      addFolder(trimmed);
    }
    setModalOpen(false);
    setFolderName('');
    setEditingId(null);
  };

  const handleTrashPress = () => {
    if (folders.length === 0) return;
    if (!selectionMode) {
      // Silme moduna geç: tüm özel klasörlerden ilkini seç veya seçim modunu başlat
      setSelectedIds([folders[0].id]);
      return;
    }
    Alert.alert(
      'Klasörleri sil',
      `Seçilen ${selectedIds.length} klasör silinecek. İçindeki notlar silinmez, Kategorilenmemiş olarak kalır.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteFolders(selectedIds);
            setSelectedIds([]);
          },
        },
      ],
    );
  };

  const renderFolderCard = ({
    id,
    label,
    count,
    isCustom,
  }: {
    id: FolderFilter;
    label: string;
    count: number;
    isCustom?: boolean;
  }) => {
    const isActive = activeFilter === id;
    const isSelectedForDelete = isCustom && selectedIds.includes(id);

    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.75}
        onPress={() => {
          if (selectionMode) {
            if (isCustom) toggleSelect(id);
          } else {
            selectFilter(id);
          }
        }}
        onLongPress={() => {
          if (!isCustom) return;
          if (!selectionMode) {
            setSelectedIds([id]);
          } else {
            openRenameModal(id, label);
          }
        }}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: isSelectedForDelete ? theme.accent : 'transparent',
          },
        ]}
      >
        <View style={styles.checkSlot}>
          {!selectionMode && isActive && (
            <Ionicons name="checkmark" size={20} color={theme.accent} />
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.cardTitle,
            {
              color: theme.text,
              fontFamily: isActive && !selectionMode ? fonts.bold : fonts.regular,
            },
          ]}
        >
          {label}
        </Text>
        {selectionMode && isCustom ? (
          <View style={styles.rightRow}>
            <TouchableOpacity
              onPress={() => openRenameModal(id, label)}
              hitSlop={8}
              style={styles.renameBtn}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <View
              style={[
                styles.checkbox,
                isSelectedForDelete
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: theme.checkEmpty },
              ]}
            >
              {isSelectedForDelete && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
          </View>
        ) : (
          <Text
            style={[
              styles.count,
              {
                color: isActive ? theme.text : theme.textSecondary,
                fontFamily: isActive ? fonts.bold : fonts.regular,
              },
            ]}
          >
            {count}
          </Text>
        )}
      </TouchableOpacity>
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
        {selectionMode ? (
          <TouchableOpacity onPress={() => setSelectedIds([])} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
        )}

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectionMode ? `${selectedIds.length} klasör seçildi` : 'Klasörler'}
        </Text>

        <TouchableOpacity
          onPress={handleTrashPress}
          disabled={folders.length === 0}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons
            name="trash-outline"
            size={23}
            color={
              folders.length === 0
                ? theme.textTertiary
                : selectionMode
                  ? theme.danger
                  : theme.text
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderFolderCard({ id: 'all', label: 'Tümü', count: notes.length })}

        {folders.map((f) => {
          const count = notes.filter((n) => n.folderId === f.id).length;
          return renderFolderCard({ id: f.id, label: f.name, count, isCustom: true });
        })}

        {/* Yeni Klasör Kartı */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={openNewModal}
          style={[styles.newCard, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.plusCircle, { backgroundColor: theme.accent }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.newLabel, { color: theme.textSecondary }]}>Yeni klasör</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Yeni Klasör / Yeniden Adlandır Dialog */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.overlay }]}
            onPress={() => setModalOpen(false)}
          />
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>
              {editingId ? 'Klasörü yeniden adlandır' : 'Yeni klasör'}
            </Text>
            <TextInput
              autoFocus
              value={folderName}
              onChangeText={setFolderName}
              placeholder="Klasör adı girin"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.dialogInput,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.accent,
                },
              ]}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={submitModal}
              selectionColor={theme.accent}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={[styles.dialogBtn, { backgroundColor: theme.pill }]}
              >
                <Text style={[styles.dialogBtnText, { color: theme.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitModal}
                disabled={!folderName.trim()}
                style={[
                  styles.dialogBtn,
                  {
                    backgroundColor: folderName.trim() ? theme.accent : theme.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dialogBtnText,
                    { color: folderName.trim() ? '#FFFFFF' : theme.textTertiary },
                  ]}
                >
                  Tamam
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: theme.background }} />
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.semiBold, fontSize: 19 },
  scroll: { paddingHorizontal: 14, gap: 10 },
  card: {
    minHeight: 58,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  checkSlot: { width: 28, alignItems: 'flex-start', justifyContent: 'center' },
  cardTitle: { flex: 1, fontSize: 17 },
  count: { fontSize: 14, marginLeft: 10 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  renameBtn: { padding: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCard: {
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  plusCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLabel: { fontFamily: fonts.regular, fontSize: 14.5 },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFill },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  dialogTitle: { fontFamily: fonts.bold, fontSize: 17, textAlign: 'center' },
  dialogInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15.5,
    borderWidth: 1,
  },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dialogBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnText: { fontFamily: fonts.semiBold, fontSize: 15 },
});
