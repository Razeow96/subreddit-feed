'use strict';

// emit-json — render normalized posts as pretty JSON with a small provenance envelope.

/**
 * @param {object[]} posts normalized records from normalize.js
 * @param {{subreddit: string, sort: string}} meta
 * @returns {string} pretty-printed JSON document
 */
function emitJson(posts, meta) {
  const doc = {
    subreddit: meta.subreddit,
    sort: meta.sort,
    fetched_at: new Date().toISOString(),
    count: posts.length,
    posts,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

module.exports = { emitJson };
