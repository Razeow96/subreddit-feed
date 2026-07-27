'use strict';

// fetch-posts — one polite HTTPS request to Reddit's public Atom feed.
//
// Why RSS and not the JSON endpoint: reddit.com/<sub>/<sort>.json returns
// HTTP 403 for unauthenticated clients on many networks. The .rss endpoint
// is served reliably without keys, so this tool uses it exclusively.
// Trade-off: the Atom feed does not carry vote or comment counts.

const https = require('https');

const USER_AGENT =
  'subreddit-feed/1.0 (read-only portfolio demo CLI; one request per run)';
const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 2;

function get(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/atom+xml, application/xml;q=0.9',
        },
      },
      (res) => {
        const { statusCode, headers } = res;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const next = new URL(headers.location, url).toString();
          resolve(get(next, redirectsLeft - 1));
          return;
        }

        if (statusCode === 404) {
          res.resume();
          reject(new Error(`subreddit not found (HTTP 404): ${url}`));
          return;
        }
        if (statusCode === 403) {
          res.resume();
          reject(
            new Error(
              `Reddit refused the request (HTTP 403) — the subreddit may be private, or this network is blocked: ${url}`
            )
          );
          return;
        }
        if (statusCode === 429) {
          res.resume();
          reject(
            new Error(
              'Reddit rate-limited this client (HTTP 429). Wait a minute and run again.'
            )
          );
          return;
        }
        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`unexpected HTTP ${statusCode} from ${url}`));
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`request timed out after ${TIMEOUT_MS / 1000}s`));
    });
    req.on('error', (err) => reject(new Error(`network error: ${err.message}`)));
  });
}

/**
 * Fetch the raw Atom XML for a subreddit listing.
 * @param {string} subreddit  bare name, e.g. "automation"
 * @param {string} sort       hot | new | top
 * @param {number} limit      1..100
 * @returns {Promise<string>} Atom XML
 */
function fetchPosts(subreddit, sort, limit) {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}.rss?limit=${limit}`;
  return get(url, MAX_REDIRECTS);
}

module.exports = { fetchPosts };
