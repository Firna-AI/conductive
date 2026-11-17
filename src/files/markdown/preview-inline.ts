import type { Token } from 'markdown-it'
import { keptBreaks, type BreakNodes } from '../../markdown/kept-breaks'
import { linkTail } from '../../markdown/parser'
import type { MdInline } from './markdown-document'

/**
 * Marks and links nest at most this deep. A deeper mark or link shows its
 * Markdown as typed around its content, so a crafted file cannot build a
 * deep tree.
 */
const maxDepth = 12

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

function isMark(node: MdInline): node is MdMark {
  return (
    node.kind === 'strong' || node.kind === 'emphasis' || node.kind === 'strike'
  )
}

/** How the line-break rule reads the inline content of the preview. */
const previewNodes: BreakNodes<MdInline> = {
  marked: (node) => (isMark(node) ? node.children : null),
  remarked: (node, children) => (isMark(node) ? { ...node, children } : node),
  leaf: (node) => {
    if (node.kind === 'break') return 'break'
    return node.kind === 'text' && node.text.trim() === '' ? 'blank' : 'shows'
  },
}

/**
 * Inline content with the line breaks that its block draws, as "Line
 * breaks" of `chat-markdown.md` says.
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
  /** Whether it nests its content one level deeper. */
  nests: boolean
  /** Whether it holds the label of a link, which holds no other link. */
  label: boolean
  /** Adds what it shows to the content around it. */
  close: (into: MdInline[]) => void
}

/** The opening token of a mark or a link as typed, around its content. */
function typed(token: Token): Open {
  const tail = token.type === 'link_open' ? linkTail(token) : null
  const before = token.type !== 'link_open' ? token.markup : tail ? '[' : '<'
  const after = token.type !== 'link_open' ? token.markup : (tail ?? '>')
  const nodes: MdInline[] = []
  return {
    nodes,
    nests: false,
    label: false,
    close: (into) => {
      addText(into, before)
      addNodes(into, nodes)
      addText(into, after)
    },
  }
}

/**
 * The open node of a link. A link that is safe to follow keeps its label.
 * Any other link, also one in the label of a link, shows its label alone.
 */
function link(token: Token, inLabel: boolean): Open {
  const address = token.attrGet('href')
  const href = inLabel || typeof address !== 'string' ? null : safeHref(address)
  const nodes: MdInline[] = []
  const close =
    href === null
      ? (into: MdInline[]) => addNodes(into, nodes)
      : (into: MdInline[]) =>
          into.push({ kind: 'link', href, children: previewBreaks(nodes) })
  return { nodes, nests: href !== null, label: true, close }
}

/** The inline content of one block, as a read of its tokens builds it. */
class InlineTree {
  readonly root: MdInline[] = []
  private readonly open: Open[] = []
  /** The open marks and links that nest their content. */
  private depth = 0
  /** The open links, whose labels hold no other link. */
  private labels = 0

  /** The content that the next node joins. */
  get nodes(): MdInline[] {
    return this.open.at(-1)?.nodes ?? this.root
  }

  /** Opens the mark or the link of an opening token. */
  enter(token: Token): void {
    const node = this.opened(token)
    if (node.nests) this.depth += 1
    if (node.label) this.labels += 1
    this.open.push(node)
  }

  /** Closes the mark or the link that is open, into the content around it. */
  leave(): void {
    const node = this.open.pop()
    if (!node) return
    if (node.nests) this.depth -= 1
    if (node.label) this.labels -= 1
    node.close(this.nodes)
  }

  /** Closes each mark and each link that is still open. */
  end(): MdInline[] {
    while (this.open.length > 0) this.leave()
    return this.root
  }

  private opened(token: Token): Open {
    if (this.depth >= maxDepth) return typed(token)
    const mark = markOf.get(token.type)
    if (mark === undefined) return link(token, this.labels > 0)
    const nodes: MdInline[] = []
    return {
      nodes,
      nests: true,
      label: false,
      close: (into) => into.push({ kind: mark, children: nodes }),
    }
  }
}

/**
 * The inline content of one block from the tokens of its inline token. The
 * parser pairs the marks, so a mark without its pair is already text. A
 * soft line break stays a line of the text. An image shows its alt text,
 * and no picture loads (open question, item 10 of the Markdown parser plan:
 * a web image keeps the rule in force, its alt text with no link). The
 * line breaks are the ones that the block draws.
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
        addText(tree.nodes, plainText(token.children ?? []))
        break
      default:
        addText(tree.nodes, token.content)
    }
  }
  return previewBreaks(tree.end())
}
