#!/usr/bin/env node
'use strict';

// subreddit-feed — point it at any subreddit, get clean md/csv/json.
// Usage: node feed.js r/<subreddit> [--format md|csv|json] [--limit N] [--sort hot|new|top] [-o <file>]

const fs = require('fs');
const { fetchPosts } = require('./src/fetch-posts');
const { normalize } = require('./src/normalize');
const { emitMd } = require('./src/emit-md');
const { emitCsv } = require('./src/emit-csv');
const { emitJson } = require('./src/emit-json');

const USAGE = `usage: node feed.js r/<subreddit> [options]

options:
  --format md|csv|json   output format (default: md)
  --limit N              number of posts, 1-100 (default: 25)
  --sort hot|new|top     listing sort (default: hot)
  -o <file>              write to file instead of stdout

example: node feed.js r/automation --format csv --limit 10`;

function fail(message) {
  console.error(`error: ${message}`);
  console.error(USAGE);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { format: 'md', limit: 25, sort: 'hot', out: null, subreddit: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) fail(`${arg} needs a value`);
      return argv[++i];
    };

    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === '--format') {
      opts.format = next();
    } else if (arg === '--limit') {
      opts.limit = Number(next());
    } else if (arg === '--sort') {
      opts.sort = next();
    } else if (arg === '-o') {
      opts.out = next();
    } else if (arg.startsWith('-')) {
      fail(`unknown option: ${arg}`);
    } else if (opts.subreddit === null) {
      opts.subreddit = arg.replace(/^\/?(r\/)?/, '');
    } else {
      fail(`unexpected argument: ${arg}`);
    }
  }

  if (!opts.subreddit) fail('missing subreddit — e.g. r/automation');
  if (!/^[A-Za-z0-9_]{2,21}$/.test(opts.subreddit)) {
    fail(`"${opts.subreddit}" is not a valid subreddit name`);
  }
  if (!['md', 'csv', 'json'].includes(opts.format)) {
    fail(`--format must be md, csv or json (got "${opts.format}")`);
  }
  if (!['hot', 'new', 'top'].includes(opts.sort)) {
    fail(`--sort must be hot, new or top (got "${opts.sort}")`);
  }
  if (!Number.isInteger(opts.limit) || opts.limit < 1 || opts.limit > 100) {
    fail('--limit must be an integer between 1 and 100');
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const meta = { subreddit: opts.subreddit, sort: opts.sort };

  const xml = await fetchPosts(opts.subreddit, opts.sort, opts.limit);
  const posts = normalize(xml);

  if (posts.length === 0) {
    console.error(`warning: r/${opts.subreddit} returned no posts`);
  }

  const output =
    opts.format === 'md'
      ? emitMd(posts, meta)
      : opts.format === 'csv'
        ? emitCsv(posts)
        : emitJson(posts, meta);

  if (opts.out) {
    fs.writeFileSync(opts.out, output, 'utf8');
    console.error(`wrote ${posts.length} posts to ${opts.out}`);
  } else {
    process.stdout.write(output);
  }
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
