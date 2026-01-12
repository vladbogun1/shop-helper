import { monthKey, rangeMonths } from '../ui/utils.js';

export function generateMonthlyPivot(state, filters) {
  const { from, to } = filters;
  const monthKeys = rangeMonths(from, to);

  const productMap = new Map(state.products.map((p) => [p.product_id, p]));
  const sizeMap = new Map(state.sizes.map((s) => [s.size_id, s]));

  const rowsMap = new Map();

  state.shipments.forEach((shipment) => {
    if (shipment.date < from || shipment.date > to) {
      return;
    }
    const product = productMap.get(shipment.product_id);
    const size = sizeMap.get(shipment.size_id);
    if (!product || !size) {
      return;
    }
    const key = `${product.name}__${size.label}`;
    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        product_name: product.name,
        size_label: size.label,
        totals: monthKeys.reduce((acc, month) => {
          acc[month] = 0;
          return acc;
        }, {}),
      });
    }
    const row = rowsMap.get(key);
    const month = monthKey(shipment.date);
    if (row.totals[month] !== undefined) {
      row.totals[month] += Number(shipment.qty);
    }
  });

  const rows = Array.from(rowsMap.values())
    .map((row) => {
      const total = Object.values(row.totals).reduce((acc, val) => acc + val, 0);
      return {
        ...row,
        total,
      };
    })
    .sort((a, b) => a.product_name.localeCompare(b.product_name));

  return { monthKeys, rows };
}

export function aggregateMonthlyTotals(state, filters) {
  const { from, to } = filters;
  const monthKeys = rangeMonths(from, to);
  const totals = monthKeys.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});

  state.shipments.forEach((shipment) => {
    if (shipment.date < from || shipment.date > to) {
      return;
    }
    const month = monthKey(shipment.date);
    if (totals[month] !== undefined) {
      totals[month] += Number(shipment.qty);
    }
  });

  return { monthKeys, totals };
}
