/**
 * @typedef {object} GarbageRecord
 * @property {string} id
 * @property {string} type       Garbage type id, see `GARBAGE_TYPES`.
 * @property {number} lat
 * @property {number} lng
 * @property {number} count
 * @property {string} timestamp  ISO 8601 date-time.
 */
import { parseCsv, toCsv } from '../utils/csv.js';
import { createId } from '../utils/random.js';
import { resolveTypeId } from './garbage-types.js';

/** Same column order as the CSV written by `backend/garbage_detection/records.py`. */
export const CSV_COLUMNS = Object.freeze(['id', 'type', 'latitude', 'longitude', 'count', 'timestamp']);

/** @returns {GarbageRecord} */
export function createRecord({ type, lat, lng, count = 1, id = createId(), timestamp = new Date().toISOString() }) {
  return { id, type, lat, lng, count, timestamp };
}

/** @param {GarbageRecord[]} records */
export function recordsToCsv(records) {
  return toCsv([CSV_COLUMNS, ...records.map(({ id, type, lat, lng, count, timestamp }) => [id, type, lat, lng, count, timestamp])]);
}

/**
 * Parse records from CSV. Columns are read by position, so both the live-camera
 * log and older dashboard exports (with Chinese headers) can be imported.
 *
 * @returns {{ records: GarbageRecord[], skipped: number }}
 */
export function recordsFromCsv(text) {
  const [, ...rows] = parseCsv(text);
  const records = rows.map(parseRow).filter(Boolean);
  return { records, skipped: rows.length - records.length };
}

function parseRow([id, type, latitude, longitude, count, timestamp]) {
  const typeId = resolveTypeId(type);
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  if (!typeId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const parsedCount = Number.parseInt(count, 10);
  return createRecord({
    id: id?.trim() || undefined,
    type: typeId,
    lat,
    lng,
    count: parsedCount > 0 ? parsedCount : 1,
    timestamp: timestamp?.trim() ?? '',
  });
}
