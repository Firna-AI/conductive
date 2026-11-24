import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { literalText } from '../../app/draft-marks'
import { useLatest } from '../components/chip-field/use-latest'
import type { ChatController } from '../state/controller'
import {
  askRequest,
  canSend,
  closedAsk,
  failedAsk,
  movedText,
  nextStart,
  noAsks,
  pressedAsk,
  sentAsk,
  shownStarts,
  withAsk,
  type Asks,
  type UnsentAsk,
} from './ask-state'
import { setHighlights } from './highlights'
import type { ExplainSelection } from './selection'

export interface AskProps {
  controller: ChatController
  /** The shown session. */
  sessionId: string | null
  /**
   * Opens the popover of the explanation that an Ask started. `typing`: the
   * unsent popover showed, so the follow-up field takes the focus from it.
   */
  onStarted: (explanationId: string, typing: boolean) => void
}

/** The unsent Asks of the chat of the shown session tab, as `useAsk` says. */
export interface AskState {
  /** The Ask whose unsent popover shows over the chat, if any. */
  shown: UnsentAsk | null
  /** The start of an Ask waits for its reply. */
  waits: boolean
  /** Opens the unsent popover of an Ask about the selection. */
  press: (selection: ExplainSelection) => void
  change: (text: string) => void
  /** Sends the question, as `useAsk` says. */
  send: () => void
  /** Closes the unsent popover, as `closedAsk` says. */
  close: () => void
}

/**
 * The unsent Asks of the chat, one for each parent session. A press on Ask
 * saves the selection, and the unsent popover opens with an empty field.
 * While it shows, the saved quote keeps a highlight in the colours of a
 * selection. A press, a change, and a close act on the Ask of the shown
 * session, and the outcome of a start acts on the Ask of its own parent
 * session, so the Ask of another session stays as it is.
 *
 * Send empties the field and starts the explanation with the question, and
 * the field takes text while the start waits. The start settles once: when
 * a transcript of the chat shows its written prompt by its ID, or at the
 * reply, whichever comes first. The text typed during the wait then goes
 * into the draft of the new explanation, before the text of that draft,
 * and `onStarted` opens its popover while the parent session shows. A
 * failed start puts the question back before that text, and the popover
 * opens again. A start that failed with no answer or a server error still
 * settles when a transcript shows its written prompt later. A move away
 * from the session of an Ask closes its popover, as `closedAsk` says. The
 * popover shows only over the chat of that session, so a failed start
 * while another session shows opens it when that session shows again.
 */
export function useAsk(props: AskProps): AskState {
  const { controller, sessionId } = props
  const [asks, setAsks] = useState<Asks>(noAsks)
  // The Asks, the shown session, and the callback of the last render, for
  // a reply or an event that comes later.
  const latest = useLatest(asks)
  const shownSession = useLatest(sessionId)
  const onStarted = useLatest(props.onStarted)
  const [scope, setScope] = useState(sessionId)
  if (scope !== sessionId) {
    setScope(sessionId)
    // Only a move away from the session of an Ask closes its popover.
    if (scope !== null) {
      setAsks((current) =>
        withAsk(current, scope, (ask) => ask && closedAsk(ask)),
      )
    }
  }
  const own = sessionId === null ? undefined : asks.get(sessionId)
  const shown = own?.open ? own : null
  const kept = shown?.kept ?? null
  const [owner] = useState(() => ({}))
  useEffect(() => {
    if (!kept) return undefined
    setHighlights(owner, { kept: [kept.range] })
    return () => setHighlights(owner, null)
  }, [owner, kept])
  // The prompt IDs of the starts that settled, so a start settles once.
  const settled = useRef(new Set<string>())
  const settle = (
    parentId: string,
    promptId: string,
    explanationId: string,
  ) => {
    const ask = latest.current.get(parentId)
    if (settled.current.has(promptId) || ask?.start?.promptId !== promptId) {
      return
    }
    settled.current.add(promptId)
    // The field holds plain text, and a draft holds escaped text.
    const text = movedText(ask)
    if (text !== '') {
      controller.addEarlierText(explanationId, literalText(text))
    }
    setAsks((current) =>
      withAsk(current, parentId, (now) =>
        now?.start?.promptId === promptId ? null : now,
      ),
    )
    if (shownSession.current === parentId) {
      onStarted.current(explanationId, ask.open)
    }
  }
  const settles = useLatest(settle)
  // A transcript that shows the written prompt of a start settles it.
  useEffect(
    () =>
      controller.subscribe(() => {
        const snapshot = controller.getSnapshot()
        for (const start of shownStarts(snapshot, latest.current)) {
          settles.current(start.parentId, start.promptId, start.sessionId)
        }
      }),
    [controller, latest, settles],
  )
  const press = useCallback(
    (selection: ExplainSelection) => {
      if (sessionId === null) return
      setAsks((current) =>
        withAsk(current, sessionId, () => pressedAsk(selection, sessionId)),
      )
    },
    [sessionId],
  )
  const change = useCallback(
    (text: string) => {
      if (sessionId === null) return
      setAsks((current) =>
        withAsk(current, sessionId, (ask) => ask && { ...ask, text }),
      )
    },
    [sessionId],
  )
  const close = useCallback(() => {
    if (sessionId === null) return
    setAsks((current) =>
      withAsk(current, sessionId, (ask) => ask && closedAsk(ask)),
    )
  }, [sessionId])
  const send = () => {
    const current =
      sessionId === null ? undefined : latest.current.get(sessionId)
    if (!current || !canSend(current)) return
    const { parentId } = current
    const start = nextStart(current, controller.newPromptId)
    setAsks((asks) => withAsk(asks, parentId, () => sentAsk(current, start)))
    const request = askRequest(current.kept, start)
    void controller.explain(parentId, request).then((outcome) => {
      if (outcome.kind === 'started') {
        settle(parentId, start.promptId, outcome.sessionId)
        return
      }
      if (settled.current.has(start.promptId)) return
      const refused = outcome.kind === 'refused'
      setAsks((asks) =>
        withAsk(asks, parentId, (ask) =>
          ask?.start?.promptId === start.promptId
            ? failedAsk(ask, refused)
            : ask,
        ),
      )
    })
  }
  const waits = useMemo(
    () => [...asks.values()].some((ask) => ask.start?.waits === true),
    [asks],
  )
  return { shown, waits, press, change, send, close }
}
