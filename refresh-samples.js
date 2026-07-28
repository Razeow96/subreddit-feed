#!/usr/bin/env node
'use strict';

// refresh-samples — used by the daily GitHub Action.
// Makes ONE Reddit request and writes all three sample formats from it.
// Fetching the same listing three times (once per format) is what tripped
// Reddit's 429 rate-limit on shared runner IPs, so we fetch once here.

const fs = require('fs');
const { fetchPosts } = require('./src/fetch-posts');
const { normalize } = require('./src/normalize');
const { emitMd } = require('./src/emit-md');
const { emitCsv } = require('./src/emit-csv');
const { emitJson } = require('./src/emit-json');

const SUBREDDIT = 'automation';
const SORT = 'hot';
const LIMIT = 10;

async function main() {
  const meta = { subreddit: SUBREDDIT, sort: SORT };
  const xml = await fetchPosts(SUBREDDIT, SORT, LIMIT); // one request
  const posts = normalize(xml);

  if (posts.length === 0) {
    throw new Error(`r/${SUBREDDIT} returned no posts — refusing to write empty samples`);
  }

  fs.writeFileSync('samples/r-automation-hot.md', emitMd(posts, meta), 'utf8');
  fs.writeFileSync('samples/r-automation-hot.csv', emitCsv(posts), 'utf8');
  fs.writeFileSync('samples/r-automation-hot.json', emitJson(posts, meta), 'utf8');

  console.error(`refreshed 3 samples from r/${SUBREDDIT} — ${posts.length} posts, 1 request`);
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
