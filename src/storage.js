const DB_NAME = 'sales-excel-assistant';
const DB_VERSION = 1;
const STORE = 'app-state';

const DEFAULT_STATE = {
  products: [],
  sizes: [],
  shipments: [],
  meta: {
    format_version: '1',
    updated_at: new Date().toISOString(),
  },
};

const hasIndexedDB = () => typeof indexedDB !== 'undefined';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function getFromIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const request = store.get('state');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function setToIndexedDB(value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.put(value, 'state');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

function getFromLocalStorage() {
  const raw = localStorage.getItem(DB_NAME);
  return raw ? JSON.parse(raw) : null;
}

function setToLocalStorage(value) {
  localStorage.setItem(DB_NAME, JSON.stringify(value));
}

export async function loadState() {
  if (hasIndexedDB()) {
    const data = await getFromIndexedDB();
    return data ? { ...DEFAULT_STATE, ...data } : DEFAULT_STATE;
  }
  const data = getFromLocalStorage();
  return data ? { ...DEFAULT_STATE, ...data } : DEFAULT_STATE;
}

export async function saveState(state) {
  const nextState = {
    ...state,
    meta: {
      ...state.meta,
      updated_at: new Date().toISOString(),
    },
  };
  if (hasIndexedDB()) {
    await setToIndexedDB(nextState);
  } else {
    setToLocalStorage(nextState);
  }
  return nextState;
}

export function getStorageLabel() {
  return hasIndexedDB() ? 'IndexedDB' : 'localStorage';
}

export function resetState() {
  if (hasIndexedDB()) {
    indexedDB.deleteDatabase(DB_NAME);
  }
  localStorage.removeItem(DB_NAME);
}
