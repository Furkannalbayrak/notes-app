import { uid } from './id';

export type FontSizePreset = 'sm' | 'md' | 'lg' | 'xl';

export interface StrokeData {
  color: string;
  width: number;
  d: string;
}

export interface TextBlock {
  id: string;
  type: 'text';
  text: string;
  hasCheckbox?: boolean;
  checked?: boolean;
  fontSize?: FontSizePreset;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  uri: string;
  aspectRatio?: number;
}

export interface DrawingBlock {
  id: string;
  type: 'drawing';
  strokes: StrokeData[];
  canvasWidth: number;
  canvasHeight: number;
}

export type NoteBlock = TextBlock | ImageBlock | DrawingBlock;

const DOC_PREFIX = '<!--BLOCKS_V1-->';

export const FONT_SIZE_MAP: Record<
  FontSizePreset,
  { fontSize: number; lineHeight: number; paragraphGap: number; label: string }
> = {
  sm: { fontSize: 14, lineHeight: 19, paragraphGap: 8, label: 'Küçük' },
  md: { fontSize: 17, lineHeight: 23, paragraphGap: 10, label: 'Normal' },
  lg: { fontSize: 21, lineHeight: 28, paragraphGap: 12, label: 'Büyük' },
  xl: { fontSize: 26, lineHeight: 34, paragraphGap: 14, label: 'Başlık' },
};

export function createTextBlock(
  text = '',
  opts?: { hasCheckbox?: boolean; checked?: boolean; fontSize?: FontSizePreset },
): TextBlock {
  return {
    id: uid(),
    type: 'text',
    text,
    hasCheckbox: opts?.hasCheckbox ?? false,
    checked: opts?.checked ?? false,
    fontSize: opts?.fontSize ?? 'md',
  };
}

/**
 * Blokları normalize eder:
 * - Checkbox içeren bloklarda \n varsa onları tek tek checkbox satırlarına ayırır.
 * - Arka arkaya gelen, checkbox'ı olmayan ve aynı puntoya (fontSize) sahip normal metin
 *   bloklarını tek bir multiline metin bloğunda birleştirir.
 * Böylece kullanıcı klavyedeki silme (Backspace) tuşuna basılı tuttuğunda satırlar arasında
 * takılmadan, durmaksızın akıcı bir şekilde tüm yazıları silebilir.
 */
export function normalizeBlocks(blocks: NoteBlock[], preserveId?: string): NoteBlock[] {
  if (!blocks || blocks.length === 0) {
    return [createTextBlock('', { fontSize: 'md' })];
  }

  // 1. Aşama: Sadece checkbox içeren bloklarda \n varsa onları ayrı checkbox satırlarına ayır
  const stage1: NoteBlock[] = [];
  for (const b of blocks) {
    if (b.type === 'text' && b.hasCheckbox && b.text.includes('\n')) {
      const lines = b.text.replace(/\r/g, '').split('\n');
      for (let i = 0; i < lines.length; i++) {
        stage1.push({
          id: i === 0 ? b.id || uid() : uid(),
          type: 'text',
          text: lines[i],
          hasCheckbox: true,
          checked: i === 0 ? b.checked ?? false : false,
          fontSize: b.fontSize ?? 'md',
        });
      }
    } else {
      stage1.push({ ...b, id: b.id || preserveId || uid() });
    }
  }

  // 2. Aşama: Ardışık aynı stilli normal metin bloklarını (checkbox olmayan) tek bir blokta birleştir
  const merged: NoteBlock[] = [];
  for (const b of stage1) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.type === 'text' &&
      !prev.hasCheckbox &&
      b.type === 'text' &&
      !b.hasCheckbox &&
      (prev.fontSize ?? 'md') === (b.fontSize ?? 'md')
    ) {
      prev.text = prev.text + '\n' + b.text;
    } else {
      merged.push({ ...b });
    }
  }

  return merged.length > 0 ? merged : [createTextBlock('')];
}

/** Kayıtlı not string'ini blok listesine çevirir. Eski düz metin notlarla %100 uyumludur. */
export function parseNoteBlocks(raw: string): NoteBlock[] {
  if (!raw) return [createTextBlock('')];

  if (raw.startsWith(DOC_PREFIX)) {
    const firstNewline = raw.indexOf('\n');
    const jsonPart =
      firstNewline === -1 ? raw.slice(DOC_PREFIX.length) : raw.slice(DOC_PREFIX.length, firstNewline);
    try {
      const parsed = JSON.parse(jsonPart) as NoteBlock[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeBlocks(parsed.map((b) => ({ ...b, id: b.id || uid() })));
      }
    } catch {
      // bozuksa düz metin olarak devam et
    }
  }

  return [createTextBlock(raw.replace(/\r/g, ''))];
}

/** Blok listesini veritabanına kaydedilecek string'e dönüştürür. */
export function serializeNoteBlocks(blocks: NoteBlock[]): string {
  const hasRichFeature = blocks.some(
    (b) =>
      b.type !== 'text' ||
      b.hasCheckbox ||
      (b.fontSize && b.fontSize !== 'md'),
  );
  const plainText = blocksToPlainText(blocks);
  if (!hasRichFeature) {
    return plainText;
  }
  return `${DOC_PREFIX}${JSON.stringify(blocks)}\n${plainText}`;
}

/** Kart önizlemesi ve arama için okunabilir düz metin üretir. */
export function blocksToPlainText(blocks: NoteBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === 'text') {
      const prefix = b.hasCheckbox ? (b.checked ? '☑ ' : '☐ ') : '';
      lines.push(`${prefix}${b.text}`);
    } else if (b.type === 'image') {
      lines.push('[Fotoğraf]');
    } else if (b.type === 'drawing') {
      lines.push('[Çizim]');
    }
  }
  return lines.join('\n');
}

/** Kartlarda ve aramada ham JSON görünmemesi için herhangi bir content string'inden düz metin çıkarır. */
export function getNotePlainText(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith(DOC_PREFIX)) {
    const firstNewline = raw.indexOf('\n');
    if (firstNewline !== -1) {
      return raw.slice(firstNewline + 1);
    }
    const blocks = parseNoteBlocks(raw);
    return blocksToPlainText(blocks);
  }
  return raw;
}

/** Toplam karakter sayısını (sadece metin bloklarındaki karakterler) döndürür. */
export function getBlocksCharCount(blocks: NoteBlock[]): number {
  return blocks.reduce((acc, b) => (b.type === 'text' ? acc + b.text.length : acc), 0);
}

/** Blokların tamamen boş olup olmadığını kontrol eder (boş not kaydetmeme kuralı için). */
export function areBlocksEmpty(blocks: NoteBlock[]): boolean {
  for (const b of blocks) {
    if (b.type === 'image' || b.type === 'drawing') return false;
    if (b.type === 'text' && (b.text.trim() !== '' || b.hasCheckbox)) return false;
  }
  return true;
}

/**
 * Aktif metin bloğunun ait olduğu "bitişik (aralarında boş satır olmayan) metin grubunu" bulur
 * ve istenen dönüşümü (Checkbox veya Punto) blok ID'lerini koruyarak uygular.
 */
export function transformContiguousParagraph(
  blocks: NoteBlock[],
  activeBlockIdx: number,
  _cursorOffset: number,
  updater: (groupLines: TextBlock[]) => TextBlock[],
): { blocks: NoteBlock[]; targetFocusBlockIdx: number; targetFocusBlockId: string } {
  const safeIdx = Math.min(Math.max(activeBlockIdx, 0), blocks.length - 1);
  const targetBlock = blocks[safeIdx];
  if (!targetBlock || targetBlock.type !== 'text') {
    return {
      blocks,
      targetFocusBlockIdx: safeIdx,
      targetFocusBlockId: targetBlock?.id ?? '',
    };
  }

  let gStart = safeIdx;
  let gEnd = safeIdx;

  if (targetBlock.text.trim() !== '' || targetBlock.hasCheckbox) {
    while (gStart > 0) {
      const prev = blocks[gStart - 1];
      if (prev.type === 'text' && (prev.text.trim() !== '' || prev.hasCheckbox)) {
        gStart--;
      } else {
        break;
      }
    }
    while (gEnd < blocks.length - 1) {
      const next = blocks[gEnd + 1];
      if (next.type === 'text' && (next.text.trim() !== '' || next.hasCheckbox)) {
        gEnd++;
      } else {
        break;
      }
    }
  }

  const groupSlice = blocks.slice(gStart, gEnd + 1) as TextBlock[];
  const updatedSlice = updater(groupSlice).map((item, idx) => ({
    ...item,
    id: groupSlice[idx]?.id ?? item.id,
  }));

  const finalBlocks = [
    ...blocks.slice(0, gStart),
    ...updatedSlice,
    ...blocks.slice(gEnd + 1),
  ];

  return {
    blocks: finalBlocks,
    targetFocusBlockIdx: safeIdx,
    targetFocusBlockId: targetBlock.id,
  };
}
