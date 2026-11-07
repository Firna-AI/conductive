import {
  delimiterRun,
  pairRuns,
  type DelimiterRun,
  type Edges,
} from './markdown-delimiters'
import { nestParts, type InlinePart } from './markdown-nesting'
import {
  bracketPairs,
  codeSpans,
  runLength,
  type BracketPairs,
  type CodeSpan,
} from './markdown-spans'
import { linkTarget } from './markdown-targets'
import { decodeEntities, safeHref } from './markdown-text'

/** Inline content of a block. A link holds a checked, safe address. */
export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'emphasis' | 'strike'; children: MdInline[] }
  | { kind: 'link'; href: string; children: MdInline[] }
  | { kind: 'break' }

type Definitions = ReadonlyMap<string, string>

const punctuation = /[!-/:-@[-`{-~]/
const urlLink = /<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]{1,2000})>/y
const emailLink = /<([^\s<>@]{1,256}@[^\s<>@]{1,256})>/y

/** The start and the end of a block count as whitespace next to a run. */
const blockEdges: Edges = { before: '', after: '' }
/** The text of a link or an image stands between its brackets. */
const labelEdges: Edges = { before: '[', after: ']' }
/** The text of a strikethrough stands between its tildes. */
const strikeEdges: Edges = { before: '~', after: '~' }

/** The plain text of inline content, as for the alt text of an image. */
export function plainText(nodes: readonly MdInline[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'text' || node.kind === 'code') return node.text
      if (node.kind === 'break') return ' '
      return plainText(node.children)
    })
    .join('')
}

/** Where a text stands: inside how many containers, and between what. */
interface Place {
  depth: number
  /** The text of a link or an image, which holds no link. */
  inLink: boolean
  edges: Edges
}

/**
 * The scan of one inline text into parts, in text order. Code spans,
 * escapes, autolinks, links, and strikethrough group their text first.
 * Then the runs of `*` and `_` pair, and the parts nest into the tree.
 */
class InlineScanner {
  readonly text: string
  readonly definitions: Definitions
  readonly brackets: BracketPairs
  private readonly place: Place
  private readonly spans: Map<number, CodeSpan>
  /** For each size of tilde closer, a start from which no closer follows. */
  private readonly closerless = new Map<number, number>()
  private readonly parts: InlinePart[] = []
  private readonly runs: DelimiterRun[] = []
  private buffer = ''
  /**
   * The spaces after the buffer. A line end drops them, or makes two or
   * more of them a hard break, without a read of the whole buffer.
   */
  private spaces = 0

  constructor(text: string, definitions: Definitions, place: Place) {
    this.text = text
    this.definitions = definitions
    this.place = place
    this.spans = codeSpans(text)
    this.brackets = bracketPairs(text, this.spans)
  }

  run(): MdInline[] {
    for (let index = 0; index < this.text.length;) index = this.step(index)
    this.flush()
    pairRuns(this.runs)
    return nestParts(this.parts, this.place.depth)
  }

  /**
   * The content of a group as a text of its own, `depth` containers deep.
   * The tree builds a group only below the depth limit, so these scans
   * nest no deeper than the limit.
   */
  private nested(text: string, place: Place): MdInline[] {
    return new InlineScanner(text, this.definitions, place).run()
  }

  /** Adds text after the waiting spaces. */
  private add(text: string): void {
    if (text === '') return
    if (this.spaces > 0) this.buffer += ' '.repeat(this.spaces)
    this.spaces = 0
    this.buffer += text
  }

  private flush(): void {
    if (this.spaces > 0) this.buffer += ' '.repeat(this.spaces)
    this.spaces = 0
    if (this.buffer === '') return
    this.parts.push({ kind: 'text', text: decodeEntities(this.buffer) })
    this.buffer = ''
  }

  private push(part: InlinePart): void {
    this.flush()
    this.parts.push(part)
  }

  private step(index: number): number {
    const { text } = this
    const span = this.spans.get(index)
    if (span) {
      this.push({ kind: 'node', node: { kind: 'code', text: span.code } })
      return span.end
    }
    const char = text[index]
    if (char === '\\') return this.escape(index)
    if (char === '\n') {
      const hard = this.spaces >= 2
      this.spaces = 0
      if (hard) this.push({ kind: 'node', node: { kind: 'break' } })
      else this.add('\n')
      return index + 1
    }
    if (char === ' ') {
      this.spaces += 1
      return index + 1
    }
    if (char === '*' || char === '_') return this.delimiters(index, char)
    let end = -1
    if (char === '<') end = this.autolink(index)
    else if (char === '[' || (char === '!' && text[index + 1] === '[')) {
      end = this.link(index)
    } else if (char === '~') end = this.strike(index)
    if (end > index) return end
    const run = char === '~' ? runLength(text, index, char) : 1
    this.add(text.slice(index, index + run))
    return index + run
  }

  /** A backslash keeps the punctuation after it as text, or ends a line. */
  private escape(index: number): number {
    const next = this.text[index + 1] ?? ''
    if (next === '\n') this.push({ kind: 'node', node: { kind: 'break' } })
    else if (punctuation.test(next)) this.push({ kind: 'text', text: next })
    else {
      this.add('\\')
      return index + 1
    }
    return index + 2
  }

  /** A run of `*` or `_`: a part that pairs after the scan, or text. */
  private delimiters(index: number, char: string): number {
    const end = index + runLength(this.text, index, char)
    const run = delimiterRun(this.text, index, end, this.place.edges)
    if (run === null) this.add(this.text.slice(index, end))
    else {
      this.push({ kind: 'run', run })
      this.runs.push(run)
    }
    return end
  }

  private autolink(index: number): number {
    for (const pattern of [urlLink, emailLink]) {
      pattern.lastIndex = index
      const match = pattern.exec(this.text)
      if (!match) continue
      const address = pattern === emailLink ? `mailto:${match[1]}` : match[1]
      const href = this.place.inLink ? null : safeHref(address)
      const label = { kind: 'text', text: match[1] } as const
      if (href === null) this.push(label)
      else {
        const link: MdInline = { kind: 'link', href, children: [label] }
        this.push({ kind: 'group', source: match[0], nodes: () => [link] })
      }
      return index + match[0].length
    }
    return -1
  }

  /** A link, or an image, which shows its alt text. */
  private link(index: number): number {
    const image = this.text[index] === '!'
    const open = image ? index + 1 : index
    const close = this.brackets.close.get(open)
    if (close === undefined) return -1
    const target = linkTarget(this, open, close)
    if (!target) return -1
    const label = this.text.slice(open + 1, close)
    const href =
      image || this.place.inLink ? null : safeHref(target.destination)
    this.push({
      kind: 'group',
      source: this.text.slice(index, target.end),
      nodes: (depth) => {
        const place = { depth: depth + 1, inLink: true, edges: labelEdges }
        const children = this.nested(label, place)
        if (image) return [{ kind: 'text', text: plainText(children) }]
        return href ? [{ kind: 'link', href, children }] : children
      },
    })
    return target.end
  }

  /**
   * A strikethrough: a run of tildes before text, closed by the first later
   * run of two tildes after text, or else of one. The extra tildes of the
   * opening run show as text.
   */
  private strike(index: number): number {
    const { text } = this
    const run = runLength(text, index, '~')
    const after = text[index + run] ?? ''
    if (after === '' || /\s/.test(after)) return -1
    for (const size of [2, 1]) {
      if (size > run) continue
      const closer = this.tildeCloser(size, index + run)
      if (closer < 0) continue
      this.add(text.slice(index, index + run - size))
      const content = text.slice(index + run, closer)
      const { inLink } = this.place
      this.push({
        kind: 'group',
        source: text.slice(index + run - size, closer + size),
        nodes: (depth) => {
          const place = { depth: depth + 1, inLink, edges: strikeEdges }
          return [{ kind: 'strike', children: this.nested(content, place) }]
        },
      })
      return closer + size
    }
    return -1
  }

  /** The next run of exactly `size` tildes after text, or -1. Misses are cached. */
  private tildeCloser(size: number, from: number): number {
    const { text } = this
    if ((this.closerless.get(size) ?? Infinity) <= from) return -1
    for (let index = from; index < text.length;) {
      const span = this.spans.get(index)
      if (span) index = span.end
      else if (text[index] === '\\') index += 2
      else if (text[index] !== '~') index += 1
      else {
        const run = runLength(text, index, '~')
        const before = text[index - 1] ?? ''
        if (run === size && before !== '' && !/\s/.test(before)) return index
        index += run
      }
    }
    this.closerless.set(size, from)
    return -1
  }
}

/** Parses the inline Markdown of one block into inline content. */
export function parseInline(
  text: string,
  definitions: Definitions,
): MdInline[] {
  const place = { depth: 0, inLink: false, edges: blockEdges }
  return new InlineScanner(text, definitions, place).run()
}
