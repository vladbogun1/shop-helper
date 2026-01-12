export function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function detectFormat(workbook) {
  const normalizedSheets = ['Products', 'Sizes', 'Shipments'];
  const hasNormalized = normalizedSheets.every((name) => workbook.SheetNames.includes(name));
  const hasLegacy = workbook.SheetNames.includes('Товары на складе');

  if (hasNormalized) {
    return 'normalized';
  }
  if (hasLegacy) {
    return 'legacy';
  }
  return 'unknown';
}

export function readNormalizedData(workbook) {
  const readSheet = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
  const products = readSheet('Products');
  const sizes = readSheet('Sizes');
  const shipments = readSheet('Shipments');
  const meta = readSheet('Meta');

  const pick = (item, keys) => {
    for (const key of keys) {
      if (item[key] !== undefined) {
        return item[key];
      }
    }
    return '';
  };

  return {
    products: products.map((item) => ({
      product_id: String(pick(item, ['product_id', 'ID товара', 'ID продукта']) || ''),
      name: String(pick(item, ['name', 'Название']) || ''),
      active: String(pick(item, ['active', 'Активен']) || 'TRUE').toUpperCase() === 'TRUE',
    })),
    sizes: sizes.map((item) => ({
      size_id: String(pick(item, ['size_id', 'ID размера']) || ''),
      length_mm: Number(pick(item, ['length_mm', 'Длина (мм)']) || 0),
      pack_qty: Number(pick(item, ['pack_qty', 'Кол-во в упаковке']) || 1),
      label: String(pick(item, ['label', 'Label', 'Название размера']) || ''),
      sort: Number(pick(item, ['sort', 'Сортировка']) || pick(item, ['length_mm', 'Длина (мм)']) || 0),
    })),
    shipments: shipments.map((item) => ({
      shipment_id: String(pick(item, ['shipment_id', 'ID отгрузки']) || ''),
      date: String(pick(item, ['date', 'Дата']) || ''),
      product_id: String(pick(item, ['product_id', 'ID товара', 'ID продукта']) || ''),
      size_id: String(pick(item, ['size_id', 'ID размера']) || ''),
      qty: Number(pick(item, ['qty', 'Количество']) || 0),
      comment: String(pick(item, ['comment', 'Комментарий']) || ''),
    })),
    meta: meta.reduce((acc, item) => {
      if (item.key) {
        acc[item.key] = String(item.value || '');
      }
      return acc;
    }, {}),
  };
}
