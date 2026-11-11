import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'
import { fileMark, literalText } from '../../../app/draft-marks'
import { linkTarget, type WorkspaceLinks } from '../../links/workspace-links'
import { $isAttachedFileNode } from './attached-file-node'
import { copyPartOf, heldFile, type FieldFiles } from './attached-files'
import {
  $createWorkspaceChipNode,
  $isLinkTextNode,
  $isWorkspaceChipNode,
} from './chip-nodes'
import { joinFieldParts, type FieldPart } from './field-text'
import { $isFileMentionNode } from './file-mention-nodes'

/** The part of a node for the text of the field, or null for an element. */
type PartOf = (
  node: LexicalNode,
  from?: number,
  to?: number,
) => FieldPart | null

/**
 * The part of a node in the public text of the field, as a member reads and
 * copies it: the text as typed, the exact link of a workspace chip, and the
 * mention of a file chip. An attached file and an element give nothing.
 */
function $publicPart(
  node: LexicalNode,
  from = 0,
  to?: number,
): FieldPart | null {
  if ($isWorkspaceChipNode(node)) {
    return { kind: 'chip', source: node.getTextContent() }
  }
  if ($isFileMentionNode(node)) {
    return { kind: 'chip', source: node.getTextContent(), mention: true }
  }
  if ($isLineBreakNode(node)) return { kind: 'text', text: '\n' }
  if ($isTextNode(node)) {
    return { kind: 'text', text: node.getTextContent().slice(from, to) }
  }
  return null
}

/**
 * The part of each node for the draft text of the field. An attached file
 * gives its mark, with the spaces of a mention. In a field that takes
 * attached files, the chip of a file that its draft no longer holds gives
 * nothing, so the text never names such a file. There, each other part is
 * literal text, which `literalText` escapes, so neither typed or pasted text
 * nor the source of a chip can make a mark. Without `files`, the text stays
 * as the field holds it.
 */
function draftPartOf(files: FieldFiles | null): PartOf {
  return (node, from, to) => {
    if ($isAttachedFileNode(node)) {
      const id = node.getFileId()
      if (files && !heldFile(files, id)) return null
      return { kind: 'chip', source: fileMark(id), mention: true }
    }
    const part = $publicPart(node, from, to)
    if (files === null || part === null) return part
    return part.kind === 'text'
      ? { kind: 'text', text: literalText(part.text) }
      : { ...part, source: literalText(part.source) }
  }
}

/**
 * The text of the whole field, as the draft keeps it: the exact link of each
 * chip, the mention of each file chip, and the mark of each attached file.
 * `files` are the attached files of the field, as `draftPartOf` says.
 */
export function $fieldText(files: FieldFiles | null = null): string {
  const part = draftPartOf(files)
  const parts: FieldPart[] = []
  $getRoot()
    .getChildren()
    .forEach((block, index) => {
      if (index > 0) parts.push({ kind: 'text', text: '\n' })
      const children = $isElementNode(block) ? block.getChildren() : [block]
      for (const node of children) {
        const piece = part(node)
        if (piece) parts.push(piece)
      }
    })
  return joinFieldParts(parts)
}

/** The text of a selection, with the part of each node as `part` gives it. */
function $selectionText(selection: RangeSelection, part: PartOf): string {
  const [start, end] = selection.isBackward()
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus]
  const parts: FieldPart[] = []
  for (const node of selection.getNodes()) {
    const from = start.type === 'text' && start.key === node.getKey()
    const to = end.type === 'text' && end.key === node.getKey()
    const piece = part(
      node,
      from ? start.offset : 0,
      to ? end.offset : undefined,
    )
    if (piece) parts.push(piece)
  }
  return joinFieldParts(parts)
}

/**
 * The text of a selection as the draft keeps it, with the mark of each
 * attached file. The field keeps it for a paste or a drop in its draft.
 */
export function $selectedFieldText(
  selection: RangeSelection,
  files: FieldFiles | null,
): string {
  return $selectionText(selection, draftPartOf(files))
}

/**
 * The plain text of a selection, as a copy, a cut, or a drag gives it: the
 * text as typed, the exact link of each chip, the mention of each file chip
 * and of each ready attached file, and the name of each other attached
 * file. It holds no mark and no escape, also in a field with attached files.
 */
export function $selectedCopyText(
  selection: RangeSelection,
  files: FieldFiles | null,
): string {
  return $selectionText(selection, (node, from, to) =>
    $isAttachedFileNode(node)
      ? copyPartOf(heldFile(files, node.getFileId()))
      : $publicPart(node, from, to),
  )
}

/**
 * Brings the chips of the field in line with the list. A chip whose
 * workspace left the list becomes ordinary text. A link of a paste or a
 * draft whose workspace the list now holds becomes a chip. A caret inside
 * such a link goes after its chip. Typed text never changes.
 */
export function $reconcileLinks(links: WorkspaceLinks): void {
  const selection = $getSelection()
  for (const node of $getRoot().getAllTextNodes()) {
    if (!$isLinkTextNode(node) || !node.isLink()) continue
    if (!linkTarget(node.getHref(), links)) continue
    const chip = $createWorkspaceChipNode(node.getTextContent(), node.getHref())
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
    if (!$isWorkspaceChipNode(node) || linkTarget(node.getHref(), links)) {
      continue
    }
    node.replace($createTextNode(node.getTextContent()))
  }
}
