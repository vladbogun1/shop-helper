export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function monthKey(dateString) {
  return dateString.slice(0, 7);
}

export function rangeMonths(from, to) {
  const result = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    result.push(month);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function clampDateRange(from, to) {
  if (from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(value);
}
