import { addProduct, updateProduct, deleteProduct } from '../../domain/productsStore.js';
import { openModal, closeModal } from '../components/modal.js';
import { paginate, renderPagination } from '../components/pagination.js';
import { debounce } from '../utils.js';

export function renderProductsPage({ state, setState, showToast }) {
  const container = document.createElement('div');
  container.className = 'page-grid';

  const controlsCard = document.createElement('div');
  controlsCard.className = 'card';
  controlsCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Каталог товаров</div>
      <button class="btn primary" id="addProduct">Добавить товар</button>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Поиск по названию</label>
        <input type="text" id="productSearch" placeholder="Например, Труба" />
      </div>
      <div class="field">
        <label>Сортировка</label>
        <select id="productSort">
          <option value="name">По имени</option>
        </select>
      </div>
    </div>
  `;

  const tableCard = document.createElement('div');
  tableCard.className = 'card';
  const tableWrapper = document.createElement('div');
  tableCard.appendChild(tableWrapper);

  container.append(controlsCard, tableCard);

  let searchTerm = '';
  let sortBy = 'name';
  let page = 1;

  const renderTable = () => {
    const filtered = state.products
      .filter((product) => {
        const term = searchTerm.toLowerCase();
        return product.name.toLowerCase().includes(term);
      })
      .sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])));

    const { items, page: currentPage, totalPages } = paginate(filtered, page, 8);
    page = currentPage;

    tableWrapper.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((product) => `
            <tr>
              <td>${product.product_id}</td>
              <td>${product.name}</td>
              <td>${product.active ? '<span class="badge success">Активен</span>' : '<span class="badge muted">Отключён</span>'}</td>
              <td class="table-actions">
                <button class="btn ghost" data-edit="${product.product_id}">Edit</button>
                <button class="btn" data-disable="${product.product_id}">${product.active ? 'Disable' : 'Enable'}</button>
                <button class="btn danger" data-delete="${product.product_id}">Delete</button>
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
    tableWrapper.querySelectorAll('[data-disable]').forEach((button) => {
      button.addEventListener('click', async () => {
        const productId = button.dataset.disable;
        const product = state.products.find((item) => item.product_id === productId);
        const nextState = updateProduct(state, productId, { active: !product.active });
        await setState(nextState);
        showToast('Статус обновлён', 'success');
      });
    });
    tableWrapper.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => confirmDelete(button.dataset.delete));
    });
  };

  const openEditModal = (productId) => {
    const product = state.products.find((item) => item.product_id === productId);
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>Название</label>
        <input type="text" id="productName" value="${product.name}" />
      </div>
    `;

    openModal({
      title: `Редактировать ${product.product_id}`,
      content: form,
      actions: [
        {
          label: 'Сохранить',
          variant: 'primary',
          onClick: async () => {
            const name = form.querySelector('#productName').value.trim();
            if (!name) {
              showToast('Название обязательно', 'warning');
              return;
            }
            const nextState = updateProduct(state, productId, { name });
            await setState(nextState);
            closeModal();
            showToast('Товар обновлён', 'success');
          },
        },
      ],
    });
  };

  const confirmDelete = (productId) => {
    openModal({
      title: 'Подтвердите удаление',
      content: `<p>Удалить товар и все связанные размеры/отгрузки?</p>`,
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onClick: async () => {
            const nextState = deleteProduct(state, productId);
            await setState(nextState);
            closeModal();
            showToast('Товар удалён', 'success');
          },
        },
      ],
    });
  };

  controlsCard.querySelector('#addProduct').addEventListener('click', () => {
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>Название</label>
        <input type="text" id="productName" placeholder="Например, Труба" />
      </div>
    `;

    openModal({
      title: 'Новый товар',
      content: form,
      actions: [
        {
          label: 'Создать',
          variant: 'primary',
          onClick: async () => {
            const name = form.querySelector('#productName').value.trim();
            if (!name) {
              showToast('Название обязательно', 'warning');
              return;
            }
            const nextState = addProduct(state, { name, active: true });
            await setState(nextState);
            closeModal();
            showToast('Товар добавлен', 'success');
          },
        },
      ],
    });
  });

  controlsCard.querySelector('#productSearch').addEventListener('input', debounce((event) => {
    searchTerm = event.target.value;
    page = 1;
    renderTable();
  }));

  controlsCard.querySelector('#productSort').addEventListener('change', (event) => {
    sortBy = event.target.value;
    renderTable();
  });

  renderTable();

  return {
    title: 'Товары',
    subtitle: 'Создавайте и поддерживайте каталог продуктов.',
    content: container,
  };
}
