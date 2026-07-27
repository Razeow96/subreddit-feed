'use strict';

// normalize — turn Reddit's Atom XML into flat, predictable post records.
//
// Record shape (every emitter consumes exactly this):
//   title            string
//   author           string        bare username, no "/u/" prefix
//   score            null          not exposed by Reddit's RSS feed
//   num_comments     null          not exposed by Reddit's RSS feed
//   created_utc      string        ISO 8601 UTC
//   permalink        string        reddit comments URL
//   external_url     string|null   link-post target; null for self posts
//   excerpt          string        first 200 chars of selftext, sanitized

const { XMLParser } = require('fast-xml-parser');

const EXCERPT_LEN = 200;

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" does not double-decode
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Reddit wraps selftext HTML between SC_OFF / SC_ON comment markers.
// Link posts have no such block — their excerpt is empty.
function extractExcerpt(contentHtml) {
  const m = contentHtml.match(/<!--\s*SC_OFF\s*-->([\s\S]*?)<!--\s*SC_ON\s*-->/);
  if (!m) return '';
  const text = stripTags(m[1]);
  return text.length > EXCERPT_LEN ? `${text.slice(0, EXCERPT_LEN).trimEnd()}…` : text;
}

// The feed's content block ends with: submitted by /u/x [link] [comments].
// For link posts the [link] href is the external target.
function extractExternalUrl(contentHtml, permalink) {
  const m = contentHtml.match(/<a\s+href="([^"]+)"\s*>\s*\[link\]\s*<\/a>/i);
  if (!m) return null;
  const href = decodeEntities(m[1]);
  return href === permalink ? null : href;
}

function toIsoUtc(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`feed entry has an unparseable date: ${JSON.stringify(value)}`);
  }
  return d.toISOString();
}

function asText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in node) return String(node['#text']);
  return '';
}

/**
 * @param {string} xml raw Atom XML from fetch-posts
 * @returns {object[]} normalized post records
 */
function normalize(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  let doc;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    throw new Error(`feed is not valid XML: ${err.message}`);
  }

  const feed = doc && doc.feed;
  if (!feed) {
    throw new Error('response is not an Atom feed — Reddit may have served an error page');
  }

  const entries = feed.entry
    ? Array.isArray(feed.entry)
      ? feed.entry
      : [feed.entry]
    : [];

  return entries.map((entry, i) => {
    const title = asText(entry.title);
    const permalink = entry.link && entry.link['@_href'] ? entry.link['@_href'] : '';
    if (!title || !permalink) {
      throw new Error(`feed entry ${i + 1} is missing title or link — refusing to emit partial data`);
    }

    const contentHtml = asText(entry.content);
    const author = asText(entry.author && entry.author.name).replace(/^\/u\//, '');

    return {
      title,
      author,
      score: null, // not available via RSS — see module header
      num_comments: null, // not available via RSS — see module header
      created_utc: toIsoUtc(entry.published || entry.updated),
      permalink,
      external_url: extractExternalUrl(contentHtml, permalink),
      excerpt: extractExcerpt(contentHtml),
    };
  });
}

module.exports = { normalize };
