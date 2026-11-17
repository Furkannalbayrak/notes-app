import React from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { Text } from './AppText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppFontSize, LayoutMode, Note, SortOrder } from '../types';
import { Theme, fonts } from '../theme';
import { formatSmartDate } from '../utils/date';
import { getNotePlainText } from '../utils/blocks';

export const CARD_HEIGHT = 146;
export const LIST_CARD_HEIGHT = 114;
export const CARD_GAP = 10;
const HIGHLIGHT_COLOR = '#E05246';

const FONT_DELTA: Record<AppFontSize, number> = {
  small: -1.5,
  medium: 0,
  large: 1.5,
  huge: 3,
};

interface Props {
  note: Note;
  theme: Theme;
  selected: boolean;
  selectionMode: boolean;
  searchQuery?: string;
  layoutMode?: LayoutMode;
  fontSize?: AppFontSize;
  sortBy?: SortOrder;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightedText({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query?: string;
  style: TextStyle | TextStyle[];
  numberOfLines: number;
}) {
  const q = query?.trim();
  if (!q) {
    return (
      <Text numberOfLines={numberOfLines} ellipsizeMode="tail" style={style}>
        {text}
      </Text>
    );
  }
  const regex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = text.split(regex);
  const qLower = q.toLocaleLowerCase('tr-TR');

  return (
    <Text numberOfLines={numberOfLines} ellipsizeMode="tail" style={style}>
      {parts.map((part, idx) =>
        part.toLocaleLowerCase('tr-TR') === qLower ? (
          <Text key={idx} style={{ color: HIGHLIGHT_COLOR }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/**
 * Kart önizleme metnini hazırlar:
 * - Boş satırları (fazladan Enter'ları) kaldırır ki erken "..." oluşmasın.
 * - Eğer kartın izin verdiği satır sayısından (maxLines: 3 veya 4) daha fazla satır varsa,
 *   taşan satırları boşlukla birleştirir; böylece son satır tamamen dolup doğal olarak "..." ile biter.
 */
function formatPreviewContent(raw: string, maxLines: number): string {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return '';
  if (lines.length <= maxLines) {
    return lines.join('\n');
  }
  const head = lines.slice(0, maxLines - 1);
  const tail = lines.slice(maxLines - 1).join(' ');
  return [...head, tail].join('\n');
}

/** Salt görsel kart; hareket/dokunma mantığı DraggableGrid'dedir. */
export const NoteCard = React.memo(function NoteCard({
  note,
  theme,
  selected,
  selectionMode,
  searchQuery,
  layoutMode = 'grid',
  fontSize = 'medium',
  sortBy = 'updatedAt',
}: Props) {
  const isList = layoutMode === 'list';
  const delta = FONT_DELTA[fontSize] ?? 0;
  const plainContent = getNotePlainText(note.content);
  const hasTitle = note.title.trim().length > 0;
  const maxContentLines = isList ? (hasTitle ? 1 : 2) : hasTitle ? 2 : 3;
  const cleanContent = formatPreviewContent(plainContent, maxContentLines);
  const displayTimestamp = sortBy === 'createdAt' ? note.createdAt : note.updatedAt;

  return (
    <View
      style={[
        styles.card,
        {
          height: isList ? LIST_CARD_HEIGHT : CARD_HEIGHT,
          backgroundColor: theme.mode === 'dark' ? '#262628' : theme.surface,
          borderColor: selected ? theme.accent : 'transparent',
        },
      ]}
    >
      {note.isPinned && (
        <MaterialCommunityIcons
          name="pin"
          size={14}
          color={theme.accent}
          style={styles.pin}
        />
      )}
      <View style={styles.body}>
        {hasTitle && (
          <HighlightedText
            text={note.title.trim()}
            query={searchQuery}
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: theme.text,
                fontFamily: theme.fonts.bold,
                fontSize: 16 + delta,
                lineHeight: 21 + delta,
                paddingRight: note.isPinned ? 18 : 0,
              },
            ]}
          />
        )}
        {cleanContent.length > 0 && (
          <HighlightedText
            text={cleanContent}
            query={searchQuery}
            numberOfLines={maxContentLines}
            style={[
              styles.content,
              {
                color: theme.textSecondary,
                fontFamily: theme.fonts.regular,
                fontSize: 14 + delta,
                lineHeight: 19 + delta,
                marginTop: hasTitle ? 6 : 0,
                paddingRight: !hasTitle && note.isPinned ? 18 : 0,
              },
            ]}
          />
        )}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.date, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>
          {formatSmartDate(displayTimestamp)}
        </Text>
        {selectionMode && (
          <View
            style={[
              styles.check,
              selected
                ? { backgroundColor: theme.accent }
                : { backgroundColor: theme.checkEmpty },
            ]}
          >
            {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  pin: { position: 'absolute', top: 11, right: 11, transform: [{ rotate: '30deg' }], zIndex: 2 },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  content: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  footer: {
    height: 22,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
