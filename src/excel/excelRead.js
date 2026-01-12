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

  return {
    products: products.map((item) => ({
      product_id: String(item.product_id || ''),
      name: String(item.name || ''),
      sku: String(item.sku || ''),
      active: String(item.active || 'TRUE').toUpperCase() === 'TRUE',
    })),
    sizes: sizes.map((item) => ({
      size_id: String(item.size_id || ''),
      product_id: String(item.product_id || ''),
      length_mm: Number(item.length_mm || 0),
      pack_qty: Number(item.pack_qty || 1),
      label: String(item.label || ''),
      sort: Number(item.sort || item.length_mm || 0),
    })),
    shipments: shipments.map((item) => ({
      shipment_id: String(item.shipment_id || ''),
      date: String(item.date || ''),
      product_id: String(item.product_id || ''),
      size_id: String(item.size_id || ''),
      qty: Number(item.qty || 0),
      comment: String(item.comment || ''),
    })),
    meta: meta.reduce((acc, item) => {
      if (item.key) {
        acc[item.key] = String(item.value || '');
      }
      return acc;
    }, {}),
  };
}
