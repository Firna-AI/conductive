import {
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  mergeRegister,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import type { FileEntry } from '../../../shared/files'
import { mentionAt, mentionText } from '../../../shared/mention-text'
import { findMentioned, type MentionTree } from '../../mentions/MentionsContext'
import {
  $createFileMentionNode,
  $createMentionTextNode,
  $isFileMentionNode,
  $isMentionTextNode,
  MentionTextNode,
} from './file-mention-nodes'

/** Whether the tree holds the entry that a mention names. */
function names(tree: MentionTree, source: string): boolean {
  const mention = mentionAt(source, 0)
  return mention !== null && !!findMentioned(tree, mention.path, mention.folder)
}

/**
 * A kind of chip that a waiting text can become: a file chip, or a skill
 * chip. `names` says whether a list names the source of the text now. It
 * accepts no source of another kind.
 */
export interface ChipKind {
  names: (source: string) => boolean
  isChip: (node: LexicalNode) => boolean
  create: (source: string) => LexicalNode
}

/**
 * Brings the chips of one kind in line with their list. A waiting text of a
 * paste or a draft that the list now names becomes a chip, and a caret
 * inside it goes after its chip. A chip that the list no longer names
 * becomes waiting text that can become a chip again. Typed text never
 * changes.
 */
export function $reconcileChips(kind: ChipKind): void {
  const selection = $getSelection()
  for (const node of $getRoot().getAllTextNodes()) {
    if (!$isMentionTextNode(node) || !node.isMention()) continue
    if (!kind.names(node.getTextContent())) continue
    const chip = kind.create(node.getTextContent())
    const holdsCaret =
      $isRangeSelection(selection) &&
      [selection.anchor, selection.focus].some(
        (point) => point.key === node.getKey(),
      )
    node.replace(chip)
    if (holdsCaret) chip.selectNext(0, 0)
  }
  const inline = $getRoot()
    .getChildren()
    .flatMap((block) => ($isElementNode(block) ? block.getChildren() : []))
  for (const node of inline) {
    if (!kind.isChip(node) || kind.names(node.getTextContent())) continue
    node.replace($createMentionTextNode(node.getTextContent()))
  }
}

/**
 * Brings the file chips of the field in line with the tree, as
 * `$reconcileChips` says. A tree that loads or that is unavailable changes
 * nothing.
 */
export function $reconcileMentions(tree: MentionTree): void {
  if (tree.state !== 'ready') return
  $reconcileChips({
    names: (source) => names(tree, source),
    isChip: $isFileMentionNode,
    create: $createFileMentionNode,
  })
}

/**
 * Makes a mention or a skill text that waits ordinary text, with the caret
 * where it was. The text then joins the plain text beside it.
 */
function $toPlainText(node: MentionTextNode): void {
  const selection = $getSelection()
  const points = $isRangeSelection(selection)
    ? [selection.anchor, selection.focus].filter(
        (point) => point.key === node.getKey(),
      )
    : []
  const offsets = points.map((point) => point.offset)
  const plain = $createTextNode(node.getTextContent())
  node.replace(plain)
  points.forEach((point, index) =>
    point.set(plain.getKey(), offsets[index], 'text'),
  )
}

/**
 * Keeps a mention or a skill text that waits from catching typed text. An
 * edit inside it, or text typed right after it with no space, continues
 * it, so it becomes ordinary text. Then the list of `@` or `/` reads the
 * whole query, and a list that loads later makes no chip of it. A typed
 * space stays outside, so the text still waits for its entry or its skill.
 */
export function registerWaitingMentions(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(MentionTextNode, (node) => {
      if (!node.isMention()) $toPlainText(node)
    }),
    editor.registerNodeTransform(TextNode, (node) => {
      const previous = node.getPreviousSibling()
      if (!$isMentionTextNode(previous)) return
      if (/^\S/.test(node.getTextContent())) $toPlainText(previous)
    }),
  )
}

/** The character that opens a list: `@` for files, `/` for skills. */
export type MentionTrigger = '@' | '/'

/** The query of a list: the text from its trigger to the caret. */
export interface MentionQuery {
  trigger: MentionTrigger
  /** The text node that holds the trigger and the caret. */
  nodeKey: NodeKey
  /** The offset of the trigger in that node. */
  start: number
  /** The offset of the caret. */
  end: number
  query: string
}

/** Whether the node before a text ends with a space, or no text comes before. */
function startsAfterSpace(previous: LexicalNode | null): boolean {
  if (previous === null || $isLineBreakNode(previous)) return true
  return $isTextNode(previous) && /\s$/.test(previous.getTextContent())
}

/**
 * The text from each trigger to the caret. A query of `@` holds no space,
 * no `@`, and no double quote, as no mention holds them unquoted. A query
 * of `/` runs to the caret with no space, as a skill text does.
 */
const queryPatterns: Readonly<Record<MentionTrigger, RegExp>> = {
  '@': /(^|\s)@([^\s@"]*)$/,
  '/': /(^|\s)\/(\S*)$/,
}

/**
 * The query of the list of `trigger` at the caret, or null. The trigger
 * stands at the start of the text, or after a space or a line break, and
 * the query runs from it to the caret, as `queryPatterns` says.
 */
export function $triggerQuery(trigger: MentionTrigger): MentionQuery | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null
  const node = selection.anchor.getNode()
  if (!$isTextNode(node) || node.getType() !== 'text') return null
  const end = selection.anchor.offset
  const match = queryPatterns[trigger].exec(node.getTextContent().slice(0, end))
  if (!match) return null
  const start = end - match[2].length - 1
  if (start === 0 && !startsAfterSpace(node.getPreviousSibling())) return null
  return { trigger, nodeKey: node.getKey(), start, end, query: match[2] }
}

/**
 * Puts the chip of a pick in place of the trigger and the query, with a
 * space after it unless one follows already, and places the caret after
 * both.
 */
export function $insertPick(query: MentionQuery, chip: LexicalNode): void {
  const node = $getNodeByKey(query.nodeKey)
  if (!$isTextNode(node)) return
  const text = node.getTextContent()
  const typed = `${query.trigger}${query.query}`
  if (text.slice(query.start, query.end) !== typed) return
  const rest = text.slice(query.end)
  node.setTextContent(text.slice(0, query.start))
  node.insertAfter(chip)
  const space = /^\s/.test(rest) ? '' : ' '
  const after = $createTextNode(space + rest)
  chip.insertAfter(after)
  if (node.getTextContent() === '') node.remove()
  after.select(space.length, space.length)
}

/** Puts a chip of the entry in place of `@` and the query. */
export function $pickMention(query: MentionQuery, entry: FileEntry): void {
  const source = mentionText(entry.path, entry.kind === 'directory')
  $insertPick(query, $createFileMentionNode(source))
}
