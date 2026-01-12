import { generateMonthlyPivot } from '../domain/reports.js';

function sheetFromData(data, headers) {
  const rows = [headers, ...data.map((item) => headers.map((key) => item[key]))];
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildWorkbook(state, reportFilters) {
  const wb = XLSX.utils.book_new();

  const productsSheet = sheetFromData(state.products, ['product_id', 'name', 'sku', 'active']);
  const sizesSheet = sheetFromData(state.sizes, ['size_id', 'product_id', 'length_mm', 'pack_qty', 'label', 'sort']);
  const shipmentsSheet = sheetFromData(state.shipments, ['shipment_id', 'date', 'product_id', 'size_id', 'qty', 'comment']);

  const metaRows = Object.entries(state.meta || {}).map(([key, value]) => ({ key, value }));
  const metaSheet = sheetFromData(metaRows, ['key', 'value']);

  const report = generateMonthlyPivot(state, reportFilters);
  const reportHeaders = ['product_name', 'size_label', ...report.monthKeys, 'total'];
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
  XLSX.utils.book_append_sheet(wb, sheetFromData([], ['product_id', 'name', 'sku', 'active']), 'Products');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], ['size_id', 'product_id', 'length_mm', 'pack_qty', 'label', 'sort']), 'Sizes');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], ['shipment_id', 'date', 'product_id', 'size_id', 'qty', 'comment']), 'Shipments');
  XLSX.utils.book_append_sheet(wb, sheetFromData([], ['product_name', 'size_label', 'YYYY-MM', 'total']), 'Reports_MonthlyPivot');
  XLSX.utils.book_append_sheet(wb, sheetFromData([
    { key: 'format_version', value: '1' },
    { key: 'updated_at', value: new Date().toISOString() },
  ], ['key', 'value']), 'Meta');
  return wb;
}
