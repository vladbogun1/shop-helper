import { nextProductId, nextSizeId, nextShipmentId } from '../domain/ids.js';

const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

export function parseLegacySheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) {
    return null;
  }
  const [header, ...body] = rows;
  const monthColumns = header.slice(2).map((value) => String(value).trim());

  return {
    header: header.map((cell) => String(cell).trim()),
    monthColumns,
    body,
  };
}

export function buildStateFromLegacy(legacyData, startYear) {
  const products = [];
  const sizes = [];
  const shipments = [];
  const productMap = new Map();
  const sizeMap = new Map();

  legacyData.body.forEach((row) => {
    const productName = String(row[0] || '').trim();
    const sizeLabel = String(row[1] || '').trim();
    if (!productName || !sizeLabel) {
      return;
    }

    let productId = productMap.get(productName);
    if (!productId) {
      productId = nextProductId(products);
      productMap.set(productName, productId);
      products.push({
        product_id: productId,
        name: productName,
        sku: '',
        active: true,
      });
    }

    const sizeKey = sizeLabel.toLowerCase();
    let sizeId = sizeMap.get(sizeKey);
    if (!sizeId) {
      sizeId = nextSizeId(sizes);
      sizeMap.set(sizeKey, sizeId);
      sizes.push({
        size_id: sizeId,
        length_mm: 0,
        pack_qty: 1,
        label: sizeLabel,
        sort: sizes.length + 1,
      });
    }

    legacyData.monthColumns.forEach((monthLabel, index) => {
      const rawQty = row[index + 2];
      const qty = Number(rawQty || 0);
      if (Number.isNaN(qty) || qty === 0) {
        return;
      }
      const monthIndex = MONTHS_RU.findIndex((month) => monthLabel.toLowerCase().includes(month));
      const resolvedMonth = monthIndex === -1 ? index : monthIndex;
      const date = `${startYear}-${String(resolvedMonth + 1).padStart(2, '0')}-01`;

      shipments.push({
        shipment_id: nextShipmentId(shipments),
        date,
        product_id: productId,
        size_id: sizeId,
        qty,
        comment: 'imported-monthly-total',
      });
    });
  });

  return {
    products,
    sizes,
    shipments,
    meta: {
      format_version: '1',
      updated_at: new Date().toISOString(),
    },
  };
}
