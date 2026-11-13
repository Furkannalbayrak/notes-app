import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppFontSize, LayoutMode, Note, SortOrder } from '../types';
import { Theme } from '../theme';
import { CARD_GAP, CARD_HEIGHT, LIST_CARD_HEIGHT, NoteCard } from './NoteCard';

const H_PADDING = 12;
const EDGE = 90;

type OrderMap = Record<string, number>;

interface Props {
  notes: Note[]; // zaten sıralı (sabitliler üstte)
  theme: Theme;
  selectedIds: string[];
  selectionMode: boolean;
  searchQuery?: string;
  layoutMode?: LayoutMode;
  fontSize?: AppFontSize;
  sortBy?: SortOrder;
  width: number;
  bottomInset: number;
  onPressNote: (id: string, cx: number, cy: number) => void;
  onLongPressNote: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

interface ItemProps {
  note: Note;
  index: number;
  theme: Theme;
  selected: boolean;
  selectionMode: boolean;
  searchQuery?: string;
  layoutMode: LayoutMode;
  fontSize: AppFontSize;
  sortBy: SortOrder;
  cols: number;
  cardH: number;
  rowH: number;
  colW: number;
  colStep: number;
  orders: SharedValue<OrderMap>;
  activeId: SharedValue<string>;
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  tX: SharedValue<number>;
  tY: SharedValue<number>;
  absY: SharedValue<number>;
  startScroll: SharedValue<number>;
  scrollY: SharedValue<number>;
  viewTop: SharedValue<number>;
  groupMin: SharedValue<number>;
  groupMax: SharedValue<number>;
  pinnedCount: SharedValue<number>;
  count: SharedValue<number>;
  onPress: (id: string, cx: number, cy: number) => void;
  onLongPress: (id: string) => void;
  onCommit: (map: OrderMap) => void;
}

const GridItem = React.memo(function GridItem(p: ItemProps) {
  const {
    note,
    index,
    cols,
    cardH,
    rowH,
    colW,
    colStep,
    orders,
    activeId,
    startX,
    startY,
    tX,
    tY,
    absY,
    startScroll,
    scrollY,
    viewTop,
    groupMin,
    groupMax,
    pinnedCount,
    count,
    onPress,
    onLongPress,
    onCommit,
  } = p;
  const id = note.id;

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(300)
      .onStart(() => {
        const idx = orders.value[id] ?? 0;
        activeId.value = id;
        startX.value = cols === 1 ? 0 : (idx % cols) * colStep;
        startY.value = Math.floor(idx / cols) * rowH;
        tX.value = 0;
        tY.value = 0;
        startScroll.value = scrollY.value;
        if (idx < pinnedCount.value) {
          groupMin.value = 0;
          groupMax.value = pinnedCount.value - 1;
        } else {
          groupMin.value = pinnedCount.value;
          groupMax.value = count.value - 1;
        }
        scheduleOnRN(onLongPress, id);
      })
      .onUpdate((e) => {
        tX.value = e.translationX;
        tY.value = e.translationY;
        absY.value = e.absoluteY;
      })
      .onFinalize(() => {
        if (activeId.value !== id) return;
        activeId.value = '';
        scheduleOnRN(onCommit, orders.value);
      });

    const tap = Gesture.Tap().onEnd((e, success) => {
      if (success) {
        const idx = orders.value[id] ?? index;
        const cx = H_PADDING + (cols === 1 ? 0 : (idx % cols) * colStep) + colW / 2;
        const cy =
          viewTop.value > 0
            ? viewTop.value + Math.floor(idx / cols) * rowH - scrollY.value + cardH / 2
            : e.absoluteY;
        scheduleOnRN(onPress, id, cx, cy);
      }
    });

    return Gesture.Exclusive(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    index,
    cols,
    cardH,
    rowH,
    colW,
    colStep,
    orders,
    activeId,
    startX,
    startY,
    tX,
    tY,
    absY,
    startScroll,
    scrollY,
    viewTop,
    groupMin,
    groupMax,
    pinnedCount,
    count,
    onPress,
    onLongPress,
    onCommit,
  ]);

  const style = useAnimatedStyle(() => {
    if (activeId.value === id) {
      return {
        zIndex: 100,
        opacity: 0.96,
        transform: [
          { translateX: startX.value + tX.value },
          { translateY: startY.value + tY.value + (scrollY.value - startScroll.value) },
          { scale: 1.04 },
        ],
      };
    }
    const idx = orders.value[id] ?? index;
    const xPos = cols === 1 ? 0 : (idx % cols) * colStep;
    const yPos = Math.floor(idx / cols) * rowH;
    return {
      zIndex: 0,
      opacity: 1,
      transform: [
        { translateX: withTiming(xPos, { duration: 180 }) },
        { translateY: withTiming(yPos, { duration: 180 }) },
        { scale: withTiming(1, { duration: 120 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.item, { width: colW, height: cardH }, style]}>
        <NoteCard
          note={note}
          theme={p.theme}
          selected={p.selected}
          selectionMode={p.selectionMode}
          searchQuery={p.searchQuery}
          layoutMode={p.layoutMode}
          fontSize={p.fontSize}
          sortBy={p.sortBy}
        />
      </Animated.View>
    </GestureDetector>
  );
});

export function DraggableGrid({
  notes,
  theme,
  selectedIds,
  selectionMode,
  searchQuery,
  layoutMode = 'grid',
  fontSize = 'medium',
  sortBy = 'updatedAt',
  width,
  bottomInset,
  onPressNote,
  onLongPressNote,
  onReorder,
}: Props) {
  const isList = layoutMode === 'list';
  const cols = isList ? 1 : 2;
  const cardH = isList ? LIST_CARD_HEIGHT : CARD_HEIGHT;
  const rowH = cardH + CARD_GAP;
  const colW = isList ? width - H_PADDING * 2 : (width - H_PADDING * 2 - CARD_GAP) / 2;
  const colStep = colW + CARD_GAP;
  const rows = Math.ceil(notes.length / cols);
  const contentH = rows * rowH + bottomInset;

  const notesRef = useRef(notes);
  notesRef.current = notes;

  const orders = useSharedValue<OrderMap>({});
  const activeId = useSharedValue('');
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const tX = useSharedValue(0);
  const tY = useSharedValue(0);
  const absY = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const groupMin = useSharedValue(0);
  const groupMax = useSharedValue(0);
  const pinnedCount = useSharedValue(0);
  const count = useSharedValue(0);
  const viewTop = useSharedValue(0);
  const viewH = useSharedValue(0);
  const contentHSV = useSharedValue(contentH);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const wrapRef = useRef<View>(null);

  // Notlar değiştiğinde (ve sürükleme yokken) konum haritasını senkronla
  useEffect(() => {
    const map: OrderMap = {};
    notes.forEach((n, i) => {
      map[n.id] = i;
    });
    orders.value = map;
    count.value = notes.length;
    pinnedCount.value = notes.filter((n) => n.isPinned).length;
    contentHSV.value = contentH;
  }, [notes, contentH, orders, count, pinnedCount, contentHSV]);

  const onScroll = useAnimatedScrollHandler((e) => {
    if (activeId.value === '') scrollY.value = e.contentOffset.y;
  });

  // Sürüklenen kartın hangi hücreye geldiğini hesapla ve diğerlerini kaydır
  useAnimatedReaction(
    () => ({ id: activeId.value, x: tX.value, y: tY.value, s: scrollY.value, cols, colW, cardH, rowH }),
    (cur) => {
      if (cur.id === '') return;
      const itemX = startX.value + cur.x;
      const itemY = startY.value + cur.y + (cur.s - startScroll.value);
      const cx = itemX + cur.colW / 2;
      const cy = itemY + cur.cardH / 2;
      const col = cur.cols === 1 ? 0 : cx > (cur.colW * 2 + CARD_GAP) / 2 ? 1 : 0;
      const row = Math.max(0, Math.floor(cy / cur.rowH));
      const target = Math.min(Math.max(row * cur.cols + col, groupMin.value), groupMax.value);
      const from = orders.value[cur.id];
      if (from === undefined || from === target) return;
      const next: OrderMap = { ...orders.value };
      for (const k in next) {
        if (from < target && next[k] > from && next[k] <= target) next[k] -= 1;
        else if (from > target && next[k] < from && next[k] >= target) next[k] += 1;
      }
      next[cur.id] = target;
      orders.value = next;
    },
  );

  // Kenara yaklaşınca otomatik kaydır
  useFrameCallback(() => {
    if (activeId.value === '') return;
    const rel = absY.value - viewTop.value;
    let dy = 0;
    if (rel < EDGE) dy = -10;
    else if (rel > viewH.value - EDGE) dy = 10;
    if (dy === 0) return;
    const maxScroll = Math.max(0, contentHSV.value - viewH.value);
    const next = Math.min(Math.max(scrollY.value + dy, 0), maxScroll);
    if (next === scrollY.value) return;
    scrollY.value = next;
    scrollTo(scrollRef, 0, next, false);
  });

  const handleCommit = useCallback(
    (map: OrderMap) => {
      const current = notesRef.current;
      const sorted = [...current].sort((a, b) => (map[a.id] ?? 0) - (map[b.id] ?? 0));
      const changed = sorted.some((n, i) => n.id !== current[i].id);
      if (changed) onReorder(sorted.map((n) => n.id));
    },
    [onReorder],
  );

  const onLayout = (_e: LayoutChangeEvent) => {
    wrapRef.current?.measureInWindow((_x, y, _w, h) => {
      viewTop.value = y;
      viewH.value = h;
    });
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <View ref={wrapRef} style={styles.wrap} onLayout={onLayout}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H_PADDING }}
      >
        <View style={{ height: contentH }}>
          {notes.map((n, i) => (
            <GridItem
              key={n.id}
              note={n}
              index={i}
              theme={theme}
              selected={selectedSet.has(n.id)}
              selectionMode={selectionMode}
              searchQuery={searchQuery}
              layoutMode={layoutMode}
              fontSize={fontSize}
              sortBy={sortBy}
              cols={cols}
              cardH={cardH}
              rowH={rowH}
              colW={colW}
              colStep={colStep}
              orders={orders}
              activeId={activeId}
              startX={startX}
              startY={startY}
              tX={tX}
              tY={tY}
              absY={absY}
              startScroll={startScroll}
              scrollY={scrollY}
              viewTop={viewTop}
              groupMin={groupMin}
              groupMax={groupMax}
              pinnedCount={pinnedCount}
              count={count}
              onPress={onPressNote}
              onLongPress={onLongPressNote}
              onCommit={handleCommit}
            />
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  item: { position: 'absolute', left: 0, top: 0 },
});
