import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder, FolderFilter } from '../types';
import { Theme, fonts } from '../theme';

interface Props {
  theme: Theme;
  folders: Folder[];
  active: FolderFilter;
  onChange: (f: FolderFilter) => void;
  onManage: () => void;
}

export function FolderBar({ theme, folders, active, onChange, onManage }: Props) {
  const Pill = ({ id, label }: { id: FolderFilter; label: string }) => {
    const selected = active === id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange(id)}
        style={[styles.pill, { backgroundColor: selected ? theme.pillSelected : theme.pill }]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.pillText,
            { color: selected ? theme.pillSelectedText : theme.textSecondary },
            selected && { fontFamily: fonts.semiBold },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={styles.flex}
      >
        <Pill id="all" label="Tümü" />
        {folders.map((f) => (
          <Pill key={f.id} id={f.id} label={f.name} />
        ))}
      </ScrollView>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onManage}
        style={[styles.manage, { backgroundColor: theme.pill }]}
      >
        <Ionicons name="folder" size={18} color={theme.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, marginBottom: 10 },
  flex: { flex: 1 },
  scroll: { paddingLeft: 12, paddingRight: 8, gap: 8, alignItems: 'center' },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.regular, fontSize: 14 },
  manage: { width: 38, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
