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
