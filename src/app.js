import { loadState, saveState, getStorageLabel } from './storage.js';
import { showToast } from './ui/components/toast.js';
import { renderImportPage } from './ui/pages/importPage.js';
import { renderProductsPage } from './ui/pages/productsPage.js';
import { renderSizesPage } from './ui/pages/sizesPage.js';
import { renderShipmentsPage } from './ui/pages/shipmentsPage.js';
import { renderReportsPage } from './ui/pages/reportsPage.js';

const pageContainer = document.getElementById('pageContainer');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const headerActions = document.getElementById('headerActions');
const storageStatus = document.getElementById('storageStatus');

const routes = {
  import: renderImportPage,
  products: renderProductsPage,
  sizes: renderSizesPage,
  shipments: renderShipmentsPage,
  reports: renderReportsPage,
};

const uiState = {
  route: 'import',
  legacyImport: null,
};

let appState = null;

async function setState(nextState) {
  appState = await saveState(nextState);
  render();
}

function setLegacyImport(payload) {
  uiState.legacyImport = payload;
  render();
}

function clearLegacyImport() {
  uiState.legacyImport = null;
}

function setRoute(route) {
  uiState.route = route;
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.route === route);
  });
  render();
}

function render() {
  const renderPage = routes[uiState.route];
  if (!renderPage || !appState) {
    return;
  }
  const view = renderPage({
    state: appState,
    setState,
    uiState,
    setLegacyImport,
    clearLegacyImport,
    showToast,
  });
  pageTitle.textContent = view.title;
  pageSubtitle.textContent = view.subtitle;
  headerActions.innerHTML = '';
  if (view.actions) {
    view.actions.forEach((action) => headerActions.appendChild(action));
  }
  pageContainer.innerHTML = '';
  pageContainer.appendChild(view.content);
}

function bindNavigation() {
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => setRoute(button.dataset.route));
  });
}

async function bootstrap() {
  appState = await loadState();
  storageStatus.textContent = `Хранилище: ${getStorageLabel()}`;
  bindNavigation();
  render();
  showToast('Данные загружены', 'success');
}

bootstrap();
