import { SHELTERS } from '../data/shelters.js';
import { createElement } from '../utils/dom.js';

/** Render one card per parish. Labels carry data-i18n keys and are filled in by `applyTranslations`. */
export function renderShelters(container) {
  container.replaceChildren(...SHELTERS.map(renderShelterCard));
}

function renderShelterCard({ place, level1, level2 }) {
  return createElement('article', { className: 'card' }, [
    createElement('h3', { className: 'card__title', dataset: { i18n: `places.${place}` } }),
    createElement('details', { className: 'shelter' }, [
      createElement('summary', { dataset: { i18n: 'shelters.showDetails' } }),
      renderShelterLevel('shelters.level1', level1),
      renderShelterLevel('shelters.level2', level2),
    ]),
  ]);
}

function renderShelterLevel(labelKey, facilities) {
  return createElement('div', { className: 'shelter__level' }, [
    createElement('h4', { className: 'shelter__label', dataset: { i18n: labelKey } }),
    facilities.length > 0
      ? createElement(
          'ul',
          {},
          facilities.map((id) => createElement('li', { dataset: { i18n: `shelterFacilities.${id}` } })),
        )
      : createElement('p', { dataset: { i18n: 'shelters.none' } }),
  ]);
}
