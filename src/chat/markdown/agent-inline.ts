import type { Token } from 'markdown-it'
import { imageSource, linkTail } from '../../markdown/parser'
import { showsInline } from './agent-breaks'

/** A mark of agent text: bold text, emphasis, or strikethrough. */
export type InlineMark = 'strong' | 'emphasis' | 'strike'

/**
 * A link of agent text, as the parser reads it. `href` is the address with
 * the escapes of the parser. `typed` holds the text that the agent wrote
 * around the label, such as `[` and `](src/a.ts "A")`, or `<` and `>` for
 * an address in angle brackets. A link that opens nothing shows it.
 */
export interface InlineLink {
  kind: 'link'
  href: string
  label: readonly InlineNode[]
  typed: { open: string; close: string }
}

/**
 * A Markdown image: its address, its alt text, and its Markdown as the
 * agent wrote it, such as `![Phone view](shots/after.png)`. A copy of the
 * picture of a workspace file gives that Markdown.
 */
export interface InlineImage {
  kind: 'image'
  href: string
  alt: readonly InlineNode[]
  source: string
}

/**
 * A node of the inline text of an agent message, before the chat reads its
 * chips and its links: text, inline code, a line break, a mark around
 * nodes, a link, or an image. A soft line break is a space of the text.
 */
export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'break' }
  | { kind: 'mark'; mark: InlineMark; nodes: readonly InlineNode[] }
  | InlineLink
  | InlineImage

/** The inline text of one block, such as a paragraph or a table cell. */
export type InlineText = readonly InlineNode[]

/** The mark of each opening token of a mark. */
const markOf: ReadonlyMap<string, InlineMark> = new Map<string, InlineMark>([
  ['strong_open', 'strong'],
  ['em_open', 'emphasis'],
  ['s_open', 'strike'],
])

/** A node that is still open: a mark or a link, with its nodes so far. */
interface Open {
  nodes: InlineNode[]
  close: (nodes: InlineNode[]) => InlineNode
}

/** Adds text to the nodes that this read builds, after the text before it. */
function addText(nodes: InlineNode[], text: string): void {
  if (text === '') return
  const last = nodes.at(-1)
  if (last?.kind === 'text') last.text += text
  else nodes.push({ kind: 'text', text })
}

/** The open node of a link token. */
function openLink(token: Token): Open {
  const href = token.attrGet('href')
  const tail = linkTail(token)
  const typed =
    tail === null ? { open: '<', close: '>' } : { open: '[', close: tail }
  return {
    nodes: [],
    close: (label) => ({
      kind: 'link',
      href: typeof href === 'string' ? href : '',
      label,
      typed,
    }),
  }
}

/** The node of an image token, with the alt text that the parser read. */
function imageOf(token: Token): InlineImage {
  const href = token.attrGet('src')
  return {
    kind: 'image',
    href: typeof href === 'string' ? href : '',
    alt: nodesOf(token.children ?? []),
    source: imageSource(token),
  }
}

/**
 * The nodes of the inline tokens of the parser, as a tree. Each closing
 * token closes the open node. The parser pairs its marks, so a mark
 * without its pair is already text.
 */
function nodesOf(tokens: readonly Token[]): InlineNode[] {
  const root: InlineNode[] = []
  const open: Open[] = []
  const nodes = () => open.at(-1)?.nodes ?? root
  for (const token of tokens) {
    const mark = markOf.get(token.type)
    if (mark) {
      open.push({
        nodes: [],
        close: (inner) => ({ kind: 'mark', mark, nodes: inner }),
      })
      continue
    }
    switch (token.type) {
      case 'softbreak':
        addText(nodes(), ' ')
        break
      case 'hardbreak':
        nodes().push({ kind: 'break' })
        break
      case 'code_inline':
        nodes().push({ kind: 'code', text: token.content })
        break
      case 'link_open':
        open.push(openLink(token))
        break
      case 'image':
        nodes().push(imageOf(token))
        break
      case 'strong_close':
      case 'em_close':
      case 's_close':
      case 'link_close': {
        const done = open.pop()
        if (done) nodes().push(done.close(done.nodes))
        break
      }
      default:
        addText(nodes(), token.content)
    }
  }
  while (open.length > 0) {
    const done = open.pop()
    if (done) nodes().push(done.close(done.nodes))
  }
  return root
}

/**
 * The inline text of one block from the tokens of its inline token, with
 * each line break that the parser read, also in a link label and in the
 * alt text of an image. `answerParts` draws the breaks by the rule of the
 * whole block. Empty when the block shows nothing, such as a block of only
 * line breaks, so the adapter leaves it out.
 */
export function inlineText(tokens: readonly Token[] | null): InlineText {
  const nodes = nodesOf(tokens ?? [])
  return showsInline(nodes) ? nodes : []
}
