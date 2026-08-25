export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  let totalMin = h * 60 + m + Math.round(hours * 60);
  totalMin = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface WeekDay {
  date: string;
  label: string;
  num: string;
  isToday: boolean;
}

export function getWeekDates(dateStr: string): WeekDay[] {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const todayStr = new Date().toISOString().split('T')[0];
  const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const iso = day.toISOString().split('T')[0];
    return { date: iso, label: labels[i], num: String(day.getDate()).padStart(2, '0'), isToday: iso === todayStr };
  });
}

export function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function calcHours(entry: string, exit: string): string {
  const [eh, em] = entry.split(':').map(Number);
  const [xh, xm] = exit.split(':').map(Number);
  let entryMin = eh * 60 + em;
  let exitMin = xh * 60 + xm;
  if (exitMin <= entryMin) exitMin += 24 * 60;
  return ((exitMin - entryMin) / 60).toFixed(2);
}

export function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');
  const formatted = date.toLocaleDateString('es-US', {
    weekday: 'short',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  // Capitalizar primera letra del día
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatTime12Hour(timeStr: string | null | undefined): string {
  if (!timeStr || timeStr === '-') return '-';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDateTimeDay(isoStr: string): string {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  const formatted = date.toLocaleDateString('es-US', {
    weekday: 'short',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
