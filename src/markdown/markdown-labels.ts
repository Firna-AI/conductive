/** The first `]` of the label at `[`, or -1 when none ends its line. */
export type LabelEndReader = (at: number) => number

/**
 * Reads each label end once. Labels do not nest: every `[` reaches the
 * first `]` on its line. In code mode, backticks toggle code and only a
 * `]` outside it counts. Each `[` starts outside code independently.
 */
export function lineLabelEnds(
  text: string,
  mode: 'plain' | 'code',
): LabelEndReader {
  const ends = new Map<number, number>()
  let outside = -1
  let inside = -1
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const char = text[index]
    if (char === '\n') {
      outside = -1
      inside = -1
    } else if (char === '`' && mode === 'code') {
      // The suffix can start inside or outside code. A backtick swaps
      // which closing bracket each starting state reaches.
      const next = outside
      outside = inside
      inside = next
    } else if (char === ']') outside = index
    else if (char === '[') ends.set(index, outside)
  }
  return (at) => ends.get(at) ?? -1
}
