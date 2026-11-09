/** The address and visible words of each anchor. */
export function links(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/g)].map(
    ([, attributes, content]) => ({
      href: /href="([^"]*)"/.exec(attributes)?.[1] ?? '',
      text: content
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }),
  )
}

export function inlineStyles(html: string) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(
    ([, css]) => css.replace(/\r\n?/g, '\n'),
  )
}

export function decodeHtml(text: string) {
  const entities: Readonly<Record<string, string>> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  }
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => entities[entity])
}
