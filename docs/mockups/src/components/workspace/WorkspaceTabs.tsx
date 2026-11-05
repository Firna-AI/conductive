import type { ReactNode } from 'react'
import { MockLink } from '@mokly/mokly'
import type { LucideIcon } from 'lucide-react'
import {
  FileCode,
  FileDiff,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { paths } from '../../paths'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import styles from './WorkspaceTabs.module.css'

export type TabKind = 'session' | 'code' | 'markdown' | 'diff'

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
    <MockLink
      aria-current={tab.selected ? 'page' : undefined}
      className={styles.link}
      to={tab.to}
    >
      {props.children}
    </MockLink>
  )
}

function Tab(props: { tab: WorkspaceTab }) {
  const { tab } = props
  const Icon = icons[tab.kind]
  return (
    <li className={classes(styles.tab, tab.selected && styles.selected)}>
      <TabLabel tab={tab}>
        <Icon aria-hidden className={styles.icon} size={13} />
        <span className={styles.title}>{tab.title}</span>
      </TabLabel>
      {tab.kind === 'session' && tab.selected ? (
        <IconButton icon={Pencil} label={`Rename ${tab.title}`} quiet />
      ) : null}
      <span className={styles.close}>
        <IconButton icon={X} label={`Close ${tab.title}`} quiet />
      </span>
    </li>
  )
}

/**
 * The tabs of the centre column: each agent session, then each open file
 * or diff, and + for a new session on the same branch and cloud computer.
 * Every tab closes. The current session can be renamed.
 */
export function WorkspaceTabs(props: { tabs: readonly WorkspaceTab[] }) {
  return (
    <nav aria-label="Sessions and files" className={styles.bar}>
      <ul className={styles.tabs}>
        {props.tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} />
        ))}
      </ul>
      <MockLink asChild to={paths.sessions}>
        <IconButton icon={Plus} label="New session" />
      </MockLink>
    </nav>
  )
}
