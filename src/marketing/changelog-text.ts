/**
 * A character that the reader holds aside while it removes the marks, and
 * puts back after: an escaped character, the words of a code mark, or the
 * address of an autolink. The private-use characters never occur in a post.
 */
const heldText = /\uE000(\d+)\uE001/g

/** An escaped punctuation character, or a code mark with its backticks. */
const escapeOrCode = /\\([!-/:-@[-`{-~])|(?<!`)(`+)([\s\S]*?[^`])\2(?!`)/g

/** An address or an email address between angle brackets. */
const autolink =
  /<([A-Za-z][\w+.-]{1,31}:[^\s<>]*|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/g

/** A tag of HTML, which shows no words of its own. */
const htmlTag = /<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/g

/** A link or an image, inline or by reference. Only its words show. */
const linkOrImage = /!?\[([^\]]*)\](?:\([^)]*\)|\[[^\]]*\])/g

/**
 * The marks of bold, italic, and struck words. An underscore inside a word,
 * such as in `snake_case`, is not a mark.
 */
const marks: readonly (readonly [RegExp, string])[] = [
  [/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '$1'],
  [/(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, '$1$2'],
  [/\*(?=\S)([\s\S]*?\S)\*/g, '$1'],
  [/(^|[^\p{L}\p{N}_])_(?=\S)([\s\S]*?\S)_(?![\p{L}\p{N}_])/gu, '$1$2'],
  [/~~(?=\S)([\s\S]*?\S)~~/g, '$1'],
]

/**
 * The Markdown of a lead or a change as plain text, so that a link, a code
 * mark, or bold shows only its words. The lines join with one space.
 */
export function plainText(markdown: string): string {
  const held: string[] = []
  const hold = (words: string) => `\uE000${held.push(words) - 1}\uE001`
  const unmarked = marks.reduce(
    (words, [mark, replacement]) => words.replace(mark, replacement),
    markdown
      .replace(/\\(?=\r?\n)/g, '')
      .replace(
        escapeOrCode,
        (_match, escaped?: string, _ticks?, code?: string) =>
          hold(escaped ?? code ?? ''),
      )
      .replace(autolink, (_match, address: string) => hold(address))
      .replace(htmlTag, '')
      .replace(linkOrImage, '$1'),
  )
  return unmarked
    .replace(heldText, (_match, index: string) => held[Number(index)] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}
