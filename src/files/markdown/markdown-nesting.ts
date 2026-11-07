import type { DelimiterRun } from './markdown-delimiters'
import type { MdInline } from './markdown-inline'

/**
 * Inline containers nest at most this deep: emphasis, strong emphasis,
 * strikethrough, and links. Past the limit, a pair of emphasis markers
 * shows its markers as text, and a link, an image, or a strikethrough
 * shows its Markdown as typed. So a crafted file cannot overflow the stack
 * of the renderer, of `plainText`, or of the parse of nested link texts.
 */
export const maxDepth = 12

/** One part of an inline text, in text order. */
export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'node'; node: MdInline }
  | { kind: 'run'; run: DelimiterRun }
  /**
   * A link, an image, an autolink, or a strikethrough. Its content parses
   * as a text of its own, so no run inside it pairs with a run outside.
   */
  | {
      kind: 'group'
      /** The Markdown of the group as typed, which shows past the limit. */
      source: string
      /** The nodes of the group, with `depth` containers around it. */
      nodes: (depth: number) => readonly MdInline[]
    }

/** The node of a pair. Its kind is emphasis or strong emphasis. */
type Container = Extract<MdInline, { kind: 'strong' | 'emphasis' | 'strike' }>

/** An open pair: its container and the list that holds it, or its markers. */
type Frame =
  | { container: Container; outer: MdInline[] }
  | { container: null; markers: string }

/** The inline content of one text, built part by part in text order. */
class InlineTree {
  private readonly nodes: MdInline[] = []
  private readonly frames: Frame[] = []
  private target: MdInline[] = this.nodes
  private around: number
  /** The text after the last node. Adjacent text joins into one node. */
  private text = ''

  constructor(depth: number) {
    this.around = depth
  }

  /** The number of containers around the next part. */
  get depth(): number {
    return this.around
  }

  add(node: MdInline): void {
    if (node.kind === 'text') this.text += node.text
    else {
      this.flush()
      this.target.push(node)
    }
  }

  addText(text: string): void {
    this.text += text
  }

  /** Opens a pair: a container below the limit, or else its markers. */
  open(char: string, size: number): void {
    const markers = char.repeat(size)
    if (this.around >= maxDepth) {
      this.text += markers
      this.frames.push({ container: null, markers })
      return
    }
    this.flush()
    const kind = size === 2 ? 'strong' : 'emphasis'
    const container: Container = { kind, children: [] }
    this.target.push(container)
    this.frames.push({ container, outer: this.target })
    this.target = container.children
    this.around += 1
  }

  /** Closes the innermost open pair. */
  close(): void {
    const frame = this.frames.pop()
    if (frame === undefined) return
    if (frame.container === null) {
      this.text += frame.markers
      return
    }
    this.flush()
    this.target = frame.outer
    this.around -= 1
  }

  finish(): MdInline[] {
    this.flush()
    return this.nodes
  }

  private flush(): void {
    if (this.text === '') return
    this.target.push({ kind: 'text', text: this.text })
    this.text = ''
  }
}

/**
 * The inline content of the parts of one text, after its runs paired.
 * Pairs never cross, so each run first closes its pairs, from the
 * innermost. Then it shows the markers that no pair took, and opens its
 * own pairs, from the outermost. `depth` containers hold the text already.
 */
export function nestParts(
  parts: readonly InlinePart[],
  depth: number,
): MdInline[] {
  const tree = new InlineTree(depth)
  for (const part of parts) {
    if (part.kind === 'text') tree.addText(part.text)
    else if (part.kind === 'node') tree.add(part.node)
    else if (part.kind === 'group') {
      if (tree.depth >= maxDepth) tree.addText(part.source)
      else for (const node of part.nodes(tree.depth)) tree.add(node)
    } else {
      const { run } = part
      for (let count = run.closes; count > 0; count -= 1) tree.close()
      tree.addText(run.char.repeat(run.remaining))
      for (let index = run.opens.length - 1; index >= 0; index -= 1) {
        tree.open(run.char, run.opens[index])
      }
    }
  }
  return tree.finish()
}
