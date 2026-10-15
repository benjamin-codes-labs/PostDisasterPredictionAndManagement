import { TILE_LAYER } from '../config.js';
import { CATEGORIES, categoryLabel, categoryOf, typeLabel } from '../data/garbage-types.js';
import { formatDateTime, t } from '../i18n/index.js';
import { createElement } from '../utils/dom.js';
import { randomBetween } from '../utils/random.js';

const MARKER_SIZE = 40;
const HEATMAP_OPTIONS = Object.freeze({ radius: 25, blur: 18, maxZoom: 17 });

const markerIcons = new Map();

function markerIcon(categoryId) {
  if (!markerIcons.has(categoryId)) {
    markerIcons.set(
      categoryId,
      L.divIcon({
        html: CATEGORIES[categoryId].icon,
        className: 'garbage-marker',
        iconSize: [MARKER_SIZE, MARKER_SIZE],
        iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE],
        popupAnchor: [0, -MARKER_SIZE],
      }),
    );
  }
  return markerIcons.get(categoryId);
}

/** Popup content is rebuilt on every open, so it always uses the current language. */
function renderRecordPopup(record) {
  const rows = [
    ['map.popup.category', categoryLabel(categoryOf(record.type))],
    ['map.popup.type', typeLabel(record.type)],
    ['map.popup.count', record.count],
    ['map.popup.time', formatDateTime(record.timestamp) || '—'],
    ['map.popup.coordinates', `${record.lat.toFixed(4)}, ${record.lng.toFixed(4)}`],
  ];
  return createElement(
    'dl',
    { className: 'record-popup' },
    rows.flatMap(([labelKey, value]) => [createElement('dt', { text: t(labelKey) }), createElement('dd', { text: String(value) })]),
  );
}

/** Leaflet map of garbage reports with per-category visibility and an optional heatmap. */
export class GarbageMap {
  #map;
  #entries = [];
  #hiddenCategories = new Set();
  #heatLayer = null;

  constructor(element, { center, zoom }) {
    this.#map = L.map(element).setView([center.lat, center.lng], zoom);
    L.tileLayer(TILE_LAYER.url, { attribution: TILE_LAYER.attribution }).addTo(this.#map);
    new ResizeObserver(() => this.#map.invalidateSize()).observe(element);
  }

  /** @returns {import('../data/garbage-records.js').GarbageRecord[]} */
  get records() {
    return this.#entries.map(({ record }) => record);
  }

  get center() {
    return this.#map.getCenter();
  }

  /** @param {import('../data/garbage-records.js').GarbageRecord} record */
  add(record) {
    const marker = L.marker([record.lat, record.lng], { icon: markerIcon(categoryOf(record.type)) }).bindPopup(() =>
      renderRecordPopup(record),
    );
    this.#entries.push({ record, marker });
    if (this.#isVisible(record)) marker.addTo(this.#map);
    this.#refreshHeatmap();
  }

  setCategoryVisible(categoryId, visible) {
    if (visible) this.#hiddenCategories.delete(categoryId);
    else this.#hiddenCategories.add(categoryId);

    this.#entries.forEach(({ record, marker }) => {
      if (this.#isVisible(record)) marker.addTo(this.#map);
      else marker.remove();
    });
    this.#refreshHeatmap();
  }

  /** @returns {boolean} Whether the heatmap is shown after toggling. */
  toggleHeatmap() {
    if (this.#heatLayer) {
      this.#heatLayer.remove();
      this.#heatLayer = null;
      return false;
    }
    this.#heatLayer = L.heatLayer(this.#heatPoints(), HEATMAP_OPTIONS).addTo(this.#map);
    return true;
  }

  randomPointInView() {
    const bounds = this.#map.getBounds();
    return {
      lat: randomBetween(bounds.getSouth(), bounds.getNorth()),
      lng: randomBetween(bounds.getWest(), bounds.getEast()),
    };
  }

  flyTo({ lat, lng }) {
    this.#map.flyTo([lat, lng]);
  }

  /** @param {(latlng: L.LatLng) => void} handler */
  onClick(handler) {
    this.#map.on('click', (event) => handler(event.latlng));
  }

  openPopup(latlng, content) {
    L.popup().setLatLng(latlng).setContent(content).openOn(this.#map);
  }

  closePopup() {
    this.#map.closePopup();
  }

  #isVisible(record) {
    return !this.#hiddenCategories.has(categoryOf(record.type));
  }

  #heatPoints() {
    return this.records
      .filter((record) => this.#isVisible(record))
      .map((record) => [record.lat, record.lng, record.count * CATEGORIES[categoryOf(record.type)].heatWeight]);
  }

  #refreshHeatmap() {
    this.#heatLayer?.setLatLngs(this.#heatPoints());
  }
}
