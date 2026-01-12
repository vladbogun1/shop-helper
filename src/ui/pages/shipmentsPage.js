import { addShipment, updateShipment, deleteShipment } from '../../domain/shipmentsStore.js';
import { openModal, closeModal } from '../components/modal.js';
import { paginate, renderPagination } from '../components/pagination.js';
import { debounce, toISODate } from '../utils.js';

export function renderShipmentsPage({ state, setState, showToast }) {
  const container = document.createElement('div');
  container.className = 'page-grid';

  const formCard = document.createElement('div');
  formCard.className = 'card';
  formCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Новая отгрузка</div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Дата</label>
        <input type="date" id="shipmentDate" value="${toISODate(new Date())}" />
      </div>
      <div class="field">
        <label>Поиск товара</label>
        <input type="text" id="shipmentProductSearch" placeholder="Поиск" />
      </div>
      <div class="field">
        <label>Товар</label>
        <select id="shipmentProduct"></select>
      </div>
      <div class="field">
        <label>Размер</label>
        <select id="shipmentSize"></select>
      </div>
      <div class="field">
        <label>Количество</label>
        <input type="number" id="shipmentQty" min="0" value="0" />
      </div>
      <div class="field">
        <label>Комментарий</label>
        <input type="text" id="shipmentComment" placeholder="Опционально" />
      </div>
    </div>
    <div class="inline-controls" style="margin-top: 16px;">
      <button class="btn primary" id="addShipment">Add shipment</button>
    </div>
  `;

  const tableCard = document.createElement('div');
  tableCard.className = 'card';
  tableCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Последние отгрузки</div>
      <div class="inline-controls">
        <input type="date" id="filterFrom" />
        <input type="date" id="filterTo" />
        <input type="text" id="filterProduct" placeholder="Фильтр по товару" />
      </div>
    </div>
    <div id="shipmentsTable"></div>
  `;

  container.append(formCard, tableCard);

  const productSelect = formCard.querySelector('#shipmentProduct');
  const sizeSelect = formCard.querySelector('#shipmentSize');
  let productSearch = '';
  let filterProduct = '';
  let filterFrom = '';
  let filterTo = '';
  let page = 1;

  const updateProductSelect = () => {
    const filtered = state.products.filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    );
    productSelect.innerHTML = filtered
      .map((product) => `<option value="${product.product_id}">${product.name}</option>`)
      .join('');
    if (!filtered.find((item) => item.product_id === productSelect.value)) {
      productSelect.value = filtered[0]?.product_id || '';
    }
    updateSizeSelect();
  };

  const updateSizeSelect = () => {
    const sizes = state.sizes;
    sizeSelect.innerHTML = sizes
      .map((size) => `<option value="${size.size_id}">${size.label}</option>`)
      .join('');
  };

  const renderTable = () => {
    const productMap = new Map(state.products.map((p) => [p.product_id, p]));
    const sizeMap = new Map(state.sizes.map((s) => [s.size_id, s]));

    const filtered = state.shipments.filter((shipment) => {
      if (filterFrom && shipment.date < filterFrom) {
        return false;
      }
      if (filterTo && shipment.date > filterTo) {
        return false;
      }
      const product = productMap.get(shipment.product_id);
      if (filterProduct && product && !product.name.toLowerCase().includes(filterProduct.toLowerCase())) {
        return false;
      }
      return true;
    });

    const { items, page: currentPage, totalPages } = paginate(
      filtered.sort((a, b) => b.date.localeCompare(a.date)),
      page,
      10
    );
    page = currentPage;

    const tableRoot = tableCard.querySelector('#shipmentsTable');
    tableRoot.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Дата</th>
            <th>Товар</th>
            <th>Размер</th>
            <th>Qty</th>
            <th>Комментарий</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((shipment) => {
            const product = productMap.get(shipment.product_id);
            const size = sizeMap.get(shipment.size_id);
            return `
              <tr>
                <td>${shipment.shipment_id}</td>
                <td>${shipment.date}</td>
                <td>${product?.name || '—'}</td>
                <td>${size?.label || '—'}</td>
                <td>${shipment.qty}</td>
                <td>${shipment.comment || ''}</td>
                <td class="table-actions">
                  <button class="btn ghost" data-edit="${shipment.shipment_id}">Edit</button>
                  <button class="btn danger" data-delete="${shipment.shipment_id}">Delete</button>
                </td>
              </tr>
            `;
          }).join('')}
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
    tableRoot.appendChild(pagination);

    tableRoot.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => openEditModal(button.dataset.edit));
    });
    tableRoot.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => confirmDelete(button.dataset.delete));
    });
  };

  const openEditModal = (shipmentId) => {
    const shipment = state.shipments.find((item) => item.shipment_id === shipmentId);
    const form = document.createElement('div');
    form.className = 'form-grid';
    form.innerHTML = `
      <div class="field">
        <label>Дата</label>
        <input type="date" id="editDate" value="${shipment.date}" />
      </div>
      <div class="field">
        <label>Qty</label>
        <input type="number" id="editQty" value="${shipment.qty}" min="0" />
      </div>
      <div class="field">
        <label>Комментарий</label>
        <input type="text" id="editComment" value="${shipment.comment}" />
      </div>
    `;

    openModal({
      title: `Отгрузка ${shipment.shipment_id}`,
      content: form,
      actions: [
        {
          label: 'Сохранить',
          variant: 'primary',
          onClick: async () => {
            const date = form.querySelector('#editDate').value;
            const qty = Number(form.querySelector('#editQty').value);
            if (qty < 0) {
              showToast('Количество не может быть отрицательным', 'warning');
              return;
            }
            const comment = form.querySelector('#editComment').value.trim();
            const nextState = updateShipment(state, shipmentId, { date, qty, comment });
            await setState(nextState);
            closeModal();
            showToast('Отгрузка обновлена', 'success');
          },
        },
      ],
    });
  };

  const confirmDelete = (shipmentId) => {
    openModal({
      title: 'Удалить отгрузку?',
      content: '<p>Действие нельзя отменить.</p>',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onClick: async () => {
            const nextState = deleteShipment(state, shipmentId);
            await setState(nextState);
            closeModal();
            showToast('Отгрузка удалена', 'success');
          },
        },
      ],
    });
  };

  formCard.querySelector('#shipmentProductSearch').addEventListener('input', debounce((event) => {
    productSearch = event.target.value;
    updateProductSelect();
  }));

  productSelect.addEventListener('change', updateSizeSelect);

  formCard.querySelector('#addShipment').addEventListener('click', async () => {
    const date = formCard.querySelector('#shipmentDate').value;
    const productId = productSelect.value;
    const sizeId = sizeSelect.value;
    const qty = Number(formCard.querySelector('#shipmentQty').value);
    const comment = formCard.querySelector('#shipmentComment').value.trim();

    if (!date || !productId || !sizeId) {
      showToast('Заполните обязательные поля', 'warning');
      return;
    }
    if (qty < 0) {
      showToast('Количество не может быть отрицательным', 'warning');
      return;
    }

    const nextState = addShipment(state, { date, product_id: productId, size_id: sizeId, qty, comment });
    await setState(nextState);
    showToast('Отгрузка добавлена', 'success');
  });

  tableCard.querySelector('#filterFrom').addEventListener('change', (event) => {
    filterFrom = event.target.value;
    renderTable();
  });
  tableCard.querySelector('#filterTo').addEventListener('change', (event) => {
    filterTo = event.target.value;
    renderTable();
  });
  tableCard.querySelector('#filterProduct').addEventListener('input', debounce((event) => {
    filterProduct = event.target.value;
    renderTable();
  }));

  updateProductSelect();
  renderTable();

  return {
    title: 'Отгрузки',
    subtitle: 'Вводите реальные отгрузки с привязкой к товарам и размерам.',
    content: container,
  };
}
