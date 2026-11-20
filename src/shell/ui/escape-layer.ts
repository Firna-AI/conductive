import { useEffect, useRef } from 'react'

/** The open layers that Escape can close, the newest last. */
const escapeLayers: object[] = []

/**
 * Closes an open layer on Escape. Escape counts in the capture phase,
 * because a text field stops its key events. Escape closes only the newest
 * open layer, such as a menu in a dialog, or the choices of a menu before
 * the menu. An open native dialog, such as a question of the members UI
 * over Settings, closes on Escape by itself, so no layer closes then.
 */
export function useEscapeLayer(open: boolean, close: () => void): void {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    const layer = {}
    escapeLayers.push(layer)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || escapeLayers.at(-1) !== layer) return
      if (document.querySelector('dialog[open]')) return
      event.stopPropagation()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      escapeLayers.splice(escapeLayers.indexOf(layer), 1)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])
}
