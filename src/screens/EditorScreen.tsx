import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { showAlert } from '../components/ConfirmModal';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/useTheme';
import { fonts, Theme } from '../theme';
import { RootStackParamList } from '../types';
import { formatFullDate } from '../utils/date';
import { uid } from '../utils/id';
import {
  FONT_SIZE_MAP,
  FontSizePreset,
  NoteBlock,
  StrokeData,
  TextBlock,
  areBlocksEmpty,
  createTextBlock,
  getBlocksCharCount,
  normalizeBlocks,
  parseNoteBlocks,
  serializeNoteBlocks,
  transformContiguousParagraph,
} from '../utils/blocks';
import { FolderPickerModal } from '../components/FolderPickerModal';
import { DrawingModal } from '../components/DrawingModal';
import { BottomSheet } from '../components/BottomSheet';
import { setFoldersMoveCallback } from './FoldersScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

interface Snapshot {
  title: string;
  blocks: NoteBlock[];
}

const HISTORY_LIMIT = 300;
const COALESCE_MS = 800;
const AUTOSAVE_MS = 2500;
const FONT_PRESETS: FontSizePreset[] = ['sm', 'md', 'lg', 'xl'];

function cloneBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return JSON.parse(JSON.stringify(blocks));
}

export default function EditorScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fromFab = route.params?.fromFab === true;

  // + (FAB) butonundan veya tıklanan not kartının kendi konumundan büyüyerek açılış ve aynı yere küçülerek kapanış
  const anim = useSharedValue(0);
  const isClosing = useSharedValue(0);
  const closingRef = useRef(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const selectionRef = useRef<Record<string, { start: number; end: number }>>({});
  const pendingFocusIdRef = useRef<string | null>(null);
  const pendingCursorPosRef = useRef<number | null>(null);
  const lastTextChangeTimeRef = useRef<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef<number>(0);
  const viewportHRef = useRef<number>(0);
  const savedScrollYRef = useRef<number | null>(null);
  const contentHeightsRef = useRef<Record<string, number>>({});
  const blockYMapRef = useRef<Record<string, number>>({});

  const focusFirstBlock = useCallback(() => {
    const firstText = blocksRef.current.find((b) => b.type === 'text');
    if (firstText) {
      inputRefs.current[firstText.id]?.focus();
    }
  }, []);

  useEffect(() => {
    anim.value = withTiming(
      1,
      { duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1) },
      (finished) => {
        if (finished && fromFab) scheduleOnRN(focusFirstBlock);
      },
    );
  }, [fromFab, anim, focusFirstBlock]);

  // Hedef açılış/kapanış merkezinin ekran ortasına göre farkı
  const originOffsetX =
    route.params?.originX !== undefined
      ? route.params.originX - width / 2
      : width / 2 - 50;
  const originOffsetY =
    route.params?.originY !== undefined
      ? route.params.originY - height / 2
      : height / 2 - (insets.bottom + 50);
  const startScale = fromFab ? 0.1 : 0.38;

  const expandStyle = useAnimatedStyle(() => {
    if (anim.value >= 1) return { flex: 1 };
    const p = anim.value;
    const scale = startScale + (1 - startScale) * p;

    // Kapanırken son anda donma/kare görüntü oluşmaması için:
    // Kart hedef kartın üzerine inerken (son %28'lik dilimde) pürüzsüzce şeffaflaşıp
    // alttaki ana ekran kartına erir. p <= 0.03 olduğunda tamamen görünmez olur.
    let opacity = 1;
    if (isClosing.value === 1) {
      if (p <= 0.03) {
        opacity = 0;
      } else if (p < 0.28) {
        opacity = (p - 0.03) / 0.25;
      } else {
        opacity = 1;
      }
    } else {
      opacity = Math.min(1, p * 3.2);
    }

    const targetRadius = fromFab ? 44 : 22;
    const currentRadius = (1 - p) * targetRadius;

    return {
      flex: 1,
      opacity,
      borderRadius: currentRadius,
      overflow: 'hidden',
      transform: [
        { translateX: (1 - p) * originOffsetX },
        { translateY: (1 - p) * originOffsetY },
        { scale },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: anim.value * 0.45,
  }));

  const initial = useRef<{ title: string; blocks: NoteBlock[]; ts: number }>(null as never);
  if (initial.current === null) {
    const existing = route.params?.noteId
      ? useStore.getState().notes.find((n) => n.id === route.params.noteId)
      : undefined;
    initial.current = {
      title: existing?.title ?? '',
      blocks: parseNoteBlocks(existing?.content ?? ''),
      ts: existing?.updatedAt ?? Date.now(),
    };
  }

  const [title, setTitle] = useState(initial.current.title);
  const [blocks, setBlocks] = useState<NoteBlock[]>(initial.current.blocks);
  const [activeBlockIdx, setActiveBlockIdx] = useState<number>(0);
  const [noteId, setNoteId] = useState<string | null>(route.params?.noteId ?? null);
  const [editing, setEditing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [fontBarOpen, setFontBarOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFolder, setPendingFolder] = useState<string | null>(route.params?.folderId ?? null);
  const [pendingPinned, setPendingPinned] = useState(false);

  const folders = useStore((s) => s.folders);
  const appFontSize = useStore((s) => s.fontSize);
  const fontDelta = appFontSize === 'small' ? -2 : appFontSize === 'large' ? 2 : appFontSize === 'huge' ? 4 : 0;
  const storeIsPinned = useStore((s) => (noteId ? s.notes.find((n) => n.id === noteId)?.isPinned : undefined));
  const storeFolderId = useStore((s) => (noteId ? s.notes.find((n) => n.id === noteId)?.folderId : undefined));

  // Klavye durumu
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const s2 = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setEditing(false);
      setFontBarOpen(false);
    });
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  // En güncel değerler (kapanış/arka plan kaydı için)
  const titleRef = useRef(title);
  const blocksRef = useRef<NoteBlock[]>(blocks);
  const noteIdRef = useRef<string | null>(noteId);
  const pendingFolderRef = useRef(pendingFolder);
  const pendingPinnedRef = useRef(pendingPinned);
  const deletedRef = useRef(false);
  pendingFolderRef.current = pendingFolder;
  pendingPinnedRef.current = pendingPinned;

  /** Sessiz kayıt. final=true ise (çıkış) boşalmış mevcut notu temizler. */
  const flush = useCallback((final: boolean) => {
    if (deletedRef.current) return;
    const t = titleRef.current;
    const curBlocks = blocksRef.current;
    const empty = t.trim() === '' && areBlocksEmpty(curBlocks);
    const serialized = serializeNoteBlocks(curBlocks);
    const st = useStore.getState();

    if (!noteIdRef.current) {
      if (empty) return; // boş yeni not kaydedilmez
      const id = st.createNote({
        title: t,
        content: serialized,
        folderId: pendingFolderRef.current,
      });
      if (pendingPinnedRef.current) st.setPinned([id], true);
      noteIdRef.current = id;
      setNoteId(id);
      return;
    }

    const exists = st.notes.some((n) => n.id === noteIdRef.current);
    if (!exists) return;
    if (empty && final) {
      st.deleteNotes([noteIdRef.current]);
      noteIdRef.current = null;
      return;
    }
    st.updateNote(noteIdRef.current, { title: t, content: serialized });
  }, []);

  // --- Geri al / ileri al geçmişi ---
  const history = useRef<{ stack: Snapshot[]; idx: number; last: number }>({
    stack: [{ title: initial.current.title, blocks: cloneBlocks(initial.current.blocks) }],
    idx: 0,
    last: 0,
  });
  const [histVersion, setHistVersion] = useState(0);
  const canUndo = history.current.idx > 0;
  const canRedo = history.current.idx < history.current.stack.length - 1;
  void histVersion;

  const record = (next: Snapshot, forceNew = false) => {
    const h = history.current;
    const now = Date.now();
    h.stack = h.stack.slice(0, h.idx + 1);
    const snap = { title: next.title, blocks: cloneBlocks(next.blocks) };
    if (!forceNew && now - h.last < COALESCE_MS && h.idx > 0) {
      h.stack[h.idx] = snap;
    } else {
      h.stack.push(snap);
      h.idx += 1;
      if (h.stack.length > HISTORY_LIMIT) {
        h.stack.shift();
        h.idx -= 1;
      }
    }
    h.last = now;
    setHistVersion((v) => v + 1);
  };

  const applySnapshot = (s: Snapshot) => {
    const cloned = cloneBlocks(s.blocks);
    titleRef.current = s.title;
    blocksRef.current = cloned;
    setTitle(s.title);
    setBlocks(cloned);
  };

  const undo = () => {
    const h = history.current;
    if (h.idx === 0) return;
    h.idx -= 1;
    h.last = 0;
    applySnapshot(h.stack[h.idx]);
    setHistVersion((v) => v + 1);
  };

  const redo = () => {
    const h = history.current;
    if (h.idx >= h.stack.length - 1) return;
    h.idx += 1;
    h.last = 0;
    applySnapshot(h.stack[h.idx]);
    setHistVersion((v) => v + 1);
  };

  const updateBlocks = (next: NoteBlock[], forceHistory = false) => {
    blocksRef.current = next;
    setBlocks(next);
    record({ title: titleRef.current, blocks: next }, forceHistory);
  };

  const onChangeTitle = (t: string) => {
    titleRef.current = t;
    setTitle(t);
    record({ title: t, blocks: blocksRef.current });
  };

  const focusBlockAt = (id: string, pos?: number) => {
    pendingFocusIdRef.current = id;
    pendingCursorPosRef.current = pos ?? null;
    const el = inputRefs.current[id];
    if (el) {
      pendingFocusIdRef.current = null;
      const targetPos = pendingCursorPosRef.current;
      pendingCursorPosRef.current = null;
      el.focus();
      if (typeof targetPos === 'number') {
        el.setNativeProps({ selection: { start: targetPos, end: targetPos } });
      }
      requestAnimationFrame(() => {
        el.focus();
        if (typeof targetPos === 'number') {
          el.setNativeProps({ selection: { start: targetPos, end: targetPos } });
        }
      });
    }
  };

  // ScrollView üzerinde scrollsChildToFocus={false} aktif olduğu için el.focus() çağrısı
  // Android ReactScrollView'un sayfayı 0 noktasına zıplatmasına neden olmaz.
  const registerInput = (id: string, el: TextInput | null) => {
    inputRefs.current[id] = el;
    if (el && pendingFocusIdRef.current === id) {
      const targetPos = pendingCursorPosRef.current;
      pendingCursorPosRef.current = null;
      el.focus();
      if (typeof targetPos === 'number' && targetPos > 0) {
        el.setNativeProps({ selection: { start: targetPos, end: targetPos } });
      }
    }
  };

  const onBlockLayout = (id: string, layout: { y: number; height: number }) => {
    blockYMapRef.current[id] = layout.y;
    if (pendingFocusIdRef.current !== id) return;
    pendingFocusIdRef.current = null;

    const el = inputRefs.current[id];
    el?.focus();

    // Sadece yeni oluşturulan satır görünür alanın (klavye üstünün) altına taştıysa aşağı kaydır
    const prevScrollY = savedScrollYRef.current ?? scrollYRef.current;
    savedScrollYRef.current = null;
    const blockBottom = layout.y + layout.height + 28;
    const visibleBottom = prevScrollY + viewportHRef.current;
    if (viewportHRef.current > 0 && blockBottom > visibleBottom) {
      const targetY = blockBottom - viewportHRef.current + 16;
      scrollRef.current?.scrollTo({ y: targetY, animated: false });
    }
  };

  // Klavyede Enter tuşuna basıldığında (yalnızca checkbox satırları için çalışır)
  const onBlockSubmit = (idx: number) => {
    const curBlocks = blocksRef.current;
    const target = curBlocks[idx];
    if (!target || target.type !== 'text' || !target.hasCheckbox) return;

    savedScrollYRef.current = scrollYRef.current;

    // Boş bir checkbox satırında Enter'a basılırsa checkbox'ı kaldırıp normal metne dön
    if (target.text === '') {
      const next = curBlocks.map((b, i) =>
        i === idx && b.type === 'text' ? { ...b, hasCheckbox: false, checked: false } : b,
      );
      updateBlocks(next, true);
      return;
    }

    // Dolu checkbox satırında Enter'a basılırsa altına yeni bir checkbox satırı oluştur
    const sel = selectionRef.current[target.id];
    const cursorPos = sel
      ? Math.min(Math.max(0, sel.start), target.text.length)
      : target.text.length;
    const before = target.text.slice(0, cursorPos);
    const after = target.text.slice(cursorPos);

    const updatedCurrent: NoteBlock = { ...target, text: before };
    const newBlock = createTextBlock(after, {
      hasCheckbox: true,
      checked: false,
      fontSize: target.fontSize ?? 'md',
    });

    const next = [
      ...curBlocks.slice(0, idx),
      updatedCurrent,
      newBlock,
      ...curBlocks.slice(idx + 1),
    ];

    selectionRef.current[target.id] = { start: before.length, end: before.length };
    selectionRef.current[newBlock.id] = { start: 0, end: 0 };
    pendingFocusIdRef.current = newBlock.id;
    pendingCursorPosRef.current = 0;
    setActiveBlockIdx(idx + 1);
    updateBlocks(next, true);
  };

  // Metin bloğunda yazı değiştiğinde
  const onChangeBlockText = (idx: number, rawVal: string) => {
    const curBlocks = blocksRef.current;
    const target = curBlocks[idx];
    if (!target || target.type !== 'text') return;

    lastTextChangeTimeRef.current = Date.now();

    // Normal metin bloğunda \n olması tamamen doğaldır (multiline).
    // Yeni bloklara AYIRMIYORUZ; böylece kullanıcı klavyedeki sil tuşuna (Backspace)
    // basılı tuttuğunda satır geçişlerinde duraksamadan, tüm metni tek seferde silebilir.
    if (!target.hasCheckbox) {
      const oldLines = target.text.split('\n').length;
      const newLines = rawVal.split('\n').length;
      if (newLines !== oldLines && contentHeightsRef.current[target.id]) {
        const sizeSpec = FONT_SIZE_MAP[target.fontSize ?? 'md'];
        const stepH = Math.round((sizeSpec.fontSize + fontDelta) * 1.15 * 1.24);
        contentHeightsRef.current[target.id] = Math.max(
          stepH,
          contentHeightsRef.current[target.id] + (newLines - oldLines) * stepH,
        );
      }
      const next = curBlocks.map((b, i) =>
        i === idx && b.type === 'text' ? { ...b, text: rawVal } : b,
      );
      updateBlocks(next);
      return;
    }

    // Sadece checkbox bloğunda yapıştırma vb. ile \n gelirse satırları ayrı checkbox'lara ayır
    if (rawVal.includes('\n')) {
      savedScrollYRef.current = scrollYRef.current;
      const parts = rawVal.replace(/\r/g, '').split('\n');
      const firstLine = parts[0];
      const restLines = parts.slice(1);

      if (firstLine === target.text) {
        inputRefs.current[target.id]?.setNativeProps({ text: firstLine });
      }

      if (firstLine === '' && restLines.every((l) => l === '')) {
        const next = curBlocks.map((b, i) =>
          i === idx && b.type === 'text' ? { ...b, text: '', hasCheckbox: false, checked: false } : b,
        );
        updateBlocks(next, true);
        return;
      }

      const updatedFirst: NoteBlock = { ...target, text: firstLine };
      const newBlocks: TextBlock[] = restLines.map((line) =>
        createTextBlock(line, {
          hasCheckbox: true,
          checked: false,
          fontSize: target.fontSize ?? 'md',
        }),
      );
      const next = [
        ...curBlocks.slice(0, idx),
        updatedFirst,
        ...newBlocks,
        ...curBlocks.slice(idx + 1),
      ];
      const last = newBlocks[newBlocks.length - 1];
      pendingFocusIdRef.current = last.id;
      pendingCursorPosRef.current = last.text.length;
      setActiveBlockIdx(idx + newBlocks.length);
      updateBlocks(next, true);
      return;
    }

    const next = curBlocks.map((b, i) =>
      i === idx && b.type === 'text' ? { ...b, text: rawVal } : b,
    );
    updateBlocks(next);
  };

  // Satır başındayken veya boş satırda Backspace'e basılırsa checkbox'ı kaldır veya üst blokla birleştir
  const onBlockKeyPress = (idx: number, key: string) => {
    if (key !== 'Backspace') return;

    const curBlocks = blocksRef.current;
    const cur = curBlocks[idx];
    if (!cur || cur.type !== 'text') return;

    // Satır boşsa
    if (cur.text === '') {
      if (cur.hasCheckbox) {
        // Önceki satır varsa bu boş checkbox satırını sil ve bir öncekine odaklan
        if (idx > 0) {
          const prev = curBlocks[idx - 1];
          const next = curBlocks.filter((_, i) => i !== idx);
          updateBlocks(next, true);
          setActiveBlockIdx(Math.max(0, idx - 1));
          if (prev.type === 'text') {
            focusBlockAt(prev.id, prev.text.length);
          }
          return;
        }
        // İlk satırsa checkbox'ı kaldırıp normal metne dön
        const next = curBlocks.map((b, i) =>
          i === idx && b.type === 'text' ? { ...b, hasCheckbox: false, checked: false } : b,
        );
        updateBlocks(next, true);
        return;
      }

      // Normal metin satırı boşsa ve başka bloklar varsa bu bloğu silip üsttekine geç
      if (curBlocks.length > 1 && idx > 0) {
        const prev = curBlocks[idx - 1];
        const next = curBlocks.filter((_, i) => i !== idx);
        updateBlocks(next, true);
        setActiveBlockIdx(Math.max(0, idx - 1));
        if (prev.type === 'text') {
          focusBlockAt(prev.id, prev.text.length);
        }
      }
      return;
    }

    // Satır doluysa ama imleç en baştaysa (0. pozisyon) üst blokla birleştir
    const sel = selectionRef.current[cur.id];
    if (sel && sel.start === 0 && sel.end === 0) {
      if (cur.hasCheckbox) {
        const next = curBlocks.map((b, i) =>
          i === idx && b.type === 'text' ? { ...b, hasCheckbox: false, checked: false } : b,
        );
        updateBlocks(next, true);
        return;
      }
      if (idx > 0) {
        const prev = curBlocks[idx - 1];
        if (prev.type === 'text') {
          const joinPos = prev.text.length;
          const mergedPrev: NoteBlock = { ...prev, text: prev.text + cur.text };
          const next = [
            ...curBlocks.slice(0, idx - 1),
            mergedPrev,
            ...curBlocks.slice(idx + 1),
          ];
          setActiveBlockIdx(idx - 1);
          updateBlocks(next, true);
          focusBlockAt(prev.id, joinPos);
        } else if (prev.type === 'image' || prev.type === 'drawing') {
          removeBlockById(prev.id);
        }
      }
    }
  };

  // 1) Checkbox Toggle (aralarında boş satır olmayan bitişik tüm satırları kapsar)
  const toggleCheckboxGroup = () => {
    const curBlocks = blocksRef.current;
    const safeIdx = Math.min(Math.max(activeBlockIdx, 0), curBlocks.length - 1);
    const cur = curBlocks[safeIdx];

    if (!cur || cur.type !== 'text') {
      const newText = createTextBlock('', { hasCheckbox: true });
      const next = [
        ...curBlocks.slice(0, safeIdx + 1),
        newText,
        ...curBlocks.slice(safeIdx + 1),
      ];
      pendingFocusIdRef.current = newText.id;
      updateBlocks(next, true);
      setActiveBlockIdx(safeIdx + 1);
      return;
    }

    // Eğer mevcut blok normal metinse ve birden fazla satır içeriyorsa, her satırı bir checkbox satırına dönüştür
    if (!cur.hasCheckbox && cur.text.includes('\n')) {
      const lines = cur.text.split('\n');
      const newBlocks: TextBlock[] = lines.map((line) =>
        createTextBlock(line, {
          hasCheckbox: true,
          checked: false,
          fontSize: cur.fontSize ?? 'md',
        }),
      );
      const next = [
        ...curBlocks.slice(0, safeIdx),
        ...newBlocks,
        ...curBlocks.slice(safeIdx + 1),
      ];
      pendingFocusIdRef.current = newBlocks[0].id;
      updateBlocks(next, true);
      setActiveBlockIdx(safeIdx);
      setEditing(true);
      requestAnimationFrame(() => {
        inputRefs.current[newBlocks[0].id]?.focus();
      });
      return;
    }

    const cursorOffset = selectionRef.current[cur.id]?.start ?? cur.text.length;
    const { blocks: transformed, targetFocusBlockIdx, targetFocusBlockId } = transformContiguousParagraph(
      curBlocks,
      safeIdx,
      cursorOffset,
      (groupLines) => {
        const allHaveCheckbox = groupLines.every((l) => l.hasCheckbox);
        const nextState = !allHaveCheckbox;
        return groupLines.map((l) => ({
          ...l,
          hasCheckbox: nextState,
          checked: nextState ? l.checked ?? false : false,
        }));
      },
    );

    // Checkbox kaldırıldıysa aradaki normal metinleri tek blokta birleştir
    const next = normalizeBlocks(transformed);
    const focusBlock = next[targetFocusBlockIdx] ?? next[next.length - 1];
    const focusId = focusBlock?.id ?? targetFocusBlockId;

    pendingFocusIdRef.current = focusId;
    updateBlocks(next, true);
    setActiveBlockIdx(Math.min(targetFocusBlockIdx, next.length - 1));
    setEditing(true);
    requestAnimationFrame(() => {
      inputRefs.current[focusId]?.focus();
    });
  };

  // Tek bir checkbox kutusuna tıklayıp işaretleme/kaldırma
  const toggleSingleChecked = (idx: number) => {
    const curBlocks = blocksRef.current;
    const next = curBlocks.map((b, i) =>
      i === idx && b.type === 'text' ? { ...b, checked: !b.checked } : b,
    );
    updateBlocks(next, true);
  };

  // 2) Punto (Font Size) Değiştirme (aralarında boş satır olmayan bitişik tüm satırları kapsar)
  const applyFontSizeToGroup = (preset: FontSizePreset) => {
    const curBlocks = blocksRef.current;
    const safeIdx = Math.min(Math.max(activeBlockIdx, 0), curBlocks.length - 1);
    const cur = curBlocks[safeIdx];
    if (!cur || cur.type !== 'text') return;

    const cursorOffset = selectionRef.current[cur.id]?.start ?? cur.text.length;
    const { blocks: transformed, targetFocusBlockIdx, targetFocusBlockId } = transformContiguousParagraph(
      curBlocks,
      safeIdx,
      cursorOffset,
      (groupLines) =>
        groupLines.map((l) => ({
          ...l,
          fontSize: preset,
        })),
    );

    const next = normalizeBlocks(transformed);
    const focusBlock = next[targetFocusBlockIdx] ?? next[next.length - 1];
    const focusId = focusBlock?.id ?? targetFocusBlockId;

    pendingFocusIdRef.current = focusId;
    updateBlocks(next, true);
    setActiveBlockIdx(Math.min(targetFocusBlockIdx, next.length - 1));
    setEditing(true);
    requestAnimationFrame(() => {
      inputRefs.current[focusId]?.focus();
    });
  };

  // 3) Fotoğraf Ekleme (Galeri veya Kamera)
  const insertMediaBlock = (block: NoteBlock) => {
    const curBlocks = blocksRef.current;
    const safeIdx = Math.min(Math.max(activeBlockIdx, 0), curBlocks.length - 1);
    const trailingText = createTextBlock('');
    const next = [
      ...curBlocks.slice(0, safeIdx + 1),
      block,
      trailingText,
      ...curBlocks.slice(safeIdx + 1),
    ];
    updateBlocks(next, true);
    setActiveBlockIdx(safeIdx + 2);
  };

  const pickFromGallery = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('İzin Gerekli', 'Galeriden fotoğraf seçmek için izin vermeniz gerekiyor.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      const ratio = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
      insertMediaBlock({
        id: uid(),
        type: 'image',
        uri: asset.uri,
        aspectRatio: ratio,
      });
    }
  };

  const takePhotoWithCamera = async () => {
    setPhotoSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAlert('İzin Gerekli', 'Kamerayı kullanmak için izin vermeniz gerekiyor.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      const ratio = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
      insertMediaBlock({
        id: uid(),
        type: 'image',
        uri: asset.uri,
        aspectRatio: ratio,
      });
    }
  };

  // 4) Çizim Kaydetme / Güncelleme
  const handleSaveDrawing = (strokes: StrokeData[], cw: number, ch: number) => {
    setDrawingOpen(false);
    if (editingDrawingId) {
      const next = blocksRef.current.map((b) =>
        b.id === editingDrawingId && b.type === 'drawing'
          ? { ...b, strokes, canvasWidth: cw, canvasHeight: ch }
          : b,
      );
      setEditingDrawingId(null);
      updateBlocks(next, true);
      return;
    }
    insertMediaBlock({
      id: uid(),
      type: 'drawing',
      strokes,
      canvasWidth: cw,
      canvasHeight: ch,
    });
  };

  const removeBlockById = (id: string) => {
    const curBlocks = blocksRef.current;
    let next = normalizeBlocks(curBlocks.filter((b) => b.id !== id));
    if (next.length === 0) next = [createTextBlock('')];
    updateBlocks(next, true);
  };

  // --- Otomatik kaydetme ---
  // 1) Kısa debounce ile her değişiklikte
  useEffect(() => {
    const t = setTimeout(() => flush(false), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [title, blocks, flush]);

  // 2) Uygulama arka plana/inactive'e geçince anında
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') flush(false);
    });
    return () => sub.remove();
  }, [flush]);

  // 3) Ekran kapanırken (geri tuşu, swipe back, unmount)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      flush(true);
      if (closingRef.current) return;
      e.preventDefault();
      closingRef.current = true;
      Keyboard.dismiss();
      const action = e.data.action;
      const finishClose = () => {
        navigation.dispatch(action);
      };
      isClosing.value = 1;
      anim.value = withTiming(
        0,
        { duration: 280, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
        (finished) => {
          if (finished) scheduleOnRN(finishClose);
        },
      );
    });
    return () => {
      unsub();
      flush(true);
    };
  }, [navigation, flush, anim]);

  const goBack = () => {
    flush(true);
    navigation.goBack();
  };

  const done = () => {
    flush(false);
    setFontBarOpen(false);
    Keyboard.dismiss();
  };

  const isPinned = storeIsPinned !== undefined ? storeIsPinned : pendingPinned;
  const currentFolder = storeFolderId !== undefined ? storeFolderId : pendingFolder;
  const ts = initial.current.ts;
  const charCount = title.length + getBlocksCharCount(blocks);

  const activeBlock = blocks[Math.min(Math.max(activeBlockIdx, 0), blocks.length - 1)];
  const activeFontSize: FontSizePreset =
    activeBlock && activeBlock.type === 'text' ? activeBlock.fontSize ?? 'md' : 'md';
  const activeHasCheckbox =
    activeBlock && activeBlock.type === 'text' ? !!activeBlock.hasCheckbox : false;

  const editingDrawingBlock = editingDrawingId
    ? blocks.find((b) => b.id === editingDrawingId && b.type === 'drawing')
    : undefined;

  const togglePin = () => {
    setMenuOpen(false);
    if (noteIdRef.current) {
      useStore.getState().setPinned([noteIdRef.current], !isPinned);
    } else {
      setPendingPinned(!pendingPinned);
    }
  };

  const confirmDelete = () => {
    setMenuOpen(false);
    showAlert('Notu sil', 'Bu not silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deletedRef.current = true;
          if (noteIdRef.current) useStore.getState().deleteNotes([noteIdRef.current]);
          navigation.goBack();
        },
      },
    ]);
  };

  const moveTo = (folderId: string | null) => {
    setPickerOpen(false);
    if (noteIdRef.current) useStore.getState().moveNotes([noteIdRef.current], folderId);
    else setPendingFolder(folderId);
  };

  const showToolbar = editing || keyboardVisible;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, backdropStyle]}
      />
      <Animated.View style={[{ backgroundColor: theme.background, paddingTop: insets.top }, expandStyle]}>
        {/* Üst Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {showToolbar && (
              <>
                <TouchableOpacity onPress={undo} disabled={!canUndo} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="arrow-undo" size={23} color={canUndo ? theme.text : theme.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={redo} disabled={!canRedo} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="arrow-redo" size={23} color={canRedo ? theme.text : theme.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={done} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="checkmark" size={27} color={theme.accent} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            {...({ scrollsChildToFocus: false } as Record<string, unknown>)}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            onLayout={(e) => {
              viewportHRef.current = e.nativeEvent.layout.height;
            }}
          >
            {/* Başlık */}
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              placeholder="Başlık"
              placeholderTextColor={theme.textTertiary}
              style={[styles.title, { color: theme.text, fontFamily: theme.fonts.bold }]}
              onFocus={() => setEditing(true)}
              multiline
              submitBehavior="submit"
              onSubmitEditing={() => {
                const first = blocksRef.current.find((b) => b.type === 'text');
                if (first) inputRefs.current[first.id]?.focus();
              }}
              maxLength={200}
              selectionColor={theme.accent}
            />

            {/* Tarih & Karakter Sayısı */}
            <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: theme.fonts.regular }]}>
              {formatFullDate(ts)}
              {'  |  '}
              {charCount} karakter
            </Text>

            {/* Zengin İçerik Blokları (Metin / Checkbox / Punto / Fotoğraf / Çizim) */}
            {blocks.map((block, idx) => {
              if (block.type === 'text') {
                const sizeSpec = FONT_SIZE_MAP[block.fontSize ?? 'md'];
                const effectiveFontSize = sizeSpec.fontSize + fontDelta;
                const naturalLineH = Math.round(effectiveFontSize * 1.22);
                const isLastBlock = idx === blocks.length - 1;

                // Android ReactEditText'te isLayoutRequested() = false olduğu için Enter'a basıldığı
                // karede (Yoga yüksekliği büyütmeden önce) EditText kendi içinde yukarı scroll (mScrollY > 0)
                // yapmasın diye son multiline metin bloğunun altında her zaman ekstra iç yükseklik tamponu bırakıyoruz.
                let inputMinHeight: number | undefined;
                if (!block.hasCheckbox && isLastBlock) {
                  const approxLineH = Math.round(effectiveFontSize * 1.15 * 1.24);
                  const lineCount = block.text.split('\n').length;
                  const estimatedH = lineCount * approxLineH;
                  const measuredH = contentHeightsRef.current[block.id] ?? 0;
                  const baseTextH = Math.max(estimatedH, measuredH);
                  inputMinHeight = Math.max(220, baseTextH + 120);
                }

                return (
                  <View
                    key={block.id}
                    onLayout={(e) => onBlockLayout(block.id, e.nativeEvent.layout)}
                    style={[
                      styles.textBlockRow,
                      { marginBottom: sizeSpec.paragraphGap },
                    ]}
                  >
                    {block.hasCheckbox && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleSingleChecked(idx)}
                        style={[
                          styles.checkbox,
                          { marginTop: Math.max(0, Math.round((naturalLineH - 20) / 2)) },
                          block.checked
                            ? { backgroundColor: theme.accent, borderColor: theme.accent }
                            : { borderColor: theme.textSecondary, backgroundColor: 'transparent' },
                        ]}
                      >
                        {block.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </TouchableOpacity>
                    )}
                    <TextInput
                      ref={(el) => registerInput(block.id, el)}
                      value={block.text}
                      onChangeText={(val) => onChangeBlockText(idx, val)}
                      onKeyPress={(e) => onBlockKeyPress(idx, e.nativeEvent.key)}
                      onSubmitEditing={block.hasCheckbox ? () => onBlockSubmit(idx) : undefined}
                      submitBehavior={block.hasCheckbox ? 'submit' : 'newline'}
                      onSelectionChange={(e) => {
                        selectionRef.current[block.id] = e.nativeEvent.selection;
                      }}
                      onContentSizeChange={(e) => {
                        const h = Math.ceil(e.nativeEvent.contentSize.height);
                        const prevH = contentHeightsRef.current[block.id] ?? 0;
                        contentHeightsRef.current[block.id] = h;
                        if (
                          !block.hasCheckbox &&
                          activeBlockIdx === idx &&
                          h > prevH &&
                          prevH > 0 &&
                          viewportHRef.current > 0
                        ) {
                          const sel = selectionRef.current[block.id];
                          const atEnd = !sel || sel.end >= block.text.length - 2;
                          if (atEnd) {
                            const blockY = blockYMapRef.current[block.id] ?? 110;
                            const textBottom = blockY + h + 28;
                            const visibleBottom = scrollYRef.current + viewportHRef.current;
                            if (textBottom > visibleBottom) {
                              scrollRef.current?.scrollTo({
                                y: textBottom - viewportHRef.current + 20,
                                animated: false,
                              });
                            }
                          }
                        }
                      }}
                      onFocus={() => {
                        setEditing(true);
                        setActiveBlockIdx(idx);
                      }}
                      placeholder={idx === 0 && blocks.length === 1 && !block.hasCheckbox ? 'Not yazın...' : ' '}
                      placeholderTextColor={theme.textTertiary}
                      multiline
                      scrollEnabled={false}
                      textAlignVertical="top"
                      style={[
                        styles.blockInput,
                        {
                          color: block.checked ? theme.textSecondary : theme.text,
                          fontSize: effectiveFontSize,
                          fontFamily: theme.fonts.regular,
                          minHeight: inputMinHeight,
                        },
                      ]}
                      selectionColor={theme.accent}
                    />
                  </View>
                );
              }

              if (block.type === 'image') {
                const ratio = block.aspectRatio && block.aspectRatio > 0 ? block.aspectRatio : 4 / 3;
                const imgW = width - 46;
                const imgH = Math.min(360, Math.round(imgW / ratio));
                return (
                  <View key={block.id} style={styles.mediaCard}>
                    <Image
                      source={{ uri: block.uri }}
                      style={{ width: '100%', height: imgH, borderRadius: 14 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeBlockById(block.id)}
                      style={styles.removeMediaBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              }

              if (block.type === 'drawing') {
                const cw = block.canvasWidth || width;
                const ch = block.canvasHeight || 320;
                const cardH = Math.min(280, Math.max(170, Math.round(((width - 46) * ch) / cw)));
                return (
                  <TouchableOpacity
                    key={block.id}
                    activeOpacity={0.9}
                    onPress={() => {
                      setEditingDrawingId(block.id);
                      setDrawingOpen(true);
                    }}
                    style={[styles.drawingCard, { height: cardH }]}
                  >
                    <Svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${cw} ${ch}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {block.strokes.map((s, sIdx) => (
                        <Path
                          key={sIdx}
                          d={s.d}
                          stroke={s.color}
                          strokeWidth={s.width}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </Svg>
                    <TouchableOpacity
                      onPress={() => removeBlockById(block.id)}
                      style={styles.removeMediaBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }

              return null;
            })}

            {/* Alt boş alana dokununca son metin bloğuna odaklan */}
            <Pressable
              style={styles.bottomTapArea}
              onPress={() => {
                const curBlocks = blocksRef.current;
                // Kaldığımız (son aktif) metin bloğu; yoksa son metin bloğu
                let targetIdx = -1;
                const active = curBlocks[activeBlockIdx];
                if (active && active.type === 'text') {
                  targetIdx = activeBlockIdx;
                } else {
                  for (let i = curBlocks.length - 1; i >= 0; i--) {
                    if (curBlocks[i].type === 'text') {
                      targetIdx = i;
                      break;
                    }
                  }
                }
                if (targetIdx >= 0) {
                  const target = curBlocks[targetIdx] as TextBlock;
                  const el = inputRefs.current[target.id];
                  const endPos = target.text.length;
                  setActiveBlockIdx(targetIdx);
                  selectionRef.current[target.id] = { start: endPos, end: endPos };
                  if (el) {
                    // Klavye kapalıyken input odakta kalmış olabilir; önce blur ile sıfırla
                    // ki focus() klavyeyi tekrar açsın.
                    el.blur();
                    requestAnimationFrame(() => {
                      el.focus();
                      el.setNativeProps({ selection: { start: endPos, end: endPos } });
                    });
                  }
                  return;
                }
                const newText = createTextBlock('');
                const next = [...curBlocks, newText];
                pendingFocusIdRef.current = newText.id;
                updateBlocks(next, true);
                setActiveBlockIdx(next.length - 1);
              }}
            />
          </ScrollView>

          {/* Punto Seçim Alt Çubuğu (T ikonuna basıldığında araç çubuğunun hemen üstünde açılır) */}
          {showToolbar && fontBarOpen && (
            <View
              style={[
                styles.fontSelectorBar,
                { backgroundColor: theme.surface, borderTopColor: theme.border },
              ]}
            >
              {FONT_PRESETS.map((preset) => {
                const spec = FONT_SIZE_MAP[preset];
                const isSelected = activeFontSize === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    activeOpacity={0.75}
                    onPress={() => applyFontSizeToGroup(preset)}
                    style={[
                      styles.fontChip,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.pill,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fontChipText,
                        {
                          color: isSelected ? '#FFFFFF' : theme.text,
                          fontFamily: theme.fonts.semiBold,
                          fontSize: preset === 'sm' ? 12.5 : preset === 'md' ? 14 : preset === 'lg' ? 15.5 : 17,
                        },
                      ]}
                    >
                      {spec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Klavye Üstü 4'lü Araç Çubuğu: Sadece metne focus olunduğunda / klavye açıkken görünür */}
          {showToolbar && (
            <View
              style={[
                styles.editorToolbar,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                  paddingBottom: 6,
                },
              ]}
            >
              {/* 1. Fotoğraf / Kamera */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => {
                  Keyboard.dismiss();
                  setPhotoSheetOpen(true);
                }}
                style={styles.toolBtn}
              >
                <Ionicons name="image-outline" size={23} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* 2. Çizim (Karalama) */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => {
                  Keyboard.dismiss();
                  setEditingDrawingId(null);
                  setDrawingOpen(true);
                }}
                style={styles.toolBtn}
              >
                <MaterialCommunityIcons name="gesture" size={24} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* 3. Checkbox */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={toggleCheckboxGroup}
                style={styles.toolBtn}
              >
                <MaterialCommunityIcons
                  name="checkbox-marked-outline"
                  size={23}
                  color={activeHasCheckbox ? theme.accent : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* 4. Punto (T) */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => setFontBarOpen((v) => !v)}
                style={styles.toolBtn}
              >
                <MaterialCommunityIcons
                  name="format-title"
                  size={23}
                  color={fontBarOpen || activeFontSize !== 'md' ? theme.accent : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
          {insets.bottom > 0 && (
            <View style={{ height: insets.bottom, backgroundColor: theme.navBar }} />
          )}
        </KeyboardAvoidingView>

        {/* Fotoğraf Seçim Menüsü (Galeri veya Kamera) */}
        <BottomSheet
          visible={photoSheetOpen}
          onClose={() => setPhotoSheetOpen(false)}
          theme={theme}
        >
          <Text style={[styles.sheetTitle, { color: theme.text, fontFamily: theme.fonts.bold }]}>Fotoğraf ekle</Text>
          <TouchableOpacity style={styles.sheetRow} activeOpacity={0.65} onPress={takePhotoWithCamera}>
            <Ionicons name="camera-outline" size={22} color={theme.accent} />
            <Text style={[styles.sheetLabel, { color: theme.text, fontFamily: theme.fonts.regular }]}>Kamerayla fotoğraf çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetRow} activeOpacity={0.65} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={22} color={theme.accent} />
            <Text style={[styles.sheetLabel, { color: theme.text, fontFamily: theme.fonts.regular }]}>Galeriden fotoğraf seç</Text>
          </TouchableOpacity>
        </BottomSheet>

        {/* Beyaz Çizim Ekranı */}
        <DrawingModal
          visible={drawingOpen}
          initialStrokes={
            editingDrawingBlock && editingDrawingBlock.type === 'drawing'
              ? editingDrawingBlock.strokes
              : undefined
          }
          onSave={handleSaveDrawing}
          onClose={() => {
            setDrawingOpen(false);
            setEditingDrawingId(null);
          }}
        />

        {/* ⋮ menüsü */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
          statusBarTranslucent
          navigationBarTranslucent
        >
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
            <View
              style={[
                styles.menu,
                { backgroundColor: theme.surface, borderColor: theme.border, top: insets.top + 46 },
              ]}
            >
              <MenuItem
                icon={<Ionicons name="folder-open-outline" size={20} color={theme.text} />}
                label="Şuraya taşı"
                color={theme.text}
                theme={theme}
                onPress={() => {
                  setMenuOpen(false);
                  setFoldersMoveCallback((folderId) => {
                    moveTo(folderId);
                  });
                  navigation.navigate('Folders', {
                    moveNoteIds: noteIdRef.current ? [noteIdRef.current] : [],
                  });
                }}
              />
              <MenuItem
                icon={
                  <MaterialCommunityIcons
                    name={isPinned ? 'pin-off-outline' : 'pin-outline'}
                    size={20}
                    color={theme.text}
                  />
                }
                label={isPinned ? 'İğnelemeyi kaldır' : 'İğnele'}
                color={theme.text}
                theme={theme}
                onPress={togglePin}
              />
              <MenuItem
                icon={<Ionicons name="trash-outline" size={20} color={theme.danger} />}
                label="Sil"
                color={theme.danger}
                theme={theme}
                onPress={confirmDelete}
              />
            </View>
          </Pressable>
        </Modal>

        <FolderPickerModal
          visible={pickerOpen}
          theme={theme}
          folders={folders}
          currentFolderId={currentFolder}
          onSelect={moveTo}
          onClose={() => setPickerOpen(false)}
        />
      </Animated.View>
    </View>
  );
}

function MenuItem({
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
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={onPress}>
      {icon}
      <Text style={[styles.menuLabel, { color, fontFamily: theme.fonts.regular }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 23 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 31,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, marginTop: 4, marginBottom: 20 },
  textBlockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blockInput: {
    flex: 1,
    fontFamily: fonts.regular,
    paddingHorizontal: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  mediaCard: {
    marginVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  drawingCard: {
    marginVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D1D6',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTapArea: {
    flex: 1,
    minHeight: 160,
  },
  fontSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  fontChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipText: {
    fontFamily: fonts.semiBold,
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  sheetLabel: {
    fontFamily: fonts.regular,
    fontSize: 15.5,
  },
  menuBackdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 200,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  menuLabel: { fontFamily: fonts.regular, fontSize: 15 },
});
