import { addSize, updateSize, deleteSize, listSizes } from '../../domain/sizesStore.js';
import { openModal, closeModal } from '../components/modal.js';
import { paginate, renderPagination } from '../components/pagination.js';
import { debounce } from '../utils.js';

export function renderSizesPage({ state, setState, showToast }) {
  const container = document.createElement('div');
  container.className = 'page-grid';

  const controlsCard = document.createElement('div');
  controlsCard.className = 'card';
  controlsCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Размерные шаблоны</div>
      <button class="btn primary" id="addSize">Добавить размер</button>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Поиск по label</label>
        <input type="text" id="sizeSearch" placeholder="Например, 50 мм" />
      </div>
      <div class="field">
        <label>Генератор</label>
        <button class="btn" id="openGenerator">Bulk generator</button>
      </div>
    </div>
  `;

  const tableCard = document.createElement('div');
  tableCard.className = 'card';
  const tableWrapper = document.createElement('div');
  tableCard.appendChild(tableWrapper);

  container.append(controlsCard, tableCard);

  let page = 1;
  let searchTerm = '';

  const renderTable = () => {
    const sizes = listSizes(state)
      .filter((size) => size.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const { items, page: currentPage, totalPages } = paginate(sizes, page, 8);
    page = currentPage;

    tableWrapper.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th>Длина (мм)</th>
            <th>Pack qty</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((size) => `
            <tr>
              <td>${size.size_id}</td>
              <td>${size.label}</td>
              <td>${size.length_mm}</td>
              <td>${size.pack_qty}</td>
              <td class="table-actions">
                <button class="btn ghost" data-edit="${size.size_id}">Edit</button>
                <button class="btn danger" data-delete="${size.size_id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const pagination = renderPagination({
      page,
      totalPages,
      onChange: (nextPage) => {
        page = nextPage;
        renderTable();
      },
    });
    tableWrapper.appendChild(pagination);

    tableWrapper.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => openEditModal(button.dataset.edit));
    });
    tableWrapper.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => confirmDelete(button.dataset.delete));
    });
  };

  const openEditModal = (sizeId) => {
    const size = state.sizes.find((item) => item.size_id === sizeId);
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>Label</label>
        <input type="text" id="sizeLabel" value="${size.label}" />
      </div>
      <div class="field">
        <label>Длина (мм)</label>
        <input type="number" id="sizeLength" value="${size.length_mm}" />
      </div>
      <div class="field">
        <label>Pack qty</label>
        <input type="number" id="sizePack" value="${size.pack_qty}" />
      </div>
    `;

    openModal({
      title: `Размер ${size.size_id}`,
      content: form,
      actions: [
        {
          label: 'Сохранить',
          variant: 'primary',
          onClick: async () => {
            const label = form.querySelector('#sizeLabel').value.trim();
            if (!label) {
              showToast('Label обязателен', 'warning');
              return;
            }
            const length = Number(form.querySelector('#sizeLength').value);
            const packQty = Number(form.querySelector('#sizePack').value);
            const nextState = updateSize(state, sizeId, {
              label,
              length_mm: length,
              pack_qty: packQty,
              sort: length,
            });
            await setState(nextState);
            closeModal();
            showToast('Размер обновлён', 'success');
          },
        },
      ],
    });
  };

  const confirmDelete = (sizeId) => {
    openModal({
      title: 'Удалить размер?',
      content: '<p>Удалить размер и связанные отгрузки?</p>',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onClick: async () => {
            const nextState = deleteSize(state, sizeId);
            await setState(nextState);
            closeModal();
            showToast('Размер удалён', 'success');
          },
        },
      ],
    });
  };

  const openGenerator = () => {
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>start_mm</label>
        <input type="number" id="genStart" value="10" />
      </div>
      <div class="field">
        <label>end_mm</label>
        <input type="number" id="genEnd" value="100" />
      </div>
      <div class="field">
        <label>step_mm</label>
        <input type="number" id="genStep" value="10" />
      </div>
      <div class="field">
        <label>pack_qty</label>
        <input type="number" id="genPack" value="1" />
      </div>
      <div class="field">
        <label>Шаблон label</label>
        <input type="text" id="genTemplate" value="{mm} мм, {pack} шт" />
      </div>
    `;

    openModal({
      title: 'Bulk generator',
      content: form,
      actions: [
        {
          label: 'Generate sizes',
          variant: 'primary',
          onClick: async () => {
            const start = Number(form.querySelector('#genStart').value);
            const end = Number(form.querySelector('#genEnd').value);
            const step = Number(form.querySelector('#genStep').value);
            const pack = Number(form.querySelector('#genPack').value);
            const template = form.querySelector('#genTemplate').value;

            if (!step || end < start) {
              showToast('Проверьте параметры', 'warning');
              return;
            }

            let nextState = { ...state };
            for (let length = start; length <= end; length += step) {
              const label = template
                .replace('{mm}', length)
                .replace('{pack}', pack);
              const exists = nextState.sizes.some((size) =>
                size.label === label
              );
              if (exists) {
                continue;
              }
              nextState = addSize(nextState, {
                length_mm: length,
                pack_qty: pack,
                label,
                sort: length,
              });
            }

            await setState(nextState);
            closeModal();
            showToast('Размеры сгенерированы', 'success');
          },
        },
      ],
    });
  };

  controlsCard.querySelector('#sizeSearch').addEventListener('input', debounce((event) => {
    searchTerm = event.target.value;
    page = 1;
    renderTable();
  }));

  controlsCard.querySelector('#addSize').addEventListener('click', () => {
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>Label</label>
        <input type="text" id="sizeLabel" placeholder="50 мм, 1 шт" />
      </div>
      <div class="field">
        <label>Длина (мм)</label>
        <input type="number" id="sizeLength" value="0" />
      </div>
      <div class="field">
        <label>Pack qty</label>
        <input type="number" id="sizePack" value="1" />
      </div>
    `;

    openModal({
      title: 'Новый размер',
      content: form,
      actions: [
        {
          label: 'Создать',
          variant: 'primary',
          onClick: async () => {
            const label = form.querySelector('#sizeLabel').value.trim();
            if (!label) {
              showToast('Label обязателен', 'warning');
              return;
            }
            const length = Number(form.querySelector('#sizeLength').value);
            const packQty = Number(form.querySelector('#sizePack').value);
            const nextState = addSize(state, {
              length_mm: length,
              pack_qty: packQty,
              label,
              sort: length,
            });
            await setState(nextState);
            closeModal();
            showToast('Размер добавлен', 'success');
          },
        },
      ],
    });
  });

  controlsCard.querySelector('#openGenerator').addEventListener('click', openGenerator);

  renderTable();

  return {
    title: 'Размеры',
    subtitle: 'Шаблоны размеров применяются к любому товару.',
    content: container,
  };
}
