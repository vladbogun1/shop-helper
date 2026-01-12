import { readWorkbook, detectFormat, readNormalizedData } from '../../excel/excelRead.js';
import { buildWorkbook, downloadWorkbook, buildTemplateWorkbook } from '../../excel/excelWrite.js';
import { parseLegacySheet, buildStateFromLegacy } from '../../excel/importWizard.js';
import { toISODate } from '../utils.js';

export function renderImportPage({ state, setState, uiState, setLegacyImport, clearLegacyImport, showToast }) {
  const container = document.createElement('div');
  container.className = 'page-grid';

  const uploadCard = document.createElement('div');
  uploadCard.className = 'card';
  uploadCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Импорт Excel</div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Upload Excel (.xlsx)</label>
        <input type="file" id="excelUpload" accept=".xlsx" />
      </div>
      <div class="field">
        <label>Текущие данные</label>
        <div class="tag">Товаров: ${state.products.length}</div>
        <div class="tag">Размеров: ${state.sizes.length}</div>
        <div class="tag">Отгрузок: ${state.shipments.length}</div>
      </div>
    </div>
  `;

  const exportCard = document.createElement('div');
  exportCard.className = 'card';
  exportCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Экспорт</div>
    </div>
    <div class="inline-controls">
      <button class="btn primary" id="downloadExcel">Download Excel</button>
      <button class="btn" id="createTemplate">Create new template</button>
    </div>
    <p class="hint" style="margin-top: 12px;">Экспорт обновит лист Reports_MonthlyPivot автоматически.</p>
  `;

  const legacyCard = document.createElement('div');
  legacyCard.className = 'card';
  legacyCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Import Wizard (старый формат)</div>
    </div>
    <div class="modal-body" id="legacyBody">
      <p class="hint">Загрузите файл со старым листом "Товары на складе" — здесь появится мастер импорта.</p>
    </div>
  `;

  container.append(uploadCard, exportCard, legacyCard);

  uploadCard.querySelector('#excelUpload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const workbook = await readWorkbook(file);
      const format = detectFormat(workbook);
      if (format === 'normalized') {
        const data = readNormalizedData(workbook);
        await setState({
          ...state,
          ...data,
          meta: {
            ...state.meta,
            ...data.meta,
          },
        });
        clearLegacyImport();
        showToast('Файл загружен (новый формат)', 'success');
      } else if (format === 'legacy') {
        const sheet = workbook.Sheets['Товары на складе'];
        const parsed = parseLegacySheet(sheet);
        if (!parsed) {
          throw new Error('Не удалось прочитать лист');
        }
        setLegacyImport({ parsed, fileName: file.name });
        showToast('Обнаружен старый формат. Запустите мастер импорта.', 'warning');
      } else {
        showToast('Неизвестный формат Excel. Проверьте листы.', 'danger');
      }
    } catch (error) {
      showToast(`Ошибка импорта: ${error.message}`, 'danger');
    }
  });

  exportCard.querySelector('#downloadExcel').addEventListener('click', () => {
    const reportFilters = {
      from: state.shipments.length ? state.shipments.reduce((min, item) => (item.date < min ? item.date : min), state.shipments[0].date) : toISODate(new Date()),
      to: state.shipments.length ? state.shipments.reduce((max, item) => (item.date > max ? item.date : max), state.shipments[0].date) : toISODate(new Date()),
    };
    const workbook = buildWorkbook(state, reportFilters);
    downloadWorkbook(workbook);
    showToast('Excel сформирован', 'success');
  });

  exportCard.querySelector('#createTemplate').addEventListener('click', () => {
    const workbook = buildTemplateWorkbook();
    downloadWorkbook(workbook, 'sales-excel-template.xlsx');
    showToast('Шаблон создан', 'success');
  });

  if (uiState.legacyImport) {
    const { parsed } = uiState.legacyImport;
    const legacyBody = legacyCard.querySelector('#legacyBody');
    legacyBody.innerHTML = `
      <div class="form-grid">
        <div class="field">
          <label>Стартовый год для первого месяца</label>
          <input type="number" id="startYear" min="2000" max="2100" value="${new Date().getFullYear()}" />
        </div>
        <div class="field">
          <label>Обнаруженные месяцы</label>
          <div class="tag">${parsed.monthColumns.join(', ') || 'не найдены'}</div>
        </div>
      </div>
      <div class="inline-controls" style="margin-top: 16px;">
        <button class="btn primary" id="runLegacyImport">Импортировать</button>
        <button class="btn" id="cancelLegacyImport">Отмена</button>
      </div>
    `;

    legacyBody.querySelector('#runLegacyImport').addEventListener('click', async () => {
      const startYear = Number(legacyBody.querySelector('#startYear').value);
      const nextState = buildStateFromLegacy(parsed, startYear);
      await setState({
        ...state,
        ...nextState,
      });
      clearLegacyImport();
      showToast('Импорт старого формата завершён', 'success');
    });

    legacyBody.querySelector('#cancelLegacyImport').addEventListener('click', () => {
      clearLegacyImport();
      showToast('Импорт отменён', 'warning');
    });
  }

  return {
    title: 'Импорт / Экспорт',
    subtitle: 'Загрузите Excel, создайте шаблон или скачайте обновлённый файл.',
    content: container,
  };
}
