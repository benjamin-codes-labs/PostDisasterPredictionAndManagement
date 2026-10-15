/**
 * Garbage taxonomy shared by the map, camera recognition and CSV import/export.
 *
 * Type ids match the class names emitted by the Roboflow Workflow "Disaster new v2 Logic"
 * (model `disaster-new/2`); Kitchen, Hazardous and Large exist for manual reports. Labels live in the i18n dictionaries under `garbageTypes.*` and
 * `categories.*`.
 */
import { t } from '../i18n/index.js';

export const CATEGORIES = Object.freeze({
  recyclable: { icon: '♻️', heatWeight: 1 },
  food: { icon: '🍌', heatWeight: 1 },
  hazardous: { icon: '⚠️', heatWeight: 3 },
  other: { icon: '🗑️', heatWeight: 1 },
  large: { icon: '🏗️', heatWeight: 2 },
});

/** Garbage type id -> category id. */
export const GARBAGE_TYPES = Object.freeze({
  Can: 'recyclable',
  Cardboard: 'recyclable',
  Carton: 'recyclable',
  'Drink container': 'recyclable',
  'Glass bottle': 'recyclable',
  'Food leftover': 'food',
  Cloth: 'other',
  'Food packaging': 'other',
  'Pile of Leaves': 'other',
  'Useless bag': 'other',
  'Fallen tree': 'large',
  Kitchen: 'food',
  Hazardous: 'hazardous',
  Large: 'large',
});

/** Simplified-Chinese labels written by CSV exports from earlier versions of the dashboard. */
const LEGACY_LABELS = Object.freeze({
  玻璃: 'Glass',
  金属: 'Metal',
  塑料: 'Plastic',
  垃圾: 'Trash',
  厨余垃圾: 'Kitchen',
  有害垃圾: 'Hazardous',
  大型垃圾: 'Large',
});

const isKnownType = (typeId) => Object.hasOwn(GARBAGE_TYPES, typeId);

/** Types the model does not know about (e.g. from a different set of weights) are grouped under "other". */
export const categoryOf = (typeId) => (isKnownType(typeId) ? GARBAGE_TYPES[typeId] : 'other');

export const categoryLabel = (categoryId) => t(`categories.${categoryId}`);

export const typeLabel = (typeId) => (isKnownType(typeId) ? t(`garbageTypes.${typeId}`) : typeId);

/** Normalise a type read from external data (CSV, API) to a type id, or `null` if it is empty. */
export function resolveTypeId(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const knownId = Object.keys(GARBAGE_TYPES).find((typeId) => typeId.toLowerCase() === text.toLowerCase());
  return knownId ?? LEGACY_LABELS[text] ?? text;
}
