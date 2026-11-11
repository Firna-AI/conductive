import {
  $createTextNode,
  $getCollapsedCaretRange,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelectionFromCaretRange,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'
import { $createAttachedFileNode } from './attached-file-node'
import { $caretAtPoint, type FieldPoint } from './point-caret'

/**
 * The caret of the field, or the end of its text when it has none. When the
 * caret selects text, the caret stands where the browser draws it, at the
 * focus of the selection, and the selected text stays.
 */
function $caretOrEnd(): RangeSelection {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return $getRoot().selectEnd()
  const { key, offset, type } = selection.focus
  selection.anchor.set(key, offset, type)
  return selection
}

/** The text of a node that follows a place, or nothing for a chip or the end. */
function textOf(node: LexicalNode | null): string {
  if ($isLineBreakNode(node)) return '\n'
  return $isTextNode(node) ? node.getTextContent() : ''
}

/** Whether a space or a line break follows a caret. */
function $spaceFollows(caret: RangeSelection): boolean {
  const { anchor } = caret
  const node = anchor.getNode()
  let after = ''
  if ($isTextNode(node)) {
    after = node.getTextContent().slice(anchor.offset)
    if (after === '') after = textOf(node.getNextSibling())
  } else if ($isElementNode(node)) {
    after = textOf(node.getChildAtIndex(anchor.offset))
  }
  return /^\s/.test(after)
}

/**
 * Puts a chip of each file at the place under a point over the text, else at
 * the caret, else at the end: in the order of `ids`, each with a space after
 * it, as after a pick of the list of `@`. The last chip gets no space when
 * one follows already. The caret then stands after the last new chip.
 */
export function $insertFiles(
  editor: LexicalEditor,
  ids: readonly string[],
  point: FieldPoint | undefined,
): void {
  const at = point ? $caretAtPoint(editor, point) : null
  const caret = at
    ? $setSelectionFromCaretRange($getCollapsedCaretRange(at))
    : $caretOrEnd()
  const spaced = $spaceFollows(caret)
  const nodes = ids.flatMap((id, index): LexicalNode[] => {
    const chip = $createAttachedFileNode(id)
    const last = index === ids.length - 1
    return last && spaced ? [chip] : [chip, $createTextNode(' ')]
  })
  caret.insertNodes(nodes)
}
