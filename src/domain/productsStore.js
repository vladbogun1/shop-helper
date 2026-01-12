import { nextProductId } from './ids.js';

export function addProduct(state, payload) {
  const product = {
    product_id: nextProductId(state.products),
    name: payload.name.trim(),
    active: payload.active ?? true,
  };
  return {
    ...state,
    products: [...state.products, product],
  };
}

export function updateProduct(state, productId, updates) {
  return {
    ...state,
    products: state.products.map((product) =>
      product.product_id === productId
        ? { ...product, ...updates }
        : product
    ),
  };
}

export function deleteProduct(state, productId) {
  return {
    ...state,
    products: state.products.filter((product) => product.product_id !== productId),
    shipments: state.shipments.filter((shipment) => shipment.product_id !== productId),
  };
}

export function findProduct(state, productId) {
  return state.products.find((product) => product.product_id === productId);
}
