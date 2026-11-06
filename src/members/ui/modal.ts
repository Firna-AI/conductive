import {
  useEffect,
  useRef,
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react'

/**
 * Opens a `<dialog>` as a modal when it mounts, and closes it when it
 * unmounts. The browser keeps the focus inside the dialog. Escape and a
 * press on the dimmed page call `onDismiss`. When it opens, the control with
 * `data-autofocus` takes the focus, or else the first control. When the
 * dialog closes, the focus goes back to the element that had it before.
 *
 * The dialog element must have no padding of its own, so that a press on
 * its content never counts as a press on the dimmed page.
 */
export function useModalDialog(
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void,
) {
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previous = document.activeElement
    if (!dialog.open) dialog.showModal()
    // The browser focuses the first control. A marked control goes first.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus()
      }
    }
  }, [ref])
  return {
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      event.preventDefault()
      dismiss.current()
    },
    onClick(event: MouseEvent<HTMLDialogElement>) {
      if (event.target === event.currentTarget) dismiss.current()
    },
  }
}
