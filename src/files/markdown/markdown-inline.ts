import { readDestination } from './markdown-destination'
import {
  bracketPairs,
  codeSpans,
  runLength,
  type CodeSpan,
} from './markdown-spans'
import { decodeEntities, normalizeLabel, safeHref } from './markdown-text'

/** Inline content of a block. A link holds a checked, safe address. */
export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'emphasis' | 'strike'; children: MdInline[] }
  | { kind: 'link'; href: string; children: MdInline[] }
  | { kind: 'break' }

type Definitions = ReadonlyMap<string, string>

const punctuation = /[!-/:-@[-`{-~]/
const wordChar = /[\p{L}\p{N}]/u
const maxDepth = 12
const urlLink = /<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]{1,2000})>/y
const emailLink = /<([^\s<>@]{1,256}@[^\s<>@]{1,256})>/y

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

function isDelimiter(char: string): boolean {
  return char === '*' || char === '_' || char === '~'
}

class InlineScanner {
  private readonly text: string
  private readonly definitions: Definitions
  private readonly depth: number
  private readonly inLink: boolean
  private readonly spans: Map<number, CodeSpan>
  private readonly brackets: Map<number, number>
  private readonly closerless = new Map<string, number>()
  private readonly nodes: MdInline[] = []
  private buffer = ''

  constructor(
    text: string,
    definitions: Definitions,
    depth: number,
    inLink: boolean,
  ) {
    this.text = text
    this.definitions = definitions
    this.depth = depth
    this.inLink = inLink
    this.spans = codeSpans(text)
    this.brackets = bracketPairs(text, this.spans)
  }

  run(): MdInline[] {
    for (let index = 0; index < this.text.length;) index = this.step(index)
    this.flush()
    return this.nodes
  }

  private nested(text: string, inLink: boolean): MdInline[] {
    if (this.depth >= maxDepth) return [{ kind: 'text', text }]
    return new InlineScanner(
      text,
      this.definitions,
      this.depth + 1,
      inLink,
    ).run()
  }

  private flush(): void {
    if (this.buffer === '') return
    this.nodes.push({ kind: 'text', text: decodeEntities(this.buffer) })
    this.buffer = ''
  }

  private push(...nodes: MdInline[]): void {
    this.flush()
    this.nodes.push(...nodes)
  }

  private step(index: number): number {
    const { text } = this
    const span = this.spans.get(index)
    if (span) {
      this.push({ kind: 'code', text: span.code })
      return span.end
    }
    const char = text[index]
    if (char === '\\') return this.escape(index)
    if (char === '\n') {
      const hard = / {2,}$/.test(this.buffer)
      this.buffer = this.buffer.replace(/ +$/, '')
      if (hard) this.push({ kind: 'break' })
      else this.buffer += '\n'
      return index + 1
    }
    let end = -1
    if (char === '<') end = this.autolink(index)
    else if (char === '[' || (char === '!' && text[index + 1] === '[')) {
      end = this.link(index)
    } else if (isDelimiter(char)) end = this.emphasis(index, char)
    if (end > index) return end
    const run = isDelimiter(char) ? runLength(text, index, char) : 1
    this.buffer += text.slice(index, index + run)
    return index + run
  }

  /** A backslash keeps the punctuation after it as text, or ends a line. */
  private escape(index: number): number {
    const next = this.text[index + 1] ?? ''
    if (next === '\n') this.push({ kind: 'break' })
    else if (punctuation.test(next)) this.push({ kind: 'text', text: next })
    else {
      this.buffer += '\\'
      return index + 1
    }
    return index + 2
  }

  private autolink(index: number): number {
    for (const pattern of [urlLink, emailLink]) {
      pattern.lastIndex = index
      const match = pattern.exec(this.text)
      if (!match) continue
      const address = pattern === emailLink ? `mailto:${match[1]}` : match[1]
      const href = safeHref(address)
      const label: MdInline = { kind: 'text', text: match[1] }
      const link: MdInline | null =
        href && !this.inLink ? { kind: 'link', href, children: [label] } : null
      this.push(link ?? label)
      return index + match[0].length
    }
    return -1
  }

  /** A link, or an image, which shows its alt text. */
  private link(index: number): number {
    const image = this.text[index] === '!'
    const open = image ? index + 1 : index
    const close = this.brackets.get(open)
    if (close === undefined) return -1
    const label = this.text.slice(open + 1, close)
    const target = this.target(close + 1, label)
    if (!target) return -1
    const children = this.nested(label, true)
    const href = image || this.inLink ? null : safeHref(target.destination)
    if (image) this.push({ kind: 'text', text: plainText(children) })
    else if (href) this.push({ kind: 'link', href, children })
    else this.push(...children)
    return target.end
  }

  /** An inline address, a full or collapsed reference, or a shortcut. */
  private target(after: number, label: string) {
    const { text, definitions } = this
    if (text[after] === '(') {
      const inline = readDestination(text, after + 1)
      if (inline) return inline
    }
    const refClose = text[after] === '[' ? this.brackets.get(after) : undefined
    if (refClose !== undefined) {
      const ref = text.slice(after + 1, refClose)
      const key = normalizeLabel(ref === '' ? label : ref)
      const destination = definitions.get(key)
      if (destination !== undefined) return { destination, end: refClose + 1 }
    }
    const destination = definitions.get(normalizeLabel(label))
    return destination === undefined ? null : { destination, end: after }
  }

  private emphasis(index: number, char: string): number {
    const { text } = this
    const run = runLength(text, index, char)
    const after = text[index + run] ?? ''
    if (after === '' || /\s/.test(after)) return -1
    if (char === '_' && wordChar.test(text[index - 1] ?? '')) return -1
    const sizes = (char === '~' ? [2, 1] : [3, 2, 1]).filter(
      (size) => size <= run,
    )
    for (const size of sizes) {
      const closer = this.closer(char, size, index + run)
      if (closer < 0) continue
      this.buffer += text.slice(index, index + run - size)
      const inner = text.slice(index + run, closer)
      // Three delimiters are strong text around emphasised text.
      const content = size === 3 ? `${char}${inner}${char}` : inner
      const kind = char === '~' ? 'strike' : size === 1 ? 'emphasis' : 'strong'
      this.push({ kind, children: this.nested(content, this.inLink) })
      return closer + size
    }
    return -1
  }

  /** The next run of exactly `size` that can close, or -1. Misses are cached. */
  private closer(char: string, size: number, from: number): number {
    const { text } = this
    const key = `${char}${size}`
    if ((this.closerless.get(key) ?? Infinity) <= from) return -1
    for (let index = from; index < text.length;) {
      const span = this.spans.get(index)
      if (span) index = span.end
      else if (text[index] === '\\') index += 2
      else if (text[index] !== char) index += 1
      else {
        const run = runLength(text, index, char)
        const before = text[index - 1] ?? ''
        const flanks = before !== '' && !/\s/.test(before)
        const intraword = char === '_' && wordChar.test(text[index + run] ?? '')
        if (run === size && flanks && !intraword) return index
        index += run
      }
    }
    this.closerless.set(key, from)
    return -1
  }
}

/** Parses the inline Markdown of one block into inline content. */
export function parseInline(
  text: string,
  definitions: Definitions,
): MdInline[] {
  return new InlineScanner(text, definitions, 0, false).run()
}
