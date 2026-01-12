import { generateMonthlyPivot } from '../domain/reports.js';

function sheetFromData(data, headers) {
  const rows = [headers.map((header) => header.label), ...data.map((item) => headers.map((header) => item[header.key]))];
  return XLSX.utils.aoa_to_sheet(rows);
}

function applySheetLayout(sheet, headers) {
  const columnWidths = headers.map((header) => ({ wch: header.width ?? 18 }));
  sheet['!cols'] = columnWidths;
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.c >= range.s.c && range.e.r >= range.s.r) {
    sheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  }
}

function applyDataValidation(sheet, validations) {
  sheet['!dataValidation'] = validations;
}

function columnLetter(index) {
  let result = '';
  let column = index + 1;
  while (column > 0) {
    const modulo = (column - 1) % 26;
    result = String.fromCharCode(65 + modulo) + result;
    column = Math.floor((column - 1) / 26);
  }
  return result;
}

export function buildWorkbook(state, reportFilters) {
  const wb = XLSX.utils.book_new();

  const productsData = state.products.map((product) => ({
    ...product,
    active: product.active ? '✅' : '❌',
  }));
  const productsSheet = sheetFromData(productsData, [
    { key: 'product_id', label: '🧾 ID товара', width: 14 },
    { key: 'name', label: '🛒 Название', width: 32 },
    { key: 'active', label: '✅ Активен', width: 12 },
  ]);
  applySheetLayout(productsSheet, [
    { width: 14 },
    { width: 32 },
    { width: 12 },
  ]);
  const sizesSheet = sheetFromData(state.sizes, [
    { key: 'size_id', label: '📏 ID размера', width: 14 },
    { key: 'length_mm', label: '📐 Длина (мм)', width: 16 },
    { key: 'pack_qty', label: '📦 Кол-во в упаковке', width: 22 },
    { key: 'label', label: '🏷️ Label', width: 26 },
    { key: 'sort', label: '↕️ Сортировка', width: 14 },
  ]);
  applySheetLayout(sizesSheet, [
    { width: 14 },
    { width: 16 },
    { width: 22 },
    { width: 26 },
    { width: 14 },
  ]);
  const shipmentsSheet = sheetFromData(state.shipments, [
    { key: 'shipment_id', label: '🚚 ID отгрузки', width: 16 },
    { key: 'date', label: '📅 Дата', width: 14 },
    { key: 'product_id', label: '🧾 ID товара', width: 14 },
    { key: 'size_id', label: '📏 ID размера', width: 14 },
    { key: 'qty', label: '🔢 Количество', width: 14 },
    { key: 'comment', label: '💬 Комментарий', width: 30 },
  ]);
  applySheetLayout(shipmentsSheet, [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 30 },
  ]);

  const metaRows = Object.entries(state.meta || {}).map(([key, value]) => ({ key, value }));
  const metaSheet = sheetFromData(metaRows, [
    { key: 'key', label: '🔧 Ключ', width: 18 },
    { key: 'value', label: '📝 Значение', width: 32 },
  ]);
  applySheetLayout(metaSheet, [
    { width: 18 },
    { width: 32 },
  ]);

  const report = generateMonthlyPivot(state, reportFilters);
  const reportHeaders = [
    { key: 'product_name', label: '🛒 Товар', width: 28 },
    { key: 'size_label', label: '📏 Размер', width: 22 },
    ...report.monthKeys.map((month) => ({ key: month, label: `📆 ${month}`, width: 12 })),
    { key: 'total', label: '✅ Итого', width: 12 },
    { key: 'spark', label: '📈 График', width: 18 },
  ];
  const reportRows = report.rows.map((row) => ({
    product_name: row.product_name,
    size_label: row.size_label,
    ...row.totals,
    total: row.total,
    spark: '',
  }));
  const reportSheet = sheetFromData(reportRows, reportHeaders);
  applySheetLayout(reportSheet, reportHeaders);

  XLSX.utils.book_append_sheet(wb, productsSheet, 'Products');
  XLSX.utils.book_append_sheet(wb, sizesSheet, 'Sizes');
  XLSX.utils.book_append_sheet(wb, shipmentsSheet, 'Shipments');
  XLSX.utils.book_append_sheet(wb, reportSheet, 'Reports_MonthlyPivot');
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Meta');

  const monthStartIndex = 2;
  const monthEndIndex = monthStartIndex + report.monthKeys.length - 1;
  const sparkColumnIndex = reportHeaders.length - 1;
  if (report.monthKeys.length > 0) {
    report.rows.forEach((_, index) => {
      const rowIndex = index + 1;
      const sparkCell = XLSX.utils.encode_cell({ r: rowIndex, c: sparkColumnIndex });
      const startCell = `${columnLetter(monthStartIndex)}${rowIndex + 1}`;
      const endCell = `${columnLetter(monthEndIndex)}${rowIndex + 1}`;
      reportSheet[sparkCell] = {
        t: 'n',
        f: `SPARKLINE(${startCell}:${endCell},"charttype","column")`,
      };
    });
  }
  reportSheet['!ref'] = reportSheet['!ref'] || XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: reportRows.length, c: reportHeaders.length - 1 } });
  applyDataValidation(shipmentsSheet, [
    {
      type: 'list',
      allowBlank: 1,
      sqref: `C2:C1000`,
      formula1: '=Products!$A$2:$A$1000',
      showErrorMessage: true,
      showInputMessage: true,
      promptTitle: 'ID товара',
      prompt: 'Выберите ID товара из списка Products.',
    },
    {
      type: 'list',
      allowBlank: 1,
      sqref: `D2:D1000`,
      formula1: '=Sizes!$A$2:$A$1000',
      showErrorMessage: true,
      showInputMessage: true,
      promptTitle: 'ID размера',
      prompt: 'Выберите ID размера из списка Sizes.',
    },
  ]);

  return wb;
}

export function downloadWorkbook(workbook, filename = 'sales-excel-assistant.xlsx') {
  XLSX.writeFile(workbook, filename);
}

export function buildTemplateWorkbook() {
  const wb = XLSX.utils.book_new();
  const productsTemplate = sheetFromData([], [
    { key: 'product_id', label: '🧾 ID товара', width: 14 },
    { key: 'name', label: '🛒 Название', width: 32 },
    { key: 'active', label: '✅ Активен', width: 12 },
  ]);
  XLSX.utils.book_append_sheet(wb, productsTemplate, 'Products');
  const sizesTemplate = sheetFromData([], [
    { key: 'size_id', label: '📏 ID размера', width: 14 },
    { key: 'length_mm', label: '📐 Длина (мм)', width: 16 },
    { key: 'pack_qty', label: '📦 Кол-во в упаковке', width: 22 },
    { key: 'label', label: '🏷️ Label', width: 26 },
    { key: 'sort', label: '↕️ Сортировка', width: 14 },
  ]);
  XLSX.utils.book_append_sheet(wb, sizesTemplate, 'Sizes');
  const shipmentsTemplate = sheetFromData([], [
    { key: 'shipment_id', label: '🚚 ID отгрузки', width: 16 },
    { key: 'date', label: '📅 Дата', width: 14 },
    { key: 'product_id', label: '🧾 ID товара', width: 14 },
    { key: 'size_id', label: '📏 ID размера', width: 14 },
    { key: 'qty', label: '🔢 Количество', width: 14 },
    { key: 'comment', label: '💬 Комментарий', width: 30 },
  ]);
  XLSX.utils.book_append_sheet(wb, shipmentsTemplate, 'Shipments');
  const reportTemplate = sheetFromData([], [
    { key: 'product_name', label: '🛒 Товар', width: 28 },
    { key: 'size_label', label: '📏 Размер', width: 22 },
    { key: 'YYYY-MM', label: '📆 YYYY-MM', width: 12 },
    { key: 'total', label: '✅ Итого', width: 12 },
    { key: 'spark', label: '📈 График', width: 18 },
  ]);
  XLSX.utils.book_append_sheet(wb, reportTemplate, 'Reports_MonthlyPivot');
  const metaTemplate = sheetFromData([
    { key: 'format_version', value: '1' },
    { key: 'updated_at', value: new Date().toISOString() },
  ], [
    { key: 'key', label: '🔧 Ключ', width: 18 },
    { key: 'value', label: '📝 Значение', width: 32 },
  ]);
  XLSX.utils.book_append_sheet(wb, metaTemplate, 'Meta');
  applySheetLayout(wb.Sheets.Products, [
    { width: 14 },
    { width: 32 },
    { width: 12 },
  ]);
  applySheetLayout(wb.Sheets.Sizes, [
    { width: 14 },
    { width: 16 },
    { width: 22 },
    { width: 26 },
    { width: 14 },
  ]);
  applySheetLayout(wb.Sheets.Shipments, [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 30 },
  ]);
  applySheetLayout(wb.Sheets.Reports_MonthlyPivot, [
    { width: 28 },
    { width: 22 },
    { width: 12 },
    { width: 12 },
    { width: 18 },
  ]);
  applySheetLayout(wb.Sheets.Meta, [
    { width: 18 },
    { width: 32 },
  ]);
  applyDataValidation(wb.Sheets.Shipments, [
    {
      type: 'list',
      allowBlank: 1,
      sqref: `C2:C1000`,
      formula1: '=Products!$A$2:$A$1000',
      showErrorMessage: true,
      showInputMessage: true,
      promptTitle: 'ID товара',
      prompt: 'Выберите ID товара из списка Products.',
    },
    {
      type: 'list',
      allowBlank: 1,
      sqref: `D2:D1000`,
      formula1: '=Sizes!$A$2:$A$1000',
      showErrorMessage: true,
      showInputMessage: true,
      promptTitle: 'ID размера',
      prompt: 'Выберите ID размера из списка Sizes.',
    },
  ]);
  return wb;
}
