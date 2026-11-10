import { useEffect, useRef } from 'react'

/**
 * The control that opened a dialog, such as the New workspace row: the
 * element that has the focus when the dialog first shows. Call it before
 * the modal layer of the dialog, so that its effect runs before the layer
 * moves the focus in. The first run keeps the control. In development,
 * StrictMode runs the effects of a new dialog again, after the message
 * field took the focus back as its editor attached again, so a second run
 * keeps the first control. The result gives the focus back to that
 * control while it is on the page, as the `returnFocus` of the layer.
 */
export function useOpener(): () => void {
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const active = document.activeElement
    if (opener.current !== null || !(active instanceof HTMLElement)) return
    if (active !== document.body) opener.current = active
  }, [])
  return () => {
    const control = opener.current
    if (control?.isConnected) control.focus()
  }
}
