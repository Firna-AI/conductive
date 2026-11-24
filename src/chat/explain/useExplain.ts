import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import { useLatest } from '../components/chip-field/use-latest'
import type { MenuPoint } from '../ui/Menu'
import type { ExplainView, StartWait } from './explain-context'
import type {
  ExplainProps,
  ExplainState,
  OpenMarkMenu,
  OpenPopover,
} from './explain-state'
import { byMessage, explanationsOf } from './explanations'
import { useAsk } from './useAsk'
import { useExplainSelection } from './useExplainSelection'

/**
 * The same list as the last render while its content is the same, so a
 * new chat snapshot that changes no explanation keeps the marks as they
 * are. An explanation is plain data, so its JSON names its content.
 */
function useSameList<T>(list: readonly T[]): readonly T[] {
  const key = JSON.stringify(list)
  const [kept, setKept] = useState({ key, list })
  if (kept.key === key) return kept.list
  setKept({ key, list })
  return list
}

/**
 * Explain in the chat of the shown session tab: the marks of the
 * explanations of that session, the finished selection with Explain and Ask
 * by it, the key of Explain, the unsent Ask of `useAsk`, and the popover and
 * the menu that lie open. At most one popover is open, also when it is the
 * unsent popover: the popover of another mark replaces it, and a press on
 * Explain or on Ask closes it first. It stays while the menu of overlapping
 * marks shows. While a start waits, neither Explain nor Ask starts another.
 * A change of the shown session closes the popover and the menu.
 */
export function useExplain(props: ExplainProps): ExplainState {
  const { snapshot, controller, sessionId, readOnly } = props
  const chat = useId()
  const [selection, clearSelection] = useExplainSelection(
    chat,
    sessionId !== null && !readOnly,
  )
  const asking = useAsk(controller, sessionId)
  const [explaining, setExplaining] = useState(false)
  const [popover, setPopover] = useState<OpenPopover | null>(null)
  // The popover that lies open now, for a reply that comes later.
  const latest = useLatest(popover)
  const [menu, setMenu] = useState<OpenMarkMenu | null>(null)
  const [scope, setScope] = useState(sessionId)
  if (scope !== sessionId) {
    setScope(sessionId)
    setPopover(null)
    setMenu(null)
  }
  const glyphs = useRef(new Map<string, HTMLElement>())
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const explanations = useSameList(
    useMemo(
      () => (sessionId ? explanationsOf(snapshot, sessionId, readOnly) : []),
      [snapshot, sessionId, readOnly],
    ),
  )
  const marks = useMemo(() => byMessage(explanations), [explanations])
  const starting: StartWait = explaining
    ? 'explain'
    : asking.waits
      ? 'ask'
      : null
  const { press: pressAsk, send: sendAsk, close: closeAsk } = asking
  const showPopover = useCallback(
    (explanationId: string, focusField: boolean) => {
      setMenu(null)
      closeAsk()
      setPopover({ explanationId, sessionId: explanationId, focusField })
      void controller.readHistory(explanationId)
    },
    [controller, closeAsk],
  )
  const openPopover = useCallback(
    (explanationId: string) => showPopover(explanationId, false),
    [showPopover],
  )
  const explain = useCallback(() => {
    if (!selection || !sessionId || starting !== null) return
    const { messageId, quote, before, after } = selection
    setPopover(null)
    closeAsk()
    setExplaining(true)
    void controller
      .explain(sessionId, { messageId, quote, before, after })
      .then((id) => {
        setExplaining(false)
        if (id === null) return
        document.getSelection()?.removeAllRanges()
        clearSelection()
        openPopover(id)
      })
  }, [
    controller,
    selection,
    sessionId,
    starting,
    clearSelection,
    openPopover,
    closeAsk,
  ])
  // The press saves the selection first. The field of the unsent popover
  // then takes the focus, which ends the selection of the page, so the
  // press ends it at once, with its handles and menu on a phone.
  const ask = useCallback(() => {
    if (!selection || !sessionId || starting !== null) return
    pressAsk(selection, sessionId)
    setPopover(null)
    setMenu(null)
    document.getSelection()?.removeAllRanges()
    clearSelection()
  }, [selection, sessionId, starting, clearSelection, pressAsk])
  const sendQuestion = useCallback(() => {
    void sendAsk().then((started) => {
      if (started) showPopover(started.id, started.typing)
    })
  }, [sendAsk, showPopover])
  useShortcutOffer('explain-selection', selection ? explain : null)
  const noteGlyph = useCallback((id: string, element: HTMLElement | null) => {
    if (element) glyphs.current.set(id, element)
    else glyphs.current.delete(id)
  }, [])
  const openMenu = useCallback(
    (ids: readonly string[], at: MenuPoint) => setMenu({ ids, at }),
    [],
  )
  const floating = !props.mobile && !readOnly
  const open = popover?.explanationId ?? null
  const kept = asking.shown?.kept ?? null
  // One view while nothing in it changes, so the marked messages of the
  // chat do not draw again for each streamed part of an answer.
  const view = useMemo<ExplainView | null>(
    () =>
      sessionId
        ? {
            chat,
            marks,
            selection,
            floating,
            starting,
            open,
            kept,
            explain,
            ask,
            openPopover,
            openMenu,
            noteGlyph,
            noteAnchor: setAnchor,
          }
        : null,
    [
      sessionId,
      chat,
      marks,
      selection,
      floating,
      starting,
      open,
      kept,
      explain,
      ask,
      openPopover,
      openMenu,
      noteGlyph,
    ],
  )
  return {
    view,
    explanations,
    popover,
    unsent: asking.shown,
    anchor,
    menu,
    openPopover,
    popoverView: (explanationId) => ({
      shows: (sessionId) => {
        const open = latest.current
        return (
          open?.explanationId === explanationId && open.sessionId === sessionId
        )
      },
      show: (sessionId) =>
        setPopover((current) =>
          current?.explanationId === explanationId
            ? { ...current, sessionId }
            : current,
        ),
    }),
    closePopover: (focusMark) => {
      const id = popover?.explanationId
      setPopover(null)
      if (focusMark && id) glyphs.current.get(id)?.focus()
    },
    closeMenu: () => setMenu(null),
    changeQuestion: asking.change,
    sendQuestion,
    closeAsk,
  }
}
