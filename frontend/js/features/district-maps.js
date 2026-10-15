/** Small preview maps of Macau's districts; clicking one moves the main map there. */
import { DISTRICT_MAP_ZOOM, TILE_LAYER } from '../config.js';
import { DISTRICT_GROUPS } from '../data/districts.js';
import { onLanguageChange, t } from '../i18n/index.js';
import { createElement } from '../utils/dom.js';

const PREVIEW_MAP_OPTIONS = Object.freeze({ zoomControl: false, attributionControl: false, scrollWheelZoom: false });
const LABEL_POPUP_OPTIONS = Object.freeze({ closeButton: false, autoClose: false, closeOnClick: false });

/** @param {{ onSelect: (district: { lat: number, lng: number }) => void }} options */
export function initDistrictMaps(container, { onSelect }) {
  const groups = DISTRICT_GROUPS.map((group) => ({
    group,
    previews: group.districts.map((district) => ({ district, element: createElement('div', { className: 'district-map' }) })),
  }));

  container.replaceChildren(
    ...groups.map(({ group, previews }) =>
      createElement('section', { className: 'district-group' }, [
        createElement('h3', { className: 'district-group__title', dataset: { i18n: `districts.groups.${group.id}` } }),
        createElement(
          'div',
          { className: 'district-group__maps' },
          previews.map(({ element }) => element),
        ),
      ]),
    ),
  );

  const labels = groups.flatMap(({ previews }) =>
    previews.map(({ district, element }) => createPreviewMap(element, district, onSelect)),
  );
  onLanguageChange(() => labels.forEach(({ marker, district }) => marker.setPopupContent(t(`places.${district.id}`))));
}

function createPreviewMap(element, district, onSelect) {
  const position = [district.lat, district.lng];
  const map = L.map(element, PREVIEW_MAP_OPTIONS).setView(position, DISTRICT_MAP_ZOOM);
  L.tileLayer(TILE_LAYER.url).addTo(map);

  // A non-interactive marker lets clicks fall through to the map.
  const marker = L.marker(position, { interactive: false })
    .addTo(map)
    .bindPopup(t(`places.${district.id}`), LABEL_POPUP_OPTIONS)
    .openPopup();

  map.on('click', () => onSelect(district));
  new ResizeObserver(() => map.invalidateSize()).observe(element);
  return { marker, district };
}
