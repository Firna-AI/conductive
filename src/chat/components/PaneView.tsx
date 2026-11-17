import { memo, type ReactNode, type RefCallback, type RefObject } from 'react'
import styles from '../../../docs/mockups/src/components/workspace/SplitColumn.module.css'
import { ChatDropAreaProvider, useChatDropArea } from './chat-drop-area'
import { CodeCopyProvider, type CopyCode } from './code-copy'
import { paneNames, type ChatProps, type RowProps } from './column-parts'
import type { ComposerFocus } from './Composer'
import type { PaneItem } from './pane-moves'
import { paneFocusHandlers } from './pane-focus'
import type { PanePlan } from './pane-plan'
import { SessionChat } from './SessionChat'
import { SessionTabs } from './SessionTabs'
import { PaneDropMark, type PaneMark } from './TabDragParts'
import type { TabRowDrag } from './useTabDrag'

/** What every pane of the column gets. */
export interface PaneShared {
  row: RowProps
  chat: ChatProps
  copyCode: CopyCode
  /** The request that the message field of the leading chat takes the focus. */
  composerFocus?: ComposerFocus | null
  /** The column draws the bar of the sandbox below both panes. */
  barBelow: boolean
  paneItem: PaneItem
  onFocus: (pane: 0 | 1) => void
  onNew: (pane: 0 | 1) => void
}

/**
 * The page of the host, or the chat of the session of a pane. A drag of a
 * tab draws the column again at each move of the pointer, and changes
 * nothing here, so this part keeps its last drawing.
 */
const PaneContent = memo(function PaneContent(props: {
  page: ReactNode
  chat: ChatProps
  copyCode: CopyCode
  composerFocus: ComposerFocus | null
  barBelow: boolean
  lead: boolean
  sessionId: string | null
}) {
  const { chat, copyCode, composerFocus, barBelow, lead, sessionId } = props
  return (
    props.page ?? (
      <CodeCopyProvider value={copyCode}>
        <SessionChat
          {...chat}
          barBelow={barBelow}
          composerFocus={composerFocus}
          lead={lead}
          sessionId={sessionId}
        />
      </CodeCopyProvider>
    )
  )
})

/**
 * One pane: its tab row, and the page of the host or the chat of its
 * session, with the drop mark of a drag over it. The whole pane is the drop
 * area of its message box, and a pane that shows a page takes no drop of
 * files. A press, a key, or the keyboard focus in the pane makes it the
 * focused pane, except in the parts that keep the focus, as
 * `keepsPaneFocus` says.
 */
export function PaneView({
  plan,
  two,
  focused,
  lead,
  last,
  paneRef,
  share,
  drag,
  mark,
  contentRef,
  children,
  ...shared
}: PaneShared & {
  plan: PanePlan
  /** Two panes show, so the pane and its row have the names of a side. */
  two: boolean
  focused: boolean
  lead: boolean
  /** The row ends with the clock of the session history. */
  last: boolean
  paneRef?: RefObject<HTMLElement | null>
  /** The share of the column that the left pane of a split takes. */
  share: number | null
  /** The drag of the column for the row of the pane. */
  drag: TabRowDrag
  /** The drop mark over the content during a drag, or null. */
  mark: PaneMark | null
  /** The ref of the content, which the drag measures. */
  contentRef: RefCallback<HTMLElement>
  children?: ReactNode
}) {
  const { row, chat, copyCode, composerFocus, barBelow, onFocus, onNew } =
    shared
  const drops = useChatDropArea()
  const names = paneNames[plan.index]
  const focus = paneFocusHandlers(() => onFocus(plan.index))
  return (
    <section
      aria-label={two ? names.pane : undefined}
      className={styles.pane}
      ref={paneRef}
      style={share === null ? undefined : { flex: `0 1 ${share}%` }}
      {...drops.handlers}
      {...focus}
    >
      <ChatDropAreaProvider value={drops.slot}>
        <SessionTabs
          {...row}
          drag={drag}
          focus={two ? (focused ? 'focused' : 'unfocused') : undefined}
          history={last}
          label={two ? names.row : undefined}
          onNew={() => onNew(plan.index)}
          paneItem={shared.paneItem}
          tabs={plan.tabs}
        />
        <div className={styles.content} ref={contentRef}>
          <PaneContent
            barBelow={barBelow}
            chat={chat}
            composerFocus={lead ? (composerFocus ?? null) : null}
            copyCode={copyCode}
            lead={lead}
            page={plan.page}
            sessionId={plan.sessionId}
          />
          {mark ? <PaneDropMark mark={mark} /> : null}
        </div>
      </ChatDropAreaProvider>
      {children}
    </section>
  )
}
