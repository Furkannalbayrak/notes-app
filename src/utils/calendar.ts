export interface CalendarGridCell {
  dateKey: string;
  year: number;
  month: number; // 0-indexed (0 = Ocak)
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const DAY_NAMES_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const DAY_NAMES_FULL = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function getTodayKey(): string {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatFullDisplayDate(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const d = new Date(year, month, day);
  return `${day} ${MONTH_NAMES[month]} ${year}, ${DAY_NAMES_FULL[d.getDay()]}`;
}

export function formatDateParts(dateKey: string): { dateStr: string; dayName: string } {
  const { year, month, day } = parseDateKey(dateKey);
  const d = new Date(year, month, day);
  return {
    dateStr: `${day} ${MONTH_NAMES[month]} ${year}`,
    dayName: DAY_NAMES_FULL[d.getDay()],
  };
}

export function formatShortDisplayDate(dateKey: string): string {
  const { month, day } = parseDateKey(dateKey);
  return `${day} ${MONTH_NAMES[month]}`;
}

export function generateMonthGrid(year: number, month: number): CalendarGridCell[] {
  const todayKey = getTodayKey();
  const firstDayDate = new Date(year, month, 1);
  // Pazartesi = 0, Pazar = 6
  const startWeekday = (firstDayDate.getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarGridCell[] = [];

  // Önceki aydan taşan günler
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const key = toDateKey(prevYear, prevMonth, d);
    cells.push({
      dateKey: key,
      year: prevYear,
      month: prevMonth,
      day: d,
      isCurrentMonth: false,
      isToday: key === todayKey,
    });
  }

  // Mevcut ayın günleri
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const key = toDateKey(year, month, d);
    cells.push({
      dateKey: key,
      year,
      month,
      day: d,
      isCurrentMonth: true,
      isToday: key === todayKey,
    });
  }

  // Sonraki aydan taşan günler (7'nin katı ve en az 35 gün olacak şekilde)
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const key = toDateKey(nextYear, nextMonth, nextDay);
    cells.push({
      dateKey: key,
      year: nextYear,
      month: nextMonth,
      day: nextDay,
      isCurrentMonth: false,
      isToday: key === todayKey,
    });
    nextDay++;
  }

  return cells;
}
