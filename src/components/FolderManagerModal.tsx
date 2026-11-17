import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../types';
import { Theme, fonts } from '../theme';
import { BottomSheet } from './BottomSheet';
import { showAlert } from './ConfirmModal';

interface Props {
  visible: boolean;
  theme: Theme;
  folders: Folder[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Klasör yönetimi: oluştur / yeniden adlandır / sil */
export function FolderManagerModal({ visible, theme, folders, onAdd, onRename, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const submitNew = () => {
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName('');
  };

  const submitEdit = () => {
    if (editingId && editName.trim()) onRename(editingId, editName);
    setEditingId(null);
  };

  const confirmDelete = (f: Folder) =>
    showAlert(
      'Klasörü sil',
      `"${f.name}" klasörü silinecek. İçindeki notlar silinmez, "Kategorilenmemiş" olarak kalır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => onDelete(f.id) },
      ],
    );

  const close = () => {
    setEditingId(null);
    setNewName('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close} theme={theme}>
      <Text style={[styles.title, { color: theme.text, fontFamily: theme.fonts.bold }]}>Klasörler</Text>

      <View style={[styles.inputRow, { backgroundColor: theme.background }]}>
        <Ionicons name="add" size={20} color={theme.accent} />
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Yeni klasör adı"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, fontFamily: theme.fonts.regular }]}
          onSubmitEditing={submitNew}
          returnKeyType="done"
          maxLength={40}
        />
        <TouchableOpacity onPress={submitNew} disabled={!newName.trim()} hitSlop={8}>
          <Text style={[styles.add, { color: newName.trim() ? theme.accent : theme.textTertiary, fontFamily: theme.fonts.semiBold }]}>Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 6 }}>
        {folders.length === 0 && (
          <Text style={[styles.empty, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>Henüz klasör yok</Text>
        )}
        {folders.map((f) => (
          <View key={f.id} style={styles.row}>
            <Ionicons name="folder" size={20} color={theme.accent} />
            {editingId === f.id ? (
              <>
                <TextInput
                  autoFocus
                  value={editName}
                  onChangeText={setEditName}
                  onSubmitEditing={submitEdit}
                  style={[styles.editInput, { color: theme.text, borderColor: theme.accent, fontFamily: theme.fonts.regular }]}
                  maxLength={40}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={submitEdit} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="checkmark" size={22} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.name, { color: theme.text, fontFamily: theme.fonts.regular }]} numberOfLines={1}>
                  {f.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingId(f.id);
                    setEditName(f.name);
                  }}
                  hitSlop={8}
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil-outline" size={19} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(f)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 17, marginBottom: 10, paddingHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    gap: 6,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  add: { fontFamily: fonts.semiBold, fontSize: 14 },
  empty: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 12 },
  name: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
  editInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    borderBottomWidth: 1.5,
    paddingVertical: 2,
  },
  iconBtn: { padding: 4 },
});
