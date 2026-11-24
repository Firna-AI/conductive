import { useCallback, useEffect, useState } from 'react'
import { literalText } from '../../app/draft-marks'
import { useLatest } from '../components/chip-field/use-latest'
import type { ChatController } from '../state/controller'
import {
  askRequest,
  canSend,
  closedAsk,
  failedAsk,
  pressedAsk,
  sentAsk,
  type UnsentAsk,
} from './ask-state'
import { setHighlights } from './highlights'
import type { ExplainSelection } from './selection'

/** The explanation that the Send of an Ask started. */
export interface StartedAsk {
  id: string
  /**
   * The unsent popover showed at the reply, so the follow-up field of the
   * new popover takes the focus from its field.
   */
  typing: boolean
}

/** The unsent Ask of the chat of the shown session tab, as `useAsk` says. */
export interface AskState {
  /** The Ask whose unsent popover shows over the chat, if any. */
  shown: UnsentAsk | null
  /** The start of an Ask waits for its reply. */
  waits: boolean
  press: (selection: ExplainSelection, parentId: string) => void
  change: (text: string) => void
  /** Sends the question, and gives the new explanation, or null. */
  send: () => Promise<StartedAsk | null>
  /** Closes the unsent popover, as `closedAsk` says. */
  close: () => void
}

/**
 * The unsent Ask of the chat of the shown session tab. A press on Ask saves
 * the selection, and the unsent popover opens with an empty field. While it
 * shows, the saved quote keeps a highlight in the colours of a selection.
 * Send empties the field and starts the explanation with the question, and
 * the field takes text while the start waits. The reply puts that text into
 * the draft of the new explanation. A failed start puts the question back
 * before that text, and the popover opens again. A move away from the
 * session of the Ask closes the popover, as `closedAsk` says. The popover
 * shows only over the chat of that session, so a failed start while
 * another session shows opens it when that session shows again.
 */
export function useAsk(
  controller: ChatController,
  sessionId: string | null,
): AskState {
  const [ask, setAsk] = useState<UnsentAsk | null>(null)
  // The Ask as the last render shows it, for a reply that comes later.
  const latest = useLatest(ask)
  const [scope, setScope] = useState(sessionId)
  if (scope !== sessionId) {
    setScope(sessionId)
    // Only a move away from the session of the Ask closes its popover.
    setAsk((current) =>
      current && current.parentId === scope ? closedAsk(current) : current,
    )
  }
  const shown = ask?.open && ask.parentId === sessionId ? ask : null
  const kept = shown?.kept ?? null
  const [owner] = useState(() => ({}))
  useEffect(() => {
    if (!kept) return undefined
    setHighlights(owner, { kept: [kept.range] })
    return () => setHighlights(owner, null)
  }, [owner, kept])
  const press = useCallback(
    (selection: ExplainSelection, parentId: string) =>
      setAsk(pressedAsk(selection, parentId)),
    [],
  )
  const change = useCallback(
    (text: string) => setAsk((current) => current && { ...current, text }),
    [],
  )
  const close = useCallback(
    () => setAsk((current) => current && closedAsk(current)),
    [],
  )
  const send = useCallback(async (): Promise<StartedAsk | null> => {
    const current = latest.current
    if (!current || !canSend(current)) return null
    setAsk(sentAsk(current))
    const id = await controller.explain(
      current.parentId,
      askRequest(current.kept, current.text),
    )
    if (id === null) {
      setAsk((waiting) => waiting && failedAsk(waiting))
      return null
    }
    // The field of the question holds plain text, and a draft holds the
    // escaped text of a field with attached files.
    const typed = latest.current
    if (typed && typed.text !== '') {
      controller.setDraft(id, literalText(typed.text))
    }
    setAsk(null)
    return { id, typing: typed?.open === true }
  }, [controller, latest])
  return {
    shown,
    waits: ask !== null && ask.question !== null,
    press,
    change,
    send,
    close,
  }
}
