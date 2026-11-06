import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react'

/**
 * Asks a dialog, a sheet, or a menu to close. While its action runs, the
 * request is refused, so the person sees how the action ends: its result or
 * its error shows in the open control. Returns whether it closed.
 */
export function requestClose(busy: boolean, close: () => void): boolean {
  if (busy) return false
  close()
  return true
}

/**
 * The close request of the dialog around a control, such as the dialog's
 * own Cancel button. Outside a dialog it refuses.
 */
export const DialogClose = createContext<() => boolean>(() => false)

/**
 * Opens a `<dialog>` as a modal when it mounts, and closes it when it
 * unmounts. The browser keeps the focus inside the dialog. When it opens,
 * the control with `data-autofocus` takes the focus, or else the first
 * control. When it closes, the focus goes back to the element that had it
 * before.
 *
 * Every request to close goes through `dismiss`: a Cancel button, Escape, a
 * press on the dimmed page, and a close by the browser itself, which can
 * close the dialog without a `cancel` event that the page can prevent. While
 * `busy`, `dismiss` refuses. A dialog that the browser closed then opens
 * again, with the focus where it was. An unmount is no request to close.
 *
 * The dialog element must have no padding of its own, so that a press on
 * its content never counts as a press on the dimmed page.
 */
export function useModalDialog(
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void,
  busy = false,
) {
  const latest = useRef({ onDismiss, busy })
  // A layout effect, so a request after this render sees its busy state.
  useLayoutEffect(() => {
    latest.current = { onDismiss, busy }
  })
  const dismiss = useCallback(
    () => requestClose(latest.current.busy, latest.current.onDismiss),
    [],
  )
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement
    let focused: Element | null = null
    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Element) focused = event.target
    }
    // The browser has closed the dialog already. A refused close opens it
    // again, with the focus on the control that had it.
    function onClose() {
      // A browser queues the close event. The close of an earlier cleanup,
      // such as in StrictMode, can arrive after the dialog opened again.
      if (!dialog || dialog.open) return
      if (dismiss()) return
      dialog.showModal()
      const back =
        focused?.isConnected && dialog.contains(focused)
          ? focused
          : dialog.querySelector('[data-autofocus]')
      if (back instanceof HTMLElement) back.focus()
    }
    dialog.addEventListener('focusin', onFocusIn)
    dialog.addEventListener('close', onClose)
    if (!dialog.open) dialog.showModal()
    // The browser focuses the first control. A marked control goes first.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      // The listener goes first, so this close is no request to close.
      dialog.removeEventListener('close', onClose)
      dialog.removeEventListener('focusin', onFocusIn)
      if (dialog.open) dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus()
      }
    }
  }, [ref, dismiss])
  return {
    dismiss,
    /** Escape, or another close request of the browser that it can cancel. */
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      event.preventDefault()
      dismiss()
    },
    /** A press on the dimmed page around the content. */
    onClick(event: MouseEvent<HTMLDialogElement>) {
      if (event.target === event.currentTarget) dismiss()
    },
  }
}
