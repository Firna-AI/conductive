import { act } from 'react'
import { afterEach } from 'vitest'
import {
  $createRangeSelection,
  $getRoot,
  $setSelection,
  getNearestEditorFromDOMNode,
  type LexicalEditor,
} from 'lexical'
import type { FieldPoint } from './point-caret'

// Drives the clipboard, the drags, and the selection of a message field in
// happy-dom, and lays out a point of the page, which happy-dom cannot.

/** The editor of a field, to arrange a selection that happy-dom cannot. */
export function editorOf(field: HTMLElement): LexicalEditor {
  const editor = getNearestEditorFromDOMNode(field)
  if (!editor) throw new Error('The field has no editor.')
  return editor
}

/**
 * Selects text of the field, from `anchor` to `focus` in the text that holds
 * `text`, as a mouse does. A focus before the anchor selects backward.
 */
export function selectText(
  field: HTMLElement,
  text: string,
  anchor: number,
  focus: number,
) {
  act(() =>
    editorOf(field).update(
      () => {
        const node = $getRoot()
          .getAllTextNodes()
          .find((item) => item.getTextContent().includes(text))
        if (!node) throw new Error(`The field holds no text "${text}".`)
        const selection = $createRangeSelection()
        selection.anchor.set(node.getKey(), anchor, 'text')
        selection.focus.set(node.getKey(), focus, 'text')
        $setSelection(selection)
      },
      { discrete: true },
    ),
  )
}

/** Commits the pending change of the field, as a browser does. */
function commit(field: HTMLElement): void {
  editorOf(field).update(() => undefined, { discrete: true })
}

/**
 * Copies or cuts the selection of the field, as Ctrl+C or Ctrl+X does. The
 * result is the plain text that the clipboard takes.
 */
export function clip(field: HTMLElement, kind: 'copy' | 'cut'): string {
  const data = new DataTransfer()
  act(() => {
    field.dispatchEvent(
      new ClipboardEvent(kind, {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    )
    commit(field)
  })
  return data.getData('text/plain')
}

/** A drag event at a point, as a browser sends it. happy-dom has none. */
function dragEvent(type: string, data: DataTransfer, point: FieldPoint) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
  })
  Object.defineProperty(event, 'dataTransfer', { value: data })
  return event
}

/**
 * Drags the selection of the field and drops it at a point of the field,
 * as a mouse does. The result is the data of the drag and the drop event.
 */
export function dragSelection(field: HTMLElement, point: FieldPoint) {
  const data = new DataTransfer()
  const drop = dragEvent('drop', data, point)
  act(() => {
    field.dispatchEvent(dragEvent('dragstart', data, point))
    field.dispatchEvent(drop)
    field.dispatchEvent(dragEvent('dragend', data, point))
    commit(field)
  })
  return { data, drop }
}

const stubs = ['elementFromPoint', 'caretPositionFromPoint'] as const

afterEach(() => {
  for (const name of stubs) Reflect.deleteProperty(document, name)
})

/**
 * Lays out one point of the page, which happy-dom cannot: the element under
 * it, and the place and the box of the caret of the browser there. The
 * result is the point.
 */
export function layOutPoint(place: {
  over: Element
  node: Node
  offset: number
  box?: DOMRect
}): FieldPoint {
  const caret = {
    offsetNode: place.node,
    offset: place.offset,
    getClientRect: () => place.box ?? null,
  }
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => place.over,
  })
  Object.defineProperty(document, 'caretPositionFromPoint', {
    configurable: true,
    value: () => caret,
  })
  return { x: 1, y: 1 }
}

/** The DOM text of the field that holds `text`, outside each chip. */
export function textNode(field: HTMLElement, text: string): Text {
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const chip = node.parentElement?.closest('[contenteditable="false"]')
    const inChip = chip != null && chip !== field
    if (node instanceof Text && !inChip && node.data.includes(text)) return node
  }
  throw new Error(`The field shows no text "${text}".`)
}
