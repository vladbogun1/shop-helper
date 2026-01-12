import { nextSizeId } from './ids.js';

export function addSize(state, payload) {
  const size = {
    size_id: nextSizeId(state.sizes),
    length_mm: Number(payload.length_mm),
    pack_qty: Number(payload.pack_qty ?? 1),
    label: payload.label.trim(),
    sort: Number(payload.sort ?? payload.length_mm),
  };
  return {
    ...state,
    sizes: [...state.sizes, size],
  };
}

export function updateSize(state, sizeId, updates) {
  return {
    ...state,
    sizes: state.sizes.map((size) =>
      size.size_id === sizeId
        ? { ...size, ...updates }
        : size
    ),
  };
}

export function deleteSize(state, sizeId) {
  return {
    ...state,
    sizes: state.sizes.filter((size) => size.size_id !== sizeId),
    shipments: state.shipments.filter((shipment) => shipment.size_id !== sizeId),
  };
}

export function listSizes(state) {
  return state.sizes.sort((a, b) => a.sort - b.sort);
}
