import { useCallback, useEffect, useState } from 'react'
import { copyRuns } from '../links/mention-copy'
import { explainableSelection, type ExplainSelection } from './selection'

/** The time between two reads while a copy of chat text runs, in ms. */
const copyWait = 50

/** The same selection, so Explain keeps its place. */
function same(left: ExplainSelection | null, right: ExplainSelection | null) {
  if (left === null || right === null) return left === right
  return (
    left.messageId === right.messageId &&
    left.quote === right.quote &&
    left.before === right.before &&
    left.after === right.after
  )
}

/** The focus is on Explain, which Tab reaches from the selection. */
function onExplain(): boolean {
  const focus = document.activeElement
  return (
    focus instanceof Element && focus.closest('[data-explain-button]') !== null
  )
}

/**
 * The finished selection that Explain can explain in the chat whose
 * messages carry `chat`, or null. A selection that a pointer still draws
 * is not finished, so Explain shows when the pointer lets go. A selection
 * that the keyboard makes shows Explain at once. While the focus is on
 * Explain, the last selection stays, so Tab and a press keep it.
 */
export function useExplainSelection(
  chat: string,
  enabled: boolean,
): [ExplainSelection | null, () => void] {
  const [selection, setSelection] = useState<ExplainSelection | null>(null)
  useEffect(() => {
    if (!enabled) return undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let pressing = false
    const read = () => {
      timer = undefined
      if (pressing) return
      if (copyRuns()) {
        timer = setTimeout(read, copyWait)
        return
      }
      const next = explainableSelection(document.getSelection(), chat)
      setSelection((current) => {
        if (next === null && current !== null && onExplain()) return current
        return same(current, next) ? current : next
      })
    }
    const later = () => {
      if (timer === undefined) timer = setTimeout(read, 0)
    }
    const press = (event: PointerEvent) => {
      if (event.isPrimary && event.pointerType === 'mouse') pressing = true
    }
    const release = () => {
      pressing = false
      later()
    }
    document.addEventListener('selectionchange', later)
    document.addEventListener('pointerdown', press, true)
    document.addEventListener('pointerup', release, true)
    later()
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', later)
      document.removeEventListener('pointerdown', press, true)
      document.removeEventListener('pointerup', release, true)
    }
  }, [chat, enabled])
  const clear = useCallback(() => setSelection(null), [])
  return [enabled ? selection : null, clear]
}
