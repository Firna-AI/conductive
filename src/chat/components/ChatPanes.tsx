import { useRef, type ReactNode, type RefObject } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/SplitColumn.module.css'
import type { PaneSplit } from '../../app/pane-split'
import { useStore } from '../../app/store'
import { PaneHandle } from '../../shell/layout/PaneHandle'
import { ChatDropAreaProvider, useChatDropArea } from './chat-drop-area'
import { CodeCopyProvider, type CopyCode } from './code-copy'
import { paneNames, type ChatProps, type RowProps } from './column-parts'
import type { ComposerFocus } from './Composer'
import { keepsPaneFocus, paneFocusHandlers } from './pane-focus'
import type { PanePlan } from './pane-plan'
import { SessionChat } from './SessionChat'
import { SessionTabs } from './SessionTabs'

/** What every pane of the column gets. */
interface PaneShared {
  row: RowProps
  chat: ChatProps
  copyCode: CopyCode
  /** The request that the message field of the leading chat takes the focus. */
  composerFocus?: ComposerFocus | null
  /** The column draws the bar of the sandbox below both panes. */
  barBelow: boolean
  onFocus: (pane: 0 | 1) => void
  onNew: (pane: 0 | 1) => void
}

/**
 * One pane: its tab row, and the page of the host or the chat of its
 * session. The whole pane is the drop area of its message box, and a pane
 * that shows a page takes no drop of files. A press, a key, or the keyboard
 * focus in the pane makes it the focused pane, except in the parts that
 * keep the focus, as `keepsPaneFocus` says.
 */
function PaneView({
  plan,
  two,
  focused,
  lead,
  last,
  paneRef,
  share,
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
          focus={two ? (focused ? 'focused' : 'unfocused') : undefined}
          history={last}
          label={two ? names.row : undefined}
          onNew={() => onNew(plan.index)}
          tabs={plan.tabs}
        />
        <div className={styles.content}>
          {plan.page ?? (
            <CodeCopyProvider value={copyCode}>
              <SessionChat
                {...chat}
                barBelow={barBelow}
                composerFocus={lead ? composerFocus : null}
                lead={lead}
                sessionId={plan.sessionId}
              />
            </CodeCopyProvider>
          )}
        </div>
      </ChatDropAreaProvider>
      {children}
    </section>
  )
}

/**
 * The centre column on desktop: one pane, or two panes side by side (split
 * panes decisions 1 C and 2 A), each with its own tab row, its own +, and
 * its page or chat. The clock of the session history ends the right row.
 * With two panes, the row of the focused pane marks its shown tab, and the
 * other row quiets its shown tab. A divider on the hairline between the
 * panes moves the share of the left pane, which the app keeps. A bar of the
 * sandbox that both panes share shows once, below them, as `footer`. Each
 * pane of a split is a size container, so a chat in a pane narrower than
 * 360 px takes the paddings of a phone. `children` are the overlays.
 */
export function ChatPanes(
  props: PaneShared & {
    plans: readonly PanePlan[]
    /** The focused pane of the saved view. */
    focused: 0 | 1
    /** The pane whose chat leads, as `leadPane` says. */
    lead: 0 | 1 | null
    footer: ReactNode
    split: PaneSplit
    children?: ReactNode
  },
) {
  const { plans, split, footer, children, focused, lead, ...shared } = props
  const panes = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLElement>(null)
  const share = useStore(split.share)
  const two = plans.length > 1
  return (
    <div className={classes(styles.column, two && styles.split)}>
      <div className={styles.panes} ref={panes}>
        {plans.map((plan, at) => (
          <PaneView
            {...shared}
            focused={plan.index === focused}
            key={plan.index}
            last={at === plans.length - 1}
            lead={plan.index === lead}
            paneRef={two && at === 0 ? left : undefined}
            plan={plan}
            share={two && at === 0 ? share : null}
            two={two}
          >
            {two && at === 0 ? (
              <div className={styles.divider} {...keepsPaneFocus}>
                <PaneHandle
                  label="Resize the panes"
                  leftRef={left}
                  panesRef={panes}
                  split={split}
                />
              </div>
            ) : null}
          </PaneView>
        ))}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
      {children}
    </div>
  )
}
