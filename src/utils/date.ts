const MONTHS = [
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

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const hm = (d: Date) => `${d.getHours()}:${pad(d.getMinutes())}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Kart tarihi: bugün → "14:49", dün → "Dün 22:34", daha eski → "6 Kasım" (farklı yıl → "6 Kasım 2024") */
export function formatSmartDate(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const diffDays = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return hm(d);
  if (diffDays === 1) return `Dün ${hm(d)}`;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Editör bilgi satırı tarihi: "13 Kasım 14:49" */
export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hm(d)}`;
}
