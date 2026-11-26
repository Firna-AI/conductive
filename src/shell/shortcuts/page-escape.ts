import { useContext, useEffect, useRef } from 'react'
import { LayersContext, type OpenLayers } from '../ui/layers'
import { ShortcutContext, type ShortcutLayer } from './shortcut-context'
import { focusOf } from './shortcut-listener'

/**
 * The target sits inside an editable element, such as a button of a chip
 * in the message field, which the field marks as not editable.
 */
function insideEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.parentElement?.closest('[contenteditable="true"]') != null
  )
}

/**
 * Escape is free for the page: a first press with no modifier and no
 * composition, from the page and not from a text field, a control inside
 * one, or a terminal, while no menu, dialog, sheet, or recorder is open.
 * The layers count as they are when the press starts, before a handler
 * closes one of them.
 */
function freeEscape(
  event: KeyboardEvent,
  shortcuts: ShortcutLayer | null,
  layers: OpenLayers | null,
): boolean {
  if (event.key !== 'Escape' || event.repeat || event.isComposing) return false
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return false
  }
  if (shortcuts && shortcuts.recorders.size > 0) return false
  if (focusOf(event.target, shortcuts?.terminals ?? new Set()) !== 'page') {
    return false
  }
  if (insideEditable(event.target)) return false
  return !layers?.menuOpen() && !layers?.modalOpen()
}

/**
 * Runs `run` on Escape while it is not null, as the fixed key of the page.
 * Escape is a fixed key, so no keymap holds it. The press counts only when
 * it is free for the page as it starts, and only after every other handler
 * had it: the action waits for the end of the bubble phase of the window,
 * and a handler that calls `preventDefault`, such as the end of a drag,
 * keeps the key. A handler that stops the press keeps it too. The action
 * runs the `run` of the latest render, and it stops the browser's own
 * action of the key.
 */
export function usePageEscape(run: (() => void) | null): void {
  const shortcuts = useContext(ShortcutContext)
  const layers = useContext(LayersContext)
  const latest = useRef(run)
  useEffect(() => {
    latest.current = run
  })
  const active = run !== null
  useEffect(() => {
    if (!active) return undefined
    let pending: KeyboardEvent | null = null
    // Added during the capture phase of each free press, so it runs after
    // every other listener of the window. A press that a handler stops
    // never reaches it, so the next press removes it first.
    const onEnd = (event: KeyboardEvent) => {
      window.removeEventListener('keydown', onEnd)
      if (event !== pending) return
      pending = null
      if (event.defaultPrevented) return
      event.preventDefault()
      latest.current?.()
    }
    const onStart = (event: KeyboardEvent) => {
      window.removeEventListener('keydown', onEnd)
      pending = null
      if (!freeEscape(event, shortcuts, layers)) return
      pending = event
      window.addEventListener('keydown', onEnd)
    }
    window.addEventListener('keydown', onStart, true)
    return () => {
      window.removeEventListener('keydown', onStart, true)
      window.removeEventListener('keydown', onEnd)
    }
  }, [active, shortcuts, layers])
}
