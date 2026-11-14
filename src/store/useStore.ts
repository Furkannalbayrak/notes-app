import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppFontFamily, AppFontSize, CalendarNote, Folder, FolderFilter, LayoutMode, Note, SortOrder, ThemeMode } from '../types';
import { uid } from '../utils/id';

interface State {
  folders: Folder[];
  notes: Note[];
  calendarNotes: CalendarNote[];
  theme: ThemeMode;
  fontSize: AppFontSize;
  fontFamily: AppFontFamily;
  sortBy: SortOrder;
  layoutMode: LayoutMode;
  activeFilter: FolderFilter;
  hydrated: boolean;

  setTheme: (mode: ThemeMode) => void;
  setFontSize: (size: AppFontSize) => void;
  setFontFamily: (fontFamily: AppFontFamily) => void;
  setSortBy: (sortBy: SortOrder) => void;
  setLayoutMode: (layoutMode: LayoutMode) => void;
  setActiveFilter: (filter: FolderFilter) => void;

  addFolder: (name: string) => string | null;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  deleteFolders: (ids: string[]) => void;

  createNote: (data: { title: string; content: string; folderId: string | null }) => string;
  updateNote: (id: string, patch: { title?: string; content?: string }) => void;
  deleteNotes: (ids: string[]) => void;
  setPinned: (ids: string[], pinned: boolean) => void;
  moveNotes: (ids: string[], folderId: string | null) => void;
  /** Görünen notların yeni sırası (id listesi). Sabitli / sabitsiz gruplar kendi içinde yeniden sıralanır. */
  reorderNotes: (orderedIds: string[]) => void;

  createCalendarNote: (data: { date: string; title: string; content: string }) => string;
  updateCalendarNote: (id: string, patch: { title?: string; content?: string }) => void;
  deleteCalendarNote: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      folders: [],
      notes: [],
      calendarNotes: [],
      theme: 'dark',
      fontSize: 'medium',
      fontFamily: 'inter',
      sortBy: 'updatedAt',
      layoutMode: 'grid',
      activeFilter: 'all',
      hydrated: false,

      setTheme: (mode) => set({ theme: mode }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setSortBy: (sortBy) => {
        const { notes } = get();
        const sorted = [...notes].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return sortBy === 'createdAt' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt;
        });
        const reindexed = sorted.map((n, idx) => ({ ...n, orderIndex: idx }));
        set({ sortBy, notes: reindexed });
      },
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),

      addFolder: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const { folders } = get();
        const id = uid();
        const orderIndex = folders.length ? Math.max(...folders.map((f) => f.orderIndex)) + 1 : 0;
        set({ folders: [...folders, { id, name: trimmed, createdAt: Date.now(), orderIndex }] });
        return id;
      },

      renameFolder: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) });
      },

      deleteFolder: (id) =>
        set({
          folders: get().folders.filter((f) => f.id !== id),
          // Klasördeki notlar silinmez, "Kategorilenmemiş" olur
          notes: get().notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
          activeFilter: get().activeFilter === id ? 'all' : get().activeFilter,
        }),

      deleteFolders: (ids) => {
        const set_ = new Set(ids);
        set({
          folders: get().folders.filter((f) => !set_.has(f.id)),
          notes: get().notes.map((n) => (n.folderId && set_.has(n.folderId) ? { ...n, folderId: null } : n)),
          activeFilter: set_.has(get().activeFilter) ? 'all' : get().activeFilter,
        });
      },

      createNote: ({ title, content, folderId }) => {
        const { notes } = get();
        const now = Date.now();
        const id = uid();
        const orderIndex = notes.length ? Math.min(...notes.map((n) => n.orderIndex)) - 1 : 0;
        set({
          notes: [
            ...notes,
            { id, title, content, folderId, isPinned: false, orderIndex, createdAt: now, updatedAt: now },
          ],
        });
        return id;
      },

      updateNote: (id, patch) => {
        const { notes, sortBy } = get();
        const minOrder = notes.length ? Math.min(...notes.map((n) => n.orderIndex)) : 0;
        set({
          notes: notes.map((n) => {
            if (n.id !== id) return n;
            const title = patch.title ?? n.title;
            const content = patch.content ?? n.content;
            if (title === n.title && content === n.content) return n;
            return {
              ...n,
              title,
              content,
              updatedAt: Date.now(),
              orderIndex: sortBy === 'updatedAt' ? minOrder - 1 : n.orderIndex,
            };
          }),
        });
      },

      deleteNotes: (ids) => {
        const set_ = new Set(ids);
        set({ notes: get().notes.filter((n) => !set_.has(n.id)) });
      },

      setPinned: (ids, pinned) => {
        const set_ = new Set(ids);
        const { notes } = get();
        const minOrder = notes.length ? Math.min(...notes.map((n) => n.orderIndex)) : 0;
        let offset = 0;
        set({
          notes: notes.map((n) => {
            if (!set_.has(n.id) || n.isPinned === pinned) return n;
            // Sabitlenen not sabitliler arasında en başa gelir
            return pinned
              ? { ...n, isPinned: true, orderIndex: minOrder - 1 - offset++ }
              : { ...n, isPinned: false };
          }),
        });
      },

      moveNotes: (ids, folderId) => {
        const set_ = new Set(ids);
        set({ notes: get().notes.map((n) => (set_.has(n.id) ? { ...n, folderId } : n)) });
      },

      reorderNotes: (orderedIds) => {
        const { notes } = get();
        const byId = new Map(notes.map((n) => [n.id, n]));
        const next = new Map<string, number>();
        for (const pinned of [true, false]) {
          const group = orderedIds.map((id) => byId.get(id)).filter((n): n is Note => !!n && n.isPinned === pinned);
          const slots = group.map((n) => n.orderIndex).sort((a, b) => a - b);
          group.forEach((n, i) => next.set(n.id, slots[i]));
        }
        set({ notes: notes.map((n) => (next.has(n.id) ? { ...n, orderIndex: next.get(n.id)! } : n)) });
      },

      createCalendarNote: ({ date, title, content }) => {
        const id = uid();
        const now = Date.now();
        const newNote: CalendarNote = {
          id,
          date,
          title: title.trim(),
          content: content.trim(),
          createdAt: now,
          updatedAt: now,
        };
        set({ calendarNotes: [newNote, ...get().calendarNotes] });
        return id;
      },

      updateCalendarNote: (id, patch) => {
        set({
          calendarNotes: get().calendarNotes.map((n) => {
            if (n.id !== id) return n;
            return {
              ...n,
              title: patch.title !== undefined ? patch.title.trim() : n.title,
              content: patch.content !== undefined ? patch.content.trim() : n.content,
              updatedAt: Date.now(),
            };
          }),
        });
      },

      deleteCalendarNote: (id) => {
        set({
          calendarNotes: get().calendarNotes.filter((n) => n.id !== id),
        });
      },
    }),
    {
      name: 'notes-app-storage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        folders: s.folders,
        notes: s.notes,
        calendarNotes: s.calendarNotes,
        theme: s.theme,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        sortBy: s.sortBy,
        layoutMode: s.layoutMode,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Sabitliler üstte, sonra orderIndex (veya eşitse seçili tarih sırası) */
export const sortNotes = (notes: Note[], sortBy: SortOrder = 'updatedAt'): Note[] =>
  [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return sortBy === 'createdAt' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt;
  });
