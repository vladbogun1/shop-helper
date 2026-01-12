# Sales Excel Assistant

Статическое веб-приложение для работы с Excel-файлами продаж и отгрузок прямо в браузере. Поддерживает импорт/экспорт Excel через SheetJS, хранение данных в IndexedDB и экспорт обратно в нормализованный формат.

## Возможности
- Импорт Excel в новом формате (Products, Sizes, Shipments, Meta).
- Импорт старого формата через мастер (лист **"Товары на складе"**).
- CRUD для товаров и размеров, генератор размерной сетки.
- Ввод отгрузок и отчёты по месяцам (pivot).
- Экспорт Excel с обновлённым листом **Reports_MonthlyPivot**.
- Работает полностью офлайн, подходит для GitHub Pages.

## Структура проекта
```
index.html
styles/main.css
src/
  app.js
  storage.js
  excel/
    excelRead.js
    excelWrite.js
    importWizard.js
  domain/
    ids.js
    productsStore.js
    sizesStore.js
    shipmentsStore.js
    reports.js
  ui/
    components/
      modal.js
      pagination.js
      toast.js
    pages/
      importPage.js
      productsPage.js
      sizesPage.js
      shipmentsPage.js
      reportsPage.js
```

## Локальный запуск
```bash
npx serve
```
Или любой другой локальный HTTP-сервер (важно открывать через HTTP, а не file://).

## GitHub Pages
1. Откройте **Settings → Pages**.
2. Выберите **Deploy from branch**.
3. Укажите ветку (например, `main`) и папку `/root`.
4. Сохраните — GitHub Pages отдаст сайт как статический.

## Как пользоваться
1. **Import / Export** → Upload Excel (.xlsx) или Create new template.
2. Заполните товары, размеры и отгрузки через соответствующие разделы.
3. В отчётах настройте период и проверьте pivot.
4. Нажмите **Download Excel** или **Export reports to Excel**, чтобы скачать обновлённый файл.

## Формат Excel (нормализованный)
- **Products**: product_id, name, active
- **Sizes**: size_id, length_mm, pack_qty, label, sort
- **Shipments**: shipment_id, date, product_id, size_id, qty, comment
- **Reports_MonthlyPivot**: product_name, size_label, YYYY-MM..., total
- **Meta**: key, value

## Старый формат
Если найден лист **"Товары на складе"** со столбцами *"Название товара"*, *"Размер"* и месяцами — запускается мастер импорта с выбором стартового года.
