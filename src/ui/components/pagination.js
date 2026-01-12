export function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: currentPage,
    totalPages,
    total,
  };
}

export function renderPagination({ page, totalPages, onChange }) {
  const root = document.createElement('div');
  root.className = 'pagination';

  const info = document.createElement('span');
  info.textContent = `Страница ${page} / ${totalPages}`;

  const prev = document.createElement('button');
  prev.className = 'btn ghost';
  prev.textContent = 'Назад';
  prev.disabled = page <= 1;
  prev.addEventListener('click', () => onChange(page - 1));

  const next = document.createElement('button');
  next.className = 'btn ghost';
  next.textContent = 'Вперёд';
  next.disabled = page >= totalPages;
  next.addEventListener('click', () => onChange(page + 1));

  root.append(prev, info, next);
  return root;
}
