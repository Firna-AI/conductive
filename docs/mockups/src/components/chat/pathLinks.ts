import { lineLabelEnds } from '../../../../../src/markdown/markdown-labels'

/** A Markdown link or image: its start, source, label, and target. */
type PathLink = { index: number; source: string; label: string; target: string }

/**
 * The target of a Markdown link or image after its `](`, through its `)`:
 * a target in angle brackets, or one with no space, parenthesis, or angle
 * bracket.
 */
const pathTarget = /(?:<([^<>\n]+)>|([^\s()<>]+))\)/y

/**
 * The Markdown links and images of a text, in order, as a global search
 * for `[label](target)` with an optional `!` before it finds them. A label
 * ends at the first `]` of its line. One pass reads that end for each `[`,
 * and each end reads its target once. A link hides each `[` inside it.
 * After a `[` that starts no link, the next `[` tries.
 */
export function* pathLinks(text: string): Generator<PathLink> {
  const labelEndAt = lineLabelEnds(text, 'plain')
  const targets = new Map<number, RegExpExecArray | null>()
  const targetAt = (end: number) => {
    let target = targets.get(end)
    if (target === undefined) {
      pathTarget.lastIndex = end + 2
      target = pathTarget.exec(text)
      targets.set(end, target)
    }
    return target
  }
  let at = text.indexOf('[')
  while (at >= 0) {
    const end = labelEndAt(at)
    const target = end >= 0 && text[end + 1] === '(' ? targetAt(end) : null
    if (!target) {
      at = text.indexOf('[', at + 1)
      continue
    }
    // A link ends with `)`, so a `!` before a `[` is in no earlier link.
    const index = text[at - 1] === '!' ? at - 1 : at
    const next = end + 2 + target[0].length
    yield {
      index,
      source: text.slice(index, next),
      label: text.slice(at + 1, end),
      target: target[1] ?? target[2] ?? '',
    }
    at = text.indexOf('[', next)
  }
}
