import type { Token } from 'markdown-it'
import { keptBreaks, type BreakNodes } from '../../markdown/kept-breaks'
import type { MdInline } from './markdown-document'

const safeProtocols = new Set(['http:', 'https:', 'mailto:'])

type MdMark = Extract<MdInline, { kind: 'strong' | 'emphasis' | 'strike' }>

/** The mark of each opening token of a mark. */
const markOf: ReadonlyMap<string, MdMark['kind']> = new Map<
  string,
  MdMark['kind']
>([
  ['strong_open', 'strong'],
  ['em_open', 'emphasis'],
  ['s_open', 'strike'],
])

/**
 * How the line-break rule reads the inline content of the preview. Each
 * node that holds children, a mark or a link, is a container, so a label
 * is text of its block. A mark that keeps no node leaves the block. A link
 * that holds no node stays an empty link, as CommonMark draws it, and the
 * rule counts nothing for it (design call 14 of the Markdown parser plan).
 */
const previewNodes: BreakNodes<MdInline> = {
  inner: (node) => ('children' in node ? node.children : null),
  rebuilt: (node, children) => {
    if (!('children' in node)) return node
    if (node.kind === 'link' || children.length > 0) {
      return { ...node, children }
    }
    return null
  },
  leaf: (node) => {
    if (node.kind === 'break') return 'break'
    return node.kind === 'text' && node.text.trim() === '' ? 'blank' : 'shows'
  },
}

/**
 * Inline content with the line breaks that its block draws, as "Line
 * breaks" of `chat-markdown.md` says, also in the labels of its links.
 */
export function previewBreaks(nodes: readonly MdInline[]): MdInline[] {
  return keptBreaks(nodes, previewNodes)
}

/**
 * The address of a link that is safe to follow from untrusted Markdown, or
 * null. Only absolute http, https, and mailto addresses pass. A relative
 * address would resolve against the app, so its label shows as text.
 */
function safeHref(href: string): string | null {
  if (!/^[a-z][a-z\d+.-]*:/i.test(href)) return null
  try {
    const url = new URL(href)
    return safeProtocols.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/** Text as content: one text node, or none for empty text. */
function textNodes(text: string): MdInline[] {
  return text === '' ? [] : [{ kind: 'text', text }]
}

/** Adds text to content, after the text before it. */
function addText(nodes: MdInline[], text: string): void {
  if (text === '') return
  const last = nodes.at(-1)
  if (last?.kind === 'text') last.text += text
  else nodes.push({ kind: 'text', text })
}

/**
 * Adds each node to content, one at a time: a label can hold more nodes
 * than one spread into a call can take.
 */
function addNodes(into: MdInline[], nodes: readonly MdInline[]): void {
  for (const node of nodes) {
    if (node.kind === 'text') addText(into, node.text)
    else into.push(node)
  }
}

/**
 * The plain text of inline tokens, as for the alt text of an image. A soft
 * line break stays a line of the text, and a line break is a space.
 */
function plainText(tokens: readonly Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === 'image') return plainText(token.children ?? [])
      if (token.type === 'softbreak') return '\n'
      return token.type === 'hardbreak' ? ' ' : token.content
    })
    .join('')
}

/** A mark or a link that is still open, with its content so far. */
interface Open {
  nodes: MdInline[]
  /** Whether it holds the label of a link, which holds no other link. */
  label: boolean
  /** Adds what it shows to the content around it. */
  close: (into: MdInline[]) => void
}

/**
 * The open node of a link. A link that is safe to follow keeps its label,
 * with its line breaks, which the rule of its block draws. Any other link,
 * also one in the label of a link, shows its label alone.
 */
function link(token: Token, inLabel: boolean): Open {
  const address = token.attrGet('href')
  const href = inLabel || typeof address !== 'string' ? null : safeHref(address)
  const nodes: MdInline[] = []
  const close =
    href === null
      ? (into: MdInline[]) => addNodes(into, nodes)
      : (into: MdInline[]) => into.push({ kind: 'link', href, children: nodes })
  return { nodes, label: true, close }
}

/** The inline content of one block, as a read of its tokens builds it. */
class InlineTree {
  readonly root: MdInline[] = []
  private readonly open: Open[] = []
  /** The open links, whose labels hold no other link. */
  private labels = 0

  /** The content that the next node joins. */
  get nodes(): MdInline[] {
    return this.open.at(-1)?.nodes ?? this.root
  }

  /** Opens the mark or the link of an opening token. */
  enter(token: Token): void {
    const node = this.opened(token)
    if (node.label) this.labels += 1
    this.open.push(node)
  }

  /** Closes the mark or the link that is open, into the content around it. */
  leave(): void {
    const node = this.open.pop()
    if (!node) return
    if (node.label) this.labels -= 1
    node.close(this.nodes)
  }

  /**
   * Adds an image as its alt text, and no picture loads. At a web address,
   * an absolute `http` or `https` address, the alt text is a link to that
   * address, by the link rule of the preview. In the label of a link, and
   * at any other address, the alt text shows alone.
   */
  image(token: Token): void {
    const alt = plainText(token.children ?? [])
    const address = token.attrGet('src')
    const href =
      this.labels > 0 || typeof address !== 'string' ? null : safeHref(address)
    if (href === null || !/^https?:/u.test(href)) addText(this.nodes, alt)
    else this.nodes.push({ kind: 'link', href, children: textNodes(alt) })
  }

  /** Closes each mark and each link that is still open. */
  end(): MdInline[] {
    while (this.open.length > 0) this.leave()
    return this.root
  }

  private opened(token: Token): Open {
    const mark = markOf.get(token.type)
    if (mark === undefined) return link(token, this.labels > 0)
    const nodes: MdInline[] = []
    return {
      nodes,
      label: false,
      close: (into) => into.push({ kind: mark, children: nodes }),
    }
  }
}

/**
 * The inline content of one block from the tokens of its inline token. The
 * parser pairs the marks, so a mark without its pair is already text. A
 * soft line break stays a line of the text. An image shows its alt text,
 * as a link at a web address, and no picture loads, as `workspace-tools.md`
 * says. The line breaks are the ones that the block draws.
 */
export function previewInline(tokens: readonly Token[] | null): MdInline[] {
  const tree = new InlineTree()
  for (const token of tokens ?? []) {
    if (markOf.has(token.type) || token.type === 'link_open') {
      tree.enter(token)
      continue
    }
    switch (token.type) {
      case 'strong_close':
      case 'em_close':
      case 's_close':
      case 'link_close':
        tree.leave()
        break
      case 'softbreak':
        addText(tree.nodes, '\n')
        break
      case 'hardbreak':
        tree.nodes.push({ kind: 'break' })
        break
      case 'code_inline':
        tree.nodes.push({ kind: 'code', text: token.content })
        break
      case 'image':
        tree.image(token)
        break
      default:
        addText(tree.nodes, token.content)
    }
  }
  return previewBreaks(tree.end())
}
