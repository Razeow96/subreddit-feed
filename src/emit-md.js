'use strict';

// emit-md — render normalized posts as a GitHub-flavored Markdown table.

function cell(text) {
  return String(text)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
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
    const title = `[${cell(p.title)}](${p.permalink})`;
    const source = p.external_url ? ` ([source](${p.external_url}))` : '';
    lines.push(
      `| ${i + 1} | ${title}${source} | ${cell(p.author)} | ${p.created_utc} | ${cell(p.excerpt)} |`
    );
  });

  return `${lines.join('\n')}\n`;
}

module.exports = { emitMd };
