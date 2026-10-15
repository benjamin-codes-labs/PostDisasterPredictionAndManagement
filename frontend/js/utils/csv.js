/** Minimal RFC 4180 CSV reading and writing. */

const NEEDS_QUOTING = /[",\r\n]/;

function formatField(value) {
  const text = String(value ?? '');
  return NEEDS_QUOTING.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** @param {unknown[][]} rows */
export function toCsv(rows) {
  return `${rows.map((row) => row.map(formatField).join(',')).join('\r\n')}\r\n`;
}

/**
 * Parse CSV text into rows of string fields. Handles quoted fields, escaped
 * quotes, CRLF line endings and a leading byte-order mark; blank lines are dropped.
 *
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      endRow();
    } else {
      field += char;
    }
  }
  if (field || row.length) endRow();

  return rows.filter((fields) => fields.some((value) => value.trim() !== ''));
}
