import {
  $caretRangeFromSelection,
  $comparePointCaretNext,
  $getCaretRangeInDirection,
  $getCollapsedCaretRange,
  $isTextPointCaret,
  $normalizeCaret,
  $rewindSiblingCaret,
  $setSelectionFromCaretRange,
  $splitAtPointCaretNext,
  type LexicalNode,
  type PointCaret,
  type RangeSelection,
} from 'lexical'

/**
 * The caret beside a node for a caret at an edge of a text node, so that the
 * two ways to name one place compare as equal.
 */
function $boundary(caret: PointCaret<'next'>): PointCaret<'next'> {
  if (!$isTextPointCaret(caret)) return caret
  if (caret.offset === 0) return $rewindSiblingCaret(caret.getSiblingCaret())
  if (caret.offset === caret.origin.getTextContentSize()) {
    return caret.getSiblingCaret()
  }
  return caret
}

/** Whether a caret stands inside a selection, also at one of its ends. */
function $isInside(
  caret: PointCaret<'next'>,
  selection: RangeSelection,
): boolean {
  const range = $caretRangeFromSelection(selection)
  const { anchor, focus } = $getCaretRangeInDirection(range, 'next')
  const drop = $boundary(caret)
  return (
    $comparePointCaretNext($boundary(anchor), drop) <= 0 &&
    $comparePointCaretNext(drop, $boundary(focus)) <= 0
  )
}

/**
 * Puts the nodes of a drop at a caret. The drop of a selection of the field
 * moves it: the selection leaves its place, and its nodes go to the caret,
 * so nothing doubles. A drop inside the selection keeps it as it was. The
 * caret then stands after the dropped nodes.
 */
export function $dropNodes(
  caret: PointCaret<'next'>,
  moved: RangeSelection | null,
  nodes: LexicalNode[],
): void {
  if (moved !== null && $isInside(caret, moved)) return
  // A split text keeps the place of the drop while the moved text leaves.
  const normal = $normalizeCaret(caret)
  const stable = $isTextPointCaret(normal)
    ? $splitAtPointCaretNext(normal)
    : normal
  if (stable === null) return
  const flipped = stable.getFlipped()
  moved?.removeText()
  const at = stable.origin.isAttached() ? stable : flipped
  if (!at.origin.isAttached()) return
  $setSelectionFromCaretRange($getCollapsedCaretRange(at)).insertNodes(nodes)
}
