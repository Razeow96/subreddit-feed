'use strict';

// emit-csv — render normalized posts as RFC 4180 CSV.
// Fields containing commas, quotes or newlines are quoted; inner quotes doubled.

const COLUMNS = [
  'title',
  'author',
  'score',
  'num_comments',
  'created_utc',
  'permalink',
  'external_url',
  'excerpt',
];

function field(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {object[]} posts normalized records from normalize.js
 * @returns {string} CSV document with header row
 */
function emitCsv(posts) {
  const rows = [COLUMNS.join(',')];
  for (const p of posts) {
    rows.push(COLUMNS.map((c) => field(p[c])).join(','));
  }
  return `${rows.join('\r\n')}\r\n`;
}

module.exports = { emitCsv };
