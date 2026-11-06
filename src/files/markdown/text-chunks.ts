/**
 * The longest part, in UTF-16 code units, of a run of text without a space
 * that one DOM text node gets. A rendering detail, not a read or
 * acceptance limit: Chrome lays out a long run that wraps anywhere in
 * quadratic time in one text node, and in linear time in adjacent shorter
 * nodes, with the same lines.
 */
const partLength = 256

const graphemes =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

function isSpace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\t'
}

/** The first grapheme boundary at or after `index`. */
function boundaryFrom(segments: Intl.Segments, index: number, end: number) {
  if (index >= end) return end
  const segment = segments.containing(index)
  if (!segment || segment.index === index) return index
  return segment.index + segment.segment.length
}

/**
 * The last grapheme boundary within one part after `from`, or the end of
 * a grapheme that is longer than a part.
 */
function nextCut(segments: Intl.Segments, from: number): number {
  const segment = segments.containing(from + partLength)
  if (!segment) return from + partLength
  if (segment.index > from) return segment.index
  return segment.index + segment.segment.length
}

/** Where parts start: at the edges of each run longer than a part, and inside it. */
function cuts(text: string, segments: Intl.Segments): number[] {
  const positions: number[] = []
  let runStart = 0
  for (let index = 0; index <= text.length; index += 1) {
    if (index < text.length && !isSpace(text[index])) continue
    if (index - runStart > partLength) {
      let cut = boundaryFrom(segments, runStart, text.length)
      positions.push(cut)
      while (index - cut > partLength) {
        cut = nextCut(segments, cut)
        positions.push(cut)
      }
      positions.push(boundaryFrom(segments, index, text.length))
    }
    runStart = index + 1
  }
  return positions
}

/**
 * Splits text for adjacent DOM text nodes. Text with spaces stays whole,
 * so its glyphs keep their places. Each run longer than a part without a
 * space becomes parts that end between whole graphemes: no part ends inside
 * a surrogate pair, a combining sequence, or a joined emoji, and a grapheme
 * longer than a part stays whole. Without `Intl.Segmenter`, text stays whole.
 */
export function textChunks(text: string): string[] {
  if (text.length <= partLength || !graphemes) return [text]
  const parts: string[] = []
  let start = 0
  for (const cut of cuts(text, graphemes.segment(text))) {
    if (cut <= start || cut >= text.length) continue
    parts.push(text.slice(start, cut))
    start = cut
  }
  parts.push(text.slice(start))
  return parts
}
