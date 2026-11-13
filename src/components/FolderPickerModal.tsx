import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../types';
import { Theme, fonts } from '../theme';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  folders: Folder[];
  /** Seçili klasör (null = Kategorilenmemiş, undefined = hiçbiri işaretli değil) */
  currentFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

/** "Şuraya taşı" klasör seçim penceresi */
export function FolderPickerModal({ visible, theme, folders, currentFolderId, onSelect, onClose }: Props) {
  const Row = ({ label, id }: { label: string; id: string | null }) => {
    const active = currentFolderId !== undefined && currentFolderId === id;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={() => onSelect(id)}>
        <Ionicons
          name={id === null ? 'file-tray-outline' : 'folder-outline'}
          size={20}
          color={theme.accent}
        />
        <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        {active && <Ionicons name="checkmark" size={20} color={theme.accent} />}
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme}>
      <Text style={[styles.title, { color: theme.text }]}>Şuraya taşı</Text>
      <ScrollView keyboardShouldPersistTaps="handled">
        {folders.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textTertiary }]}>Henüz klasör oluşturulmadı</Text>
        ) : (
          folders.map((f) => <Row key={f.id} label={f.name} id={f.id} />)
        )}
      </ScrollView>
      <View style={{ height: 4 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 17, marginBottom: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 12 },
  label: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
  empty: { fontFamily: fonts.regular, fontSize: 14, paddingVertical: 16, textAlign: 'center' },
});
