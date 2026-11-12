import {
  $getChildCaretAtIndex,
  $getDOMSlot,
  $getNearestNodeFromDOMNode,
  $getTextPointCaret,
  $isDecoratorNode,
  $isElementNode,
  $isRootNode,
  $isTextNode,
  isDOMTextNode,
  type ElementNode,
  type LexicalEditor,
  type PointCaret,
} from 'lexical'

/** A point of the page, as `clientX` and `clientY` of a pointer event give it. */
export interface FieldPoint {
  x: number
  y: number
}

/** Where the field draws its drop caret on the page. */
export interface CaretBox {
  left: number
  top: number
  height: number
}

/** The caret of the browser at a point: its place in the DOM, and its box. */
interface BrowserCaret {
  node: Node
  offset: number
  rect: DOMRect | null
}

/**
 * Where the browser puts its caret for a point, as for a click there.
 * Chrome, Firefox, and current Safari give `caretPositionFromPoint`, and an
 * older Safari gives only `caretRangeFromPoint`.
 */
function browserCaretAt(doc: Document, point: FieldPoint): BrowserCaret | null {
  if (typeof doc.caretPositionFromPoint === 'function') {
    const position = doc.caretPositionFromPoint(point.x, point.y)
    if (position === null) return null
    const { offsetNode: node, offset } = position
    return { node, offset, rect: position.getClientRect() }
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(point.x, point.y)
    if (range === null) return null
    const { startContainer: node, startOffset: offset } = range
    return { node, offset, rect: range.getClientRects()[0] ?? null }
  }
  return null
}

/** Whether a point is over the text of the field, also over a chip in it. */
function isOverText(editor: LexicalEditor, point: FieldPoint): boolean {
  const root = editor.getRootElement()
  const hit = root?.ownerDocument.elementFromPoint(point.x, point.y)
  return root != null && hit != null && root.contains(hit)
}

/** The caret of the browser at a point over the text of the field, or null. */
function caretOverText(
  editor: LexicalEditor,
  point: FieldPoint,
): BrowserCaret | null {
  const root = editor.getRootElement()
  if (root === null || !isOverText(editor, point)) return null
  const caret = browserCaretAt(root.ownerDocument, point)
  return caret !== null && root.contains(caret.node) ? caret : null
}

/** Whether a point is nearer to the end of an element than to its start. */
function nearerEnd(element: Element, point: FieldPoint): boolean {
  const box = element.getBoundingClientRect()
  return point.x > box.left + box.width / 2
}

/**
 * The caret at a child index of an element. A place in the root, beside
 * its paragraph, goes to the start or the end of that paragraph, so a drop
 * there adds no line.
 */
function $inBlock(parent: ElementNode, index: number): PointCaret<'next'> {
  const block = $isRootNode(parent)
    ? index === 0
      ? parent.getFirstChild()
      : parent.getLastChild()
    : null
  if (!$isElementNode(block)) {
    return $getChildCaretAtIndex(parent, index, 'next')
  }
  const at = index === 0 ? 0 : block.getChildrenSize()
  return $getChildCaretAtIndex(block, at, 'next')
}

/**
 * The caret of the field at a point over its text: where the browser puts
 * its own caret for the point. A point over a chip, which the caret cannot
 * enter, gives the side of the chip that is nearer. Null when the point is
 * not over the text.
 */
export function $caretAtPoint(
  editor: LexicalEditor,
  point: FieldPoint,
): PointCaret<'next'> | null {
  const caret = caretOverText(editor, point)
  const node = caret && $getNearestNodeFromDOMNode(caret.node)
  if (!caret || !node) return null
  if ($isTextNode(node)) {
    const size = node.getTextContentSize()
    const offset = isDOMTextNode(caret.node)
      ? Math.min(caret.offset, size)
      : caret.offset === 0
        ? 0
        : size
    return $getTextPointCaret(node, 'next', offset)
  }
  const element = editor.getElementByKey(node.getKey())
  if (element === null) return null
  if ($isElementNode(node)) {
    const slot = $getDOMSlot(node, element, editor)
    const place = slot.resolveChildIndex(
      node,
      element,
      caret.node,
      caret.offset,
    )
    return $inBlock(...place)
  }
  const parent = node.getParent()
  if (parent === null) return null
  const after = $isDecoratorNode(node) && nearerEnd(element, point)
  return $inBlock(parent, node.getIndexWithinParent() + (after ? 1 : 0))
}

/** The height of a line of the field, or null when its style gives none. */
function lineHeight(root: HTMLElement): number | null {
  const height = parseFloat(getComputedStyle(root).lineHeight)
  return Number.isFinite(height) && height > 0 ? height : null
}

/** A caret box as high as a line, centred on a box in that line. */
function lineBox(left: number, box: DOMRect, line: number | null): CaretBox {
  const height = line ?? box.height
  return { left, top: box.top + box.height / 2 - height / 2, height }
}

/**
 * The box of a caret at a place in an element that the browser gives no
 * box for: the start of the node after the place, the end of the node
 * before it, or the start of the element.
 */
function besideBox(caret: BrowserCaret, line: number | null): CaretBox | null {
  const { node, offset } = caret
  if (!(node instanceof Element)) return null
  const next = node.childNodes[offset]
  const previous = node.childNodes[offset - 1]
  if (next instanceof Element) {
    const box = next.getBoundingClientRect()
    return lineBox(box.left, box, line)
  }
  if (previous instanceof Element) {
    const box = previous.getBoundingClientRect()
    return lineBox(box.right, box, line)
  }
  const box = node.getBoundingClientRect()
  return { left: box.left, top: box.top, height: line ?? box.height }
}

/**
 * Where the field draws its drop caret for a point over its text: where the
 * browser draws its own caret for the point, or at the nearer side of a
 * chip under the point, as `$caretAtPoint` places the files. Null when the
 * point is not over the text.
 */
export function caretBoxAt(
  editor: LexicalEditor,
  point: FieldPoint,
): CaretBox | null {
  const root = editor.getRootElement()
  const caret = caretOverText(editor, point)
  if (root === null || caret === null) return null
  const line = lineHeight(root)
  const chip = editor.read(() => {
    const node = $getNearestNodeFromDOMNode(caret.node)
    return $isDecoratorNode(node) ? editor.getElementByKey(node.getKey()) : null
  })
  if (chip !== null) {
    const box = chip.getBoundingClientRect()
    return lineBox(nearerEnd(chip, point) ? box.right : box.left, box, line)
  }
  if (caret.rect !== null && caret.rect.height > 0) {
    return lineBox(caret.rect.left, caret.rect, line)
  }
  return besideBox(caret, line)
}
