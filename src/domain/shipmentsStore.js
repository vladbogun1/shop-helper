import { nextShipmentId } from './ids.js';

export function addShipment(state, payload) {
  const shipment = {
    shipment_id: nextShipmentId(state.shipments),
    date: payload.date,
    product_id: payload.product_id,
    size_id: payload.size_id,
    qty: Number(payload.qty),
    comment: payload.comment?.trim() || '',
  };
  return {
    ...state,
    shipments: [...state.shipments, shipment],
  };
}

export function updateShipment(state, shipmentId, updates) {
  return {
    ...state,
    shipments: state.shipments.map((shipment) =>
      shipment.shipment_id === shipmentId
        ? { ...shipment, ...updates }
        : shipment
    ),
  };
}

export function deleteShipment(state, shipmentId) {
  return {
    ...state,
    shipments: state.shipments.filter((shipment) => shipment.shipment_id !== shipmentId),
  };
}

export function listRecentShipments(state, limit = 20) {
  return [...state.shipments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
