import {
  useLayoutEffect,
  useRef,
  useState,
  type DOMAttributes,
  type DragEvent,
  type RefObject,
} from 'react'
import { carriesFiles, droppedItems } from '../../app/file-drags'
import type { FieldHandle } from './chip-field/focus-plugins'
import type { FieldPoint } from './chip-field/point-caret'

export interface ComposerDropOptions {
  /** The field of the box, which puts the chips and draws the drop caret. */
  field: RefObject<FieldHandle | null>
  /**
   * Whether the composer takes changes now, as its field does. While it
   * takes none, the box takes no drop.
   */
  editable: boolean
  /**
   * Attaches the files of a drop to the draft and gives their IDs at once.
   * `folders` names each dropped folder, which the draft does not attach. A
   * drop of folders alone comes here too, with no files.
   */
  attach: (
    files: readonly File[],
    folders: readonly string[],
  ) => readonly string[]
}

/** The drag handlers of the element of a message box. */
type ComposerDropHandlers = Pick<
  DOMAttributes<HTMLElement>,
  'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'
>

export interface ComposerDrop {
  /** Files hover over the box, and a drop there attaches them. */
  dropping: boolean
  handlers: ComposerDropHandlers
}

function pointOf(event: DragEvent): FieldPoint {
  return { x: event.clientX, y: event.clientY }
}

/**
 * The drop of files on a message box: on its text, its bar, and its
 * padding. Only a drag of files takes part, so a drag of text or of a chip
 * in the field stays the drag of the field and of the browser. While files
 * hover over the box, the box shows its drop state, and the field draws its
 * drop caret under a pointer over the text. A drop attaches the files and
 * puts their chips at the place under the pointer, else at the caret of the
 * field, else at the end. The owner names each dropped folder, which it
 * does not attach. While the composer takes no change, the box takes no
 * drop, and the pointer shows that a drop does nothing. The drop state and
 * the drop caret go when the composer stops taking changes, also during a
 * hover. The box cancels each event of a drag of files, so the browser
 * never opens a file.
 */
export function useComposerDrop(options: ComposerDropOptions): ComposerDrop {
  const { field, editable } = options
  const [dropping, setDropping] = useState(false)
  // The elements of the box that the drag entered and has not left yet. A
  // drag enters the next element before it leaves the last one.
  const entered = useRef<EventTarget[]>([])
  // A composer that stops taking changes, such as when its create starts,
  // shows no drop caret, also while files still hover over its text.
  useLayoutEffect(() => {
    if (!editable) field.current?.clearDropCaret()
  }, [editable, field])
  const end = () => {
    entered.current = []
    setDropping(false)
    field.current?.clearDropCaret()
  }
  // Takes a drag of files, with the offer of a copy, or of no drop.
  const offer = (event: DragEvent): boolean => {
    if (!carriesFiles(event.dataTransfer)) return false
    event.preventDefault()
    event.dataTransfer.dropEffect = editable ? 'copy' : 'none'
    setDropping(editable)
    return true
  }
  return {
    dropping: dropping && editable,
    handlers: {
      onDragEnter: (event) => {
        if (offer(event)) entered.current = [...entered.current, event.target]
      },
      onDragOver: (event) => {
        if (offer(event) && editable) {
          field.current?.showDropCaret(pointOf(event))
        }
      },
      onDragLeave: (event) => {
        const box = event.currentTarget
        entered.current = entered.current.filter(
          (target) =>
            target !== event.target &&
            target instanceof Node &&
            box.contains(target),
        )
        if (entered.current.length === 0) end()
      },
      onDrop: (event) => {
        if (!carriesFiles(event.dataTransfer)) return
        event.preventDefault()
        end()
        if (!editable) return
        const { files, folders } = droppedItems(event.dataTransfer)
        field.current?.insertFiles(
          options.attach(files, folders),
          pointOf(event),
        )
      },
    },
  }
}
