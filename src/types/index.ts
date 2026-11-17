export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  orderIndex: number;
}

export interface CalendarNote {
  id: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null; // null ise "Kategorilenmemiş"
  isPinned: boolean;
  orderIndex: number; // Sürükle-bırak sıralaması için
  createdAt: number;
  updatedAt: number;
}

export interface DeletedNote extends Note {
  deletedAt: number;
}

export type ThemeMode = 'dark' | 'light';

export type AppFontSize = 'small' | 'medium' | 'large' | 'huge';

export type AppFontFamily =
  | 'inter'
  | 'roboto'
  | 'poppins'
  | 'nunito'
  | 'montserrat'
  | 'opensans'
  | 'quicksand'
  | 'raleway'
  | 'comfortaa'
  | 'spacegrotesk'
  | 'oswald'
  | 'lora'
  | 'merriweather'
  | 'crimsonpro'
  | 'playfair'
  | 'caveat'
  | 'dancingscript'
  | 'jetbrains';

export type SortOrder = 'updatedAt' | 'createdAt';

export type LayoutMode = 'grid' | 'list';

/** Ana ekrandaki klasör filtresi: 'all' = Tümü, 'none' = Kategorilenmemiş, aksi halde klasör id'si */
export type FolderFilter = 'all' | 'none' | string;

export type RootStackParamList = {
  Home: undefined;
  Editor: {
    noteId?: string;
    folderId?: string | null;
    fromFab?: boolean;
    originX?: number;
    originY?: number;
  };
  Settings: undefined;
  Folders:
    | {
        moveNoteIds?: string[];
      }
    | undefined;
  Trash: undefined;
  Calendar: undefined;
};
