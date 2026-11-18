import { act } from 'react'
import { entryOf, type DraggedFolder } from './folder-entries'

// Drives a drag of files, folders, or text in happy-dom, as Chrome gives it.
// The test DOM has no drag of its own, so these helpers fire its events.

/** A point of the page, as `clientX` and `clientY` of an event give it. */
export interface DragPoint {
  x: number
  y: number
}

/** The kinds of the drag events that a drop target hears. */
export type DragEventType = 'dragenter' | 'dragover' | 'dragleave' | 'drop'

/**
 * The data of a drag of files and folders from the desktop, in their order,
 * as Chrome gives it. Each file and each folder is an item of kind file, and
 * the entry of the item says which it is. A folder comes as an empty file
 * with its name, so its size cannot tell it from an empty file. The types
 * hold `Files`. `text` is plain text beside the files, such as the path that
 * a file manager adds. The test DOM gives neither the entry nor the type
 * `Files`, so the data gets them here.
 */
export function draggedFiles(
  items: readonly (File | DraggedFolder)[],
  text?: string,
): DataTransfer {
  const data = new DataTransfer()
  for (const item of items) {
    data.items.add('folder' in item ? new File([], item.folder) : item)
  }
  items.forEach((item, index) => {
    const entry = entryOf(item)
    Object.defineProperty(data.items[index], 'webkitGetAsEntry', {
      value: () => entry,
    })
  })
  if (text !== undefined) data.setData('text/plain', text)
  const types = text === undefined ? ['Files'] : ['Files', 'text/plain']
  Object.defineProperty(data, 'types', { value: Object.freeze(types) })
  return data
}

/** The data of a drag of text, such as words or a link from another page. */
export function draggedText(text: string, type = 'text/plain'): DataTransfer {
  const data = new DataTransfer()
  data.setData(type, text)
  return data
}

/**
 * Fires a drag event on `target` at `point`, as a browser does while a drag
 * moves and drops. `to` is the element that the pointer moves to, for a
 * `dragleave`. A browser offers a copy at each `dragenter` and `dragover`
 * of files from the desktop, and a listener can change that offer, so
 * `dropEffect` starts as `copy` there. The result is the event, whose
 * `defaultPrevented` says whether a listener took the drag or the drop.
 */
export function fireDrag(
  target: EventTarget,
  type: DragEventType,
  data: DataTransfer,
  options: { point?: DragPoint; to?: EventTarget | null } = {},
): Event {
  const point = options.point ?? { x: 0, y: 0 }
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: type !== 'dragleave',
    clientX: point.x,
    clientY: point.y,
  })
  Object.defineProperty(event, 'dataTransfer', { value: data })
  Object.defineProperty(event, 'relatedTarget', { value: options.to ?? null })
  if (type === 'dragenter' || type === 'dragover') data.dropEffect = 'copy'
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/**
 * Drags the data over `target` and drops it there, at `point`, as a person
 * does with a drag from the desktop: `dragenter`, `dragover`, then `drop`.
 * The result is the drop event.
 */
export function dropOn(
  target: EventTarget,
  data: DataTransfer,
  point?: DragPoint,
): Event {
  fireDrag(target, 'dragenter', data, { point })
  fireDrag(target, 'dragover', data, { point })
  return fireDrag(target, 'drop', data, { point })
}
