/** Lets the user compose a hypothetical disaster scenario from Macau's warning signals. */
import { applyTranslations } from '../i18n/index.js';
import { createElement } from '../utils/dom.js';
import { randomItem } from '../utils/random.js';

const NONE = 'none';

/** Option ids double as i18n keys under `simulation.fields.<field>.options.*`. */
const FIELDS = Object.freeze([
  {
    id: 'typhoon',
    icon: '🌪️',
    options: ['signal1', 'signal3', 'signal8SE', 'signal8SW', 'signal8NE', 'signal8NW', 'signal9', 'signal10'],
  },
  { id: 'wind', icon: '🏳️', options: ['southeast', 'southwest', 'northeast', 'northwest'] },
  { id: 'stormSurge', icon: '🌊', options: ['blue', 'yellow', 'orange', 'red', 'black'] },
  { id: 'rainstorm', icon: '🌧️', options: ['yellow', 'red', 'black'] },
]);

export function initDisasterSimulation() {
  const form = document.getElementById('simulation-form');
  const summary = document.getElementById('simulation-summary');
  const selects = new Map(FIELDS.map((field) => [field.id, createSelect(field)]));

  document.getElementById('simulation-fields').replaceChildren(
    ...FIELDS.map((field) =>
      createElement('label', { className: 'simulation__field' }, [
        createElement('span', { className: 'simulation__label' }, [
          `${field.icon} `,
          createElement('span', { dataset: { i18n: `simulation.fields.${field.id}.label` } }),
        ]),
        selects.get(field.id),
      ]),
    ),
  );

  const renderSummary = () => {
    const active = FIELDS.filter((field) => selects.get(field.id).value !== NONE);
    summary.replaceChildren(
      ...(active.length === 0
        ? [createElement('span', { dataset: { i18n: 'simulation.inactive' } })]
        : active.map((field) =>
            createElement('span', { className: 'chip' }, [
              `${field.icon} `,
              createElement('span', {
                dataset: { i18n: `simulation.fields.${field.id}.options.${selects.get(field.id).value}` },
              }),
            ]),
          )),
    );
    applyTranslations(summary);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderSummary();
  });

  document.getElementById('simulation-random').addEventListener('click', () => {
    FIELDS.forEach((field) => {
      selects.get(field.id).value = randomItem([NONE, ...field.options]);
    });
    renderSummary();
  });
}

function createSelect(field) {
  return createElement('select', { attributes: { name: field.id } }, [
    createElement('option', { attributes: { value: NONE }, dataset: { i18n: 'simulation.none' } }),
    ...field.options.map((option) =>
      createElement('option', {
        attributes: { value: option },
        dataset: { i18n: `simulation.fields.${field.id}.options.${option}` },
      }),
    ),
  ]);
}
