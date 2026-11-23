import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import { useLatest } from '../components/chip-field/use-latest'
import type { ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import type { SendingView } from '../state/linked-replies'
import type { MenuPoint } from '../ui/Menu'
import type { ExplainView } from './explain-context'
import { byMessage, explanationsOf, type Explanation } from './explanations'
import { useExplainSelection } from './useExplainSelection'

/** The popover that lies open over the chat of its parent session. */
export interface OpenPopover {
  explanationId: string
  /**
   * The session whose chat the popover shows: the explanation, or a linked
   * session that a follow-up of the popover opened.
   */
  sessionId: string
}

/** The menu of the explanations whose marks overlap at a press. */
interface OpenMarkMenu {
  ids: readonly string[]
  at: MenuPoint
}

export interface ExplainProps {
  snapshot: ChatSnapshot
  controller: ChatController
  /** The shown session, whose chat holds the marks. */
  sessionId: string | null
  readOnly: boolean
  mobile: boolean
}

/** The state of Explain in the chat of the shown session tab. */
export interface ExplainState {
  view: ExplainView | null
  explanations: readonly Explanation[]
  popover: OpenPopover | null
  /** The box of the open mark, which the popover keeps to. */
  anchor: HTMLElement | null
  menu: OpenMarkMenu | null
  openPopover: (explanationId: string) => void
  /**
   * The popover of an explanation as the view that sends a follow-up or Try
   * again, as `SendingView` says. It shows a session only while it lies
   * open on that explanation, so a late reply leaves the popover of another
   * explanation as it is.
   */
  popoverView: (explanationId: string) => SendingView
  closePopover: (focusMark: boolean) => void
  closeMenu: () => void
}

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
 * explanations of that session, the finished selection with Explain by it,
 * its key, and the popover and the menu that lie open. At most one popover
 * is open: the popover of another mark replaces it, and a press on Explain
 * closes it first. It stays while the menu of overlapping marks shows. A
 * change of the shown session closes both.
 */
export function useExplain(props: ExplainProps): ExplainState {
  const { snapshot, controller, sessionId, readOnly } = props
  const chat = useId()
  const [selection, clearSelection] = useExplainSelection(
    chat,
    sessionId !== null && !readOnly,
  )
  const [starting, setStarting] = useState(false)
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
  const openPopover = useCallback(
    (explanationId: string) => {
      setMenu(null)
      setPopover({ explanationId, sessionId: explanationId })
      void controller.readHistory(explanationId)
    },
    [controller],
  )
  const explain = useCallback(() => {
    if (!selection || !sessionId || starting) return
    const { messageId, quote, before, after } = selection
    setPopover(null)
    setStarting(true)
    void controller
      .explain(sessionId, { messageId, quote, before, after })
      .then((id) => {
        setStarting(false)
        if (id === null) return
        document.getSelection()?.removeAllRanges()
        clearSelection()
        openPopover(id)
      })
  }, [controller, selection, sessionId, starting, clearSelection, openPopover])
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
            explain,
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
      explain,
      openPopover,
      openMenu,
      noteGlyph,
    ],
  )
  return {
    view,
    explanations,
    popover,
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
  }
}
