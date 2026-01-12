import { generateMonthlyPivot, aggregateMonthlyTotals } from '../../domain/reports.js';
import { buildWorkbook, downloadWorkbook } from '../../excel/excelWrite.js';
import { clampDateRange, monthKey, toISODate, formatNumber } from '../utils.js';

let chartInstance = null;

export function renderReportsPage({ state, setState, showToast }) {
  const container = document.createElement('div');
  container.className = 'page-grid';

  const hasShipments = state.shipments.length > 0;
  const defaultFrom = hasShipments
    ? state.shipments.reduce((min, item) => (item.date < min ? item.date : min), state.shipments[0].date)
    : toISODate(new Date());
  const defaultTo = hasShipments
    ? state.shipments.reduce((max, item) => (item.date > max ? item.date : max), state.shipments[0].date)
    : toISODate(new Date());

  const filtersCard = document.createElement('div');
  filtersCard.className = 'card';
  filtersCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Фильтры</div>
      <button class="btn primary" id="exportReport">Export reports to Excel</button>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Период от</label>
        <input type="date" id="reportFrom" value="${defaultFrom}" />
      </div>
      <div class="field">
        <label>Период до</label>
        <input type="date" id="reportTo" value="${defaultTo}" />
      </div>
      <div class="field">
        <label>Быстрые пресеты</label>
        <div class="inline-controls" id="quickPresets">
          <button class="btn" data-months="1">1 месяц</button>
          <button class="btn" data-months="3">3 месяца</button>
          <button class="btn" data-months="6">6 месяцев</button>
          <button class="btn" data-months="12">12 месяцев</button>
        </div>
      </div>
    </div>
  `;

  const tableCard = document.createElement('div');
  tableCard.className = 'card';
  tableCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Monthly Pivot</div>
    </div>
    <div style="overflow:auto; max-height: 420px;" id="reportTable"></div>
  `;

  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  chartCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Суммарные отгрузки по месяцам</div>
    </div>
    <canvas id="reportChart" height="120"></canvas>
  `;

  container.append(filtersCard, tableCard, chartCard);

  const reportFrom = filtersCard.querySelector('#reportFrom');
  const reportTo = filtersCard.querySelector('#reportTo');

  const updateReport = () => {
    const range = clampDateRange(reportFrom.value, reportTo.value);
    reportFrom.value = range.from;
    reportTo.value = range.to;

    const report = generateMonthlyPivot(state, range);
    const tableRoot = tableCard.querySelector('#reportTable');

    if (!report.monthKeys.length) {
      tableRoot.innerHTML = '<p class="hint">Нет данных за выбранный период.</p>';
      return;
    }

    tableRoot.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Товар</th>
            <th>Размер</th>
            ${report.monthKeys.map((month) => `<th>${month}</th>`).join('')}
            <th>Итого</th>
          </tr>
        </thead>
        <tbody>
          ${report.rows.map((row) => `
            <tr>
              <td>${row.product_name}</td>
              <td>${row.size_label}</td>
              ${report.monthKeys.map((month) => `<td>${formatNumber(row.totals[month])}</td>`).join('')}
              <td><strong>${formatNumber(row.total)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const totals = aggregateMonthlyTotals(state, range);
    const ctx = chartCard.querySelector('#reportChart');
    const dataset = totals.monthKeys.map((month) => totals.totals[month]);
    if (chartInstance) {
      chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: totals.monthKeys,
        datasets: [
          {
            label: 'Отгрузки',
            data: dataset,
            borderColor: '#2f5bff',
            backgroundColor: 'rgba(47, 91, 255, 0.15)',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  };

  filtersCard.querySelector('#quickPresets').addEventListener('click', (event) => {
    const months = event.target.dataset.months;
    if (!months) {
      return;
    }
    const end = new Date(reportTo.value + 'T00:00:00');
    const start = new Date(end);
    start.setMonth(start.getMonth() - Number(months) + 1);
    start.setDate(1);
    reportFrom.value = toISODate(start);
    updateReport();
  });

  filtersCard.querySelector('#exportReport').addEventListener('click', () => {
    const range = clampDateRange(reportFrom.value, reportTo.value);
    const workbook = buildWorkbook(state, range);
    downloadWorkbook(workbook, `reports-${monthKey(range.from)}-${monthKey(range.to)}.xlsx`);
    showToast('Отчёт выгружен', 'success');
  });

  reportFrom.addEventListener('change', updateReport);
  reportTo.addEventListener('change', updateReport);

  updateReport();

  return {
    title: 'Отчёты',
    subtitle: 'Сводные отчёты и pivot-таблицы по отгрузкам.',
    content: container,
  };
}
