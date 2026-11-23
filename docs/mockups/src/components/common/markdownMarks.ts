/**
 * The marks of Markdown text, as CommonMark and `markdown-it` read them.
 * `**` and `__` mark bold text, `*` and `_` mark emphasis, and `~~` marks
 * strikethrough. A mark pairs only where CommonMark
 * lets it open and close, so a mark without a pair, such as the `**` of
 * `src/**`, shows as typed. Code, links, and chips are units that the marks
 * do not read into, as the parser reads them before the marks. The file
 * preview of the mockups reads its text with these rules. An answer holds
 * the inline tree of the app, whose marks the app already paired.
 */

import { flanking } from './markFlanking'

/** What a pair of marks makes of the text between them. */
type Mark = 'strong' | 'emphasis' | 'strike'

/**
 * A piece of inline text before its marks pair: text, a line break, or a
 * unit, such as code, with its text as written. The characters next to a
 * mark decide whether it can open or close.
 */
export type MarkItem<Unit> =
  | { kind: 'text'; text: string }
  | { kind: 'break' }
  | { kind: 'unit'; unit: Unit; source: string }

/** A node of inline text after its marks pair. */
export type MarkNode<Unit> =
  | { kind: 'text'; text: string }
  | { kind: 'break' }
  | { kind: 'unit'; unit: Unit }
  | { kind: 'mark'; mark: Mark; children: MarkNode<Unit>[] }

type TextNode = { kind: 'text'; text: string }

/** A run of one mark character, such as `**`, that can open or close. */
type Run = {
  node: TextNode
  char: string
  /** The characters of the run that can still pair. */
  left: number
  /** 1 for an odd run of `~`, whose extra `~` never pairs, else 0. */
  extra: number
  /** The length of the whole run, for the rule of 3 of CommonMark. */
  length: number
  open: boolean
  close: boolean
}

const markRun = /\*+|_+|~+/g

function sourceOf<Unit>(item: MarkItem<Unit>): string {
  if (item.kind === 'text') return item.text
  return item.kind === 'break' ? '<br>' : item.source
}

/**
 * The nodes of the items, with each run of marks as its own text node, and
 * the runs that can open or close. A run of one `~` is text, and of an odd
 * run of `~` one `~` stays text, as `markdown-it` reads strikethrough: it
 * stands before the pair that the run opens, or after the pair that the
 * run closes.
 */
function scan<Unit>(items: readonly MarkItem<Unit>[]) {
  const source = items.map(sourceOf).join('')
  const nodes: MarkNode<Unit>[] = []
  const runs: Run[] = []
  const pushText = (text: string) => {
    if (text !== '') nodes.push({ kind: 'text', text })
  }
  let offset = 0
  for (const item of items) {
    if (item.kind !== 'text') {
      nodes.push(
        item.kind === 'unit' ? { kind: 'unit', unit: item.unit } : item,
      )
      offset += sourceOf(item).length
      continue
    }
    let end = 0
    for (const match of item.text.matchAll(markRun)) {
      const [run] = match
      const char = run[0]
      const extra = char === '~' ? run.length % 2 : 0
      const at = offset + match.index
      const sides = flanking(
        char,
        source[at - 1] ?? '',
        source[at + run.length] ?? '',
      )
      if (run.length - extra === 0 || (!sides.open && !sides.close)) continue
      pushText(item.text.slice(end, match.index))
      const node: TextNode = { kind: 'text', text: run }
      nodes.push(node)
      const left = run.length - extra
      runs.push({ node, char, left, extra, length: run.length, ...sides })
      end = match.index + run.length
    }
    pushText(item.text.slice(end))
    offset += item.text.length
  }
  return { nodes, runs }
}

/**
 * The nearest run before `closer` that can open it, or -1. For `*` and `_`,
 * the rule of 3 of CommonMark applies: when one of the runs can both open
 * and close, the two lengths must not add up to a multiple of 3, unless
 * both are multiples of 3.
 */
function openerOf(runs: readonly Run[], closer: Run): number {
  for (let index = runs.indexOf(closer) - 1; index >= 0; index -= 1) {
    const opener = runs[index]
    if (opener.char !== closer.char || !opener.open || opener.left === 0) {
      continue
    }
    const either = opener.close || closer.open
    const sum = opener.length + closer.length
    const both = opener.length % 3 === 0 && closer.length % 3 === 0
    if (closer.char !== '~' && either && sum % 3 === 0 && !both) continue
    return index
  }
  return -1
}

/** The mark that `use` characters of a run of `char` make. */
function markOf(char: string, use: number): Mark {
  return char === '~' ? 'strike' : use === 2 ? 'strong' : 'emphasis'
}

/** Takes `use` characters of each run, and keeps the rest as its text. */
function take(runs: readonly Run[], use: number) {
  for (const run of runs) {
    run.left -= use
    run.node.text = run.char.repeat(run.left + run.extra)
  }
}

/** Puts the nodes between two runs inside a mark, and takes its marks. */
function wrap<Unit>(
  nodes: MarkNode<Unit>[],
  opener: Run,
  closer: Run,
  use: number,
) {
  const start = nodes.indexOf(opener.node)
  const end = nodes.indexOf(closer.node)
  const mark = markOf(closer.char, use)
  const children = nodes.slice(start + 1, end)
  nodes.splice(start + 1, end - start - 1, { kind: 'mark', mark, children })
  take([opener, closer], use)
}

/** Joins neighbouring text and leaves out empty text, at each depth. */
function tidy<Unit>(nodes: readonly MarkNode<Unit>[]): MarkNode<Unit>[] {
  const tidied: MarkNode<Unit>[] = []
  for (const node of nodes) {
    const last = tidied.at(-1)
    if (node.kind === 'mark') {
      tidied.push({ ...node, children: tidy(node.children) })
    } else if (node.kind !== 'text') tidied.push(node)
    else if (last?.kind === 'text') last.text += node.text
    else if (node.text !== '') tidied.push({ ...node })
  }
  return tidied
}

/**
 * The items as nodes, with the marks paired as CommonMark pairs them: each
 * closing run, from the first, takes the nearest run before it that can
 * open it. Two marks of each run make bold text and one makes emphasis,
 * and `~~` makes strikethrough. The runs between a pair stay text.
 */
export function markNodes<Unit>(
  items: readonly MarkItem<Unit>[],
): MarkNode<Unit>[] {
  const { nodes, runs } = scan(items)
  let index = 0
  while (index < runs.length) {
    const closer = runs[index]
    const at = closer.close && closer.left > 0 ? openerOf(runs, closer) : -1
    if (at < 0) {
      index += 1
      continue
    }
    const opener = runs[at]
    const pairs = closer.char === '~' || (opener.left > 1 && closer.left > 1)
    wrap(nodes, opener, closer, pairs ? 2 : 1)
    runs.splice(at + 1, index - at - 1)
    index = at + 1
  }
  return tidy(nodes)
}
