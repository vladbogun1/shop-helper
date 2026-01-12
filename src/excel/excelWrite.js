import { generateMonthlyPivot } from '../domain/reports.js';

function sheetFromData(data, headers) {
  const rows = [headers.map((header) => header.label), ...data.map((item) => headers.map((header) => item[header.key]))];
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildWorkbook(state, reportFilters) {
  const wb = XLSX.utils.book_new();

  const productsSheet = sheetFromData(state.products, [
    { key: 'product_id', label: 'ID товара' },
    { key: 'name', label: 'Название' },
    { key: 'active', label: 'Активен' },
  ]);
  const sizesSheet = sheetFromData(state.sizes, [
    { key: 'size_id', label: 'ID размера' },
    { key: 'length_mm', label: 'Длина (мм)' },
    { key: 'pack_qty', label: 'Кол-во в упаковке' },
    { key: 'label', label: 'Label' },
    { key: 'sort', label: 'Сортировка' },
  ]);
  const shipmentsSheet = sheetFromData(state.shipments, [
    { key: 'shipment_id', label: 'ID отгрузки' },
    { key: 'date', label: 'Дата' },
    { key: 'product_id', label: 'ID товара' },
    { key: 'size_id', label: 'ID размера' },
    { key: 'qty', label: 'Количество' },
    { key: 'comment', label: 'Комментарий' },
  ]);

  const metaRows = Object.entries(state.meta || {}).map(([key, value]) => ({ key, value }));
  const metaSheet = sheetFromData(metaRows, [
    { key: 'key', label: 'Ключ' },
    { key: 'value', label: 'Значение' },
  ]);

  const report = generateMonthlyPivot(state, reportFilters);
  const reportHeaders = [
    { key: 'product_name', label: 'Товар' },
    { key: 'size_label', label: 'Размер' },
    ...report.monthKeys.map((month) => ({ key: month, label: month })),
    { key: 'total', label: 'Итого' },
  ];
  const reportRows = report.rows.map((row) => ({
    product_name: row.product_name,
    size_label: row.size_label,
    ...row.totals,
    total: row.total,
  }));
  const reportSheet = sheetFromData(reportRows, reportHeaders);

  XLSX.utils.book_append_sheet(wb, productsSheet, 'Products');
  XLSX.utils.book_append_sheet(wb, sizesSheet, 'Sizes');
  XLSX.utils.book_append_sheet(wb, shipmentsSheet, 'Shipments');
  XLSX.utils.book_append_sheet(wb, reportSheet, 'Reports_MonthlyPivot');
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Meta');

  return wb;
}

export function downloadWorkbook(workbook, filename = 'sales-excel-assistant.xlsx') {
  XLSX.writeFile(workbook, filename);
}

export function buildTemplateWorkbook() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFromData([], [
    { key: 'product_id', label: 'ID товара' },
    { key: 'name', label: 'Название' },
    { key: 'active', label: 'Активен' },
  ]), 'Products');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], [
    { key: 'size_id', label: 'ID размера' },
    { key: 'length_mm', label: 'Длина (мм)' },
    { key: 'pack_qty', label: 'Кол-во в упаковке' },
    { key: 'label', label: 'Label' },
    { key: 'sort', label: 'Сортировка' },
  ]), 'Sizes');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], [
    { key: 'shipment_id', label: 'ID отгрузки' },
    { key: 'date', label: 'Дата' },
    { key: 'product_id', label: 'ID товара' },
    { key: 'size_id', label: 'ID размера' },
    { key: 'qty', label: 'Количество' },
    { key: 'comment', label: 'Комментарий' },
  ]), 'Shipments');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], [
    { key: 'product_name', label: 'Товар' },
    { key: 'size_label', label: 'Размер' },
    { key: 'YYYY-MM', label: 'YYYY-MM' },
    { key: 'total', label: 'Итого' },
  ]), 'Reports_MonthlyPivot');
  XLSX.utils.book_append_sheet(wb, sheetFromData([
    { key: 'format_version', value: '1' },
    { key: 'updated_at', value: new Date().toISOString() },
  ], [
    { key: 'key', label: 'Ключ' },
    { key: 'value', label: 'Значение' },
  ]), 'Meta');
  return wb;
}
