const pad = (value, size) => String(value).padStart(size, '0');

function nextNumericId(items, prefix, digits, key) {
  const max = items
    .map((item) => item[key])
    .filter(Boolean)
    .map((id) => id.replace(prefix, ''))
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => !Number.isNaN(id))
    .reduce((acc, curr) => Math.max(acc, curr), 0);
  return `${prefix}${pad(max + 1, digits)}`;
}

export const nextProductId = (products) => nextNumericId(products, 'P-', 4, 'product_id');
export const nextSizeId = (sizes) => nextNumericId(sizes, 'S-', 4, 'size_id');
export const nextShipmentId = (shipments) => nextNumericId(shipments, 'SH-', 6, 'shipment_id');
