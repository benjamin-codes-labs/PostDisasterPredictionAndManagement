/** Toolbar, filters and data import/export around the garbage map. */
import { createRecord, recordsFromCsv, recordsToCsv } from '../data/garbage-records.js';
import { CATEGORIES, GARBAGE_TYPES, typeLabel } from '../data/garbage-types.js';
import { setTranslatedText, t } from '../i18n/index.js';
import { createElement, downloadFile } from '../utils/dom.js';
import { randomInt, randomItem } from '../utils/random.js';

const MAX_RANDOM_COUNT = 5;

/** @param {import('./garbage-map.js').GarbageMap} garbageMap */
export function initMapControls(garbageMap) {
  const status = document.getElementById('map-status');
  const showStatus = (key, params) => setTranslatedText(status, key, params);

  renderCategoryFilters(document.getElementById('category-filters'), garbageMap);
  bindHeatmapToggle(document.getElementById('heatmap-toggle'), garbageMap);
  bindRandomReport(document.getElementById('report-random'), garbageMap);
  bindManualReport(garbageMap);
  bindCsvImport(document.getElementById('csv-import'), document.getElementById('csv-import-input'), garbageMap, showStatus);
  bindCsvExport(document.getElementById('csv-export'), garbageMap, showStatus);
}

function renderCategoryFilters(container, garbageMap) {
  Object.entries(CATEGORIES).forEach(([categoryId, { icon }]) => {
    const checkbox = createElement('input', { attributes: { type: 'checkbox', value: categoryId } });
    checkbox.checked = true;
    checkbox.addEventListener('change', () => garbageMap.setCategoryVisible(categoryId, checkbox.checked));

    container.append(
      createElement('label', { className: 'category-filter' }, [
        checkbox,
        createElement('span', { className: 'category-filter__icon', text: icon, attributes: { 'aria-hidden': 'true' } }),
        createElement('span', { dataset: { i18n: `categories.${categoryId}` } }),
      ]),
    );
  });
}

function bindHeatmapToggle(button, garbageMap) {
  button.addEventListener('click', () => {
    const visible = garbageMap.toggleHeatmap();
    setTranslatedText(button, visible ? 'map.hideHeatmap' : 'map.showHeatmap');
    button.setAttribute('aria-pressed', String(visible));
  });
}

function bindRandomReport(button, garbageMap) {
  button.addEventListener('click', () => {
    garbageMap.add(
      createRecord({
        ...garbageMap.randomPointInView(),
        type: randomItem(Object.keys(GARBAGE_TYPES)),
        count: randomInt(1, MAX_RANDOM_COUNT),
      }),
    );
  });
}

/** Clicking the map opens a small form for reporting garbage at that spot. */
function bindManualReport(garbageMap) {
  garbageMap.onClick((latlng) => {
    const form = createReportForm(({ type, count }) => {
      garbageMap.add(createRecord({ type, count, lat: latlng.lat, lng: latlng.lng }));
      garbageMap.closePopup();
    });
    garbageMap.openPopup(latlng, form);
  });
}

function createReportForm(onSubmit) {
  const typeSelect = createElement(
    'select',
    { attributes: { name: 'type' } },
    Object.keys(GARBAGE_TYPES).map((typeId) => createElement('option', { text: typeLabel(typeId), attributes: { value: typeId } })),
  );
  const countInput = createElement('input', { attributes: { type: 'number', name: 'count', min: '1', value: '1', required: '' } });

  const form = createElement('form', { className: 'report-form' }, [
    createElement('label', {}, [createElement('span', { text: t('map.report.type') }), typeSelect]),
    createElement('label', {}, [createElement('span', { text: t('map.report.count') }), countInput]),
    createElement('button', { className: 'button button--small', text: t('map.report.submit'), attributes: { type: 'submit' } }),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSubmit({ type: typeSelect.value, count: Math.max(1, Number.parseInt(countInput.value, 10) || 1) });
  });
  return form;
}

function bindCsvImport(button, fileInput, garbageMap, showStatus) {
  button.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    if (!file) return;

    try {
      const { records, skipped } = recordsFromCsv(await file.text());
      records.forEach((record) => garbageMap.add(record));
      showStatus(skipped ? 'map.importedWithSkipped' : 'map.imported', { imported: records.length, skipped });
    } catch (error) {
      showStatus('map.importFailed', { message: error.message });
    } finally {
      fileInput.value = '';
    }
  });
}

function bindCsvExport(button, garbageMap, showStatus) {
  button.addEventListener('click', () => {
    const { records } = garbageMap;
    if (records.length === 0) {
      showStatus('map.exportEmpty');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(recordsToCsv(records), `garbage-records-${date}.csv`, 'text/csv;charset=utf-8');
  });
}
