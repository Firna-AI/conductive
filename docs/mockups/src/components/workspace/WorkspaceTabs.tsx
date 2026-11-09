import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { LucideIcon } from 'lucide-react'
import {
  FileCode,
  FileDiff,
  FileText,
  History,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { nameLabel } from '../../../../../src/shared/name-label'
import { closedSessions } from '../../fixtures/sessions'
import { paths } from '../../paths'
import { AgentMark } from '../chat/AgentMark'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import styles from './WorkspaceTabs.module.css'

type TabKind = 'session' | 'code' | 'markdown' | 'diff'

export type WorkspaceTab = {
  key: string
  kind: TabKind
  title: string
  /** The screen that the tab shows, when the mockups draw it. */
  to?: string
  selected: boolean
}

const icons: Readonly<Record<TabKind, LucideIcon>> = {
  session: MessageSquare,
  code: FileCode,
  markdown: FileText,
  diff: FileDiff,
}

function TabLabel(props: { tab: WorkspaceTab; children: ReactNode }) {
  const { tab } = props
  if (!tab.to) return <span className={styles.link}>{props.children}</span>
  return (
    <ScreenLink
      aria-current={tab.selected ? 'page' : undefined}
      className={styles.link}
      to={tab.to}
    >
      {props.children}
    </ScreenLink>
  )
}

function Tab(props: { tab: WorkspaceTab; readOnly: boolean }) {
  const { tab } = props
  const Icon = icons[tab.kind]
  return (
    <li className={classes(styles.tab, tab.selected && styles.selected)}>
      <TabLabel tab={tab}>
        <Icon aria-hidden className={styles.icon} size={13} />
        <span className={styles.title}>{tab.title}</span>
      </TabLabel>
      {tab.kind === 'session' && tab.selected && !props.readOnly ? (
        <IconButton icon={Pencil} label={`Rename ${tab.title}`} quiet />
      ) : null}
      <span className={styles.close}>
        <IconButton icon={X} label={`Close ${tab.title}`} quiet />
      </span>
    </li>
  )
}

/**
 * The sessions whose tabs the user closed, the last closed first: the mark
 * of the agent, the title, and the time. Each one reopens as a tab.
 */
export const historyEntries: readonly MenuEntry[] = closedSessions.map(
  (session): MenuEntry => ({
    kind: 'item',
    label: nameLabel(session.title),
    mark: <AgentMark agent={session.agent} />,
    detail: session.closed,
    trailingIcon: RotateCcw,
  }),
)

/** The clock that opens the session history, with its menu when open. */
function HistoryButton(props: { open: boolean; anchored: boolean }) {
  const button = (
    <IconButton
      expanded={props.open}
      icon={History}
      label="Session history"
      menu
    />
  )
  return (
    <span className={styles.anchor}>
      {props.open ? (
        button
      ) : (
        <ScreenLink asChild to={paths.sessionHistory}>
          {button}
        </ScreenLink>
      )}
      {props.open && props.anchored ? (
        <Menu
          entries={historyEntries}
          label="Session history"
          placement="below-end"
          wide
        />
      ) : null}
    </span>
  )
}

/**
 * The tabs of the centre column: each agent session, then each open file
 * or diff, + for a new session on the same branch and cloud computer, and
 * the clock of the session history. Every tab closes. The current session
 * can be renamed. `historyOpen` draws the history open, beside the clock or,
 * on a phone, as a sheet that the screen draws. On a phone the current tab
 * shrinks too, so that every tab keeps some of its title.
 */
export function WorkspaceTabs(props: {
  tabs: readonly WorkspaceTab[]
  viewport: Viewport
  historyOpen?: boolean
  /** An archived workspace: no new session, and no rename. */
  readOnly?: boolean
}) {
  const readOnly = props.readOnly ?? false
  const phone = props.viewport === 'mobile'
  return (
    <nav
      aria-label="Sessions and files"
      className={classes(styles.bar, phone && styles.phone)}
    >
      <ul className={styles.tabs}>
        {props.tabs.map((tab) => (
          <Tab key={tab.key} readOnly={readOnly} tab={tab} />
        ))}
      </ul>
      {readOnly ? null : (
        <ScreenLink asChild to={paths.sessions}>
          <IconButton icon={Plus} label="New session" />
        </ScreenLink>
      )}
      <HistoryButton anchored={!phone} open={props.historyOpen ?? false} />
    </nav>
  )
}
