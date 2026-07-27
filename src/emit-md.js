'use strict';

// emit-md — render normalized posts as a GitHub-flavored Markdown table.

// Escape Markdown/HTML control characters so post text can never break the
// table, close a link early ("](evil)") or inject HTML tags rendered by GitHub.
function cell(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\r?\n/g, ' ')
    .trim();
}

// Feed-supplied URLs go into `](...)` positions: only allow http(s), and
// percent-encode the characters that could terminate or extend the link.
function safeUrl(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url
    .toString()
    .replace(/[()<> ]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * @param {object[]} posts  normalized records from normalize.js
 * @param {{subreddit: string, sort: string}} meta
 * @returns {string} Markdown document
 */
function emitMd(posts, meta) {
  const lines = [
    `# r/${meta.subreddit} — ${meta.sort} (${posts.length} posts)`,
    '',
    `Generated ${new Date().toISOString()} · Reddit's RSS feed does not expose vote or comment counts, so this table omits them.`,
    '',
    '| # | Title | Author | Posted (UTC) | Excerpt |',
    '| --- | --- | --- | --- | --- |',
  ];

  posts.forEach((p, i) => {
    const permalink = safeUrl(p.permalink);
    const externalUrl = p.external_url ? safeUrl(p.external_url) : null;
    const title = permalink ? `[${cell(p.title)}](${permalink})` : cell(p.title);
    const source = externalUrl ? ` ([source](${externalUrl}))` : '';
    lines.push(
      `| ${i + 1} | ${title}${source} | ${cell(p.author)} | ${p.created_utc} | ${cell(p.excerpt)} |`
    );
  });

  return `${lines.join('\n')}\n`;
}

module.exports = { emitMd };
