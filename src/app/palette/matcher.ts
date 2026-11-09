/**
 * The search of the command palette. A query is a list of words, and a row
 * matches when each word is inside one of its texts, in any order and in
 * any case. A row whose words all match at the start of a word ranks first.
 */

/** How well a row matches: at the start of words first, then inside them. */
export type MatchRank = 0 | 1

/** The words of a query, in lower case. Spaces alone make no word. */
export function searchWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '')
}

/** A letter or a digit, which continues a word. */
const wordCharacter = /[\p{L}\p{N}]/u

/** Whether `word` is in `text` where a word of `text` starts. */
function atWordStart(text: string, word: string): boolean {
  for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
    if (at === 0 || !wordCharacter.test(text.charAt(at - 1))) return true
  }
  return false
}

/**
 * The rank of a row for the words of a query, or `null` when a word is in
 * none of its texts. A row without words, from an empty query, ranks first.
 */
export function matchRank(
  words: readonly string[],
  texts: readonly string[],
): MatchRank | null {
  const lower = texts.map((text) => text.toLowerCase())
  let rank: MatchRank = 0
  for (const word of words) {
    if (lower.some((text) => atWordStart(text, word))) continue
    if (!lower.some((text) => text.includes(word))) return null
    rank = 1
  }
  return rank
}

/**
 * The rows that match the words, the first rank first. Rows of the same
 * rank keep the order that they come in.
 */
export function rankRows<T>(
  rows: readonly T[],
  words: readonly string[],
  textsOf: (row: T) => readonly string[],
): T[] {
  const ranked: { row: T; rank: MatchRank }[] = []
  for (const row of rows) {
    const rank = matchRank(words, textsOf(row))
    if (rank !== null) ranked.push({ row, rank })
  }
  return ranked
    .sort((left, right) => left.rank - right.rank)
    .map((item) => item.row)
}
