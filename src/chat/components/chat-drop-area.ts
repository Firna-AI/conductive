import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type DragEvent,
} from 'react'
import type { ComposerDropHandlers } from './composer-drop'

/**
 * The slot of the drop area of a chat, which holds the drag handlers of the
 * message box that takes the drops of the area now. `hold` puts the
 * handlers in the slot and gives the function that takes them out again,
 * if they are still there.
 */
interface DropSlot {
  hold: (handlers: ComposerDropHandlers) => () => void
}

const ChatDropSlot = createContext<DropSlot | null>(null)

/** Gives the slot of a drop area to the message box under it. */
export const ChatDropAreaProvider = ChatDropSlot.Provider

/** Whether the target of a drag event is in its element on the page. */
function onElement(event: DragEvent<HTMLElement>): boolean {
  const { target, currentTarget } = event
  return target instanceof Node && currentTarget.contains(target)
}

/**
 * The drop area of a chat, such as its whole column: the session tabs, the
 * transcript, the notices, and the message box. The area gives each drag
 * event on it to the message box under it, so a drop of files anywhere on
 * the area attaches them to that box, as a drop on the box does. Spread
 * `handlers` on the element of the area, and give `slot` to the box through
 * `ChatDropAreaProvider`. While no box shows, the area takes no drag, so the
 * file drop guard of the app keeps the drop from opening a file. A drag
 * event from a portal, such as a dialog over the chat, reaches the area
 * through React but is not on its element, so the area leaves it alone.
 */
export function useChatDropArea(): {
  slot: DropSlot
  handlers: ComposerDropHandlers
} {
  const held = useRef<ComposerDropHandlers | null>(null)
  return useMemo(() => {
    const slot: DropSlot = {
      hold: (handlers) => {
        held.current = handlers
        return () => {
          if (held.current === handlers) held.current = null
        }
      },
    }
    const handlers: ComposerDropHandlers = {
      onDragEnter: (event) => {
        if (onElement(event)) held.current?.onDragEnter?.(event)
      },
      onDragOver: (event) => {
        if (onElement(event)) held.current?.onDragOver?.(event)
      },
      onDragLeave: (event) => {
        if (onElement(event)) held.current?.onDragLeave?.(event)
      },
      onDrop: (event) => {
        if (onElement(event)) held.current?.onDrop?.(event)
      },
    }
    return { slot, handlers }
  }, [])
}

/**
 * Puts the drag handlers of a message box in the drop area around it, and
 * gives the handlers that the box spreads on its own element. In an area,
 * the area hears each drag, so the box spreads none, and each event reaches
 * the box once. Outside an area, the box takes the drops on itself alone.
 */
export function useDropAreaHandlers(
  handlers: ComposerDropHandlers,
): ComposerDropHandlers {
  const slot = useContext(ChatDropSlot)
  // The handlers change at each render, so the slot follows each render.
  useLayoutEffect(() => slot?.hold(handlers))
  return slot ? {} : handlers
}
