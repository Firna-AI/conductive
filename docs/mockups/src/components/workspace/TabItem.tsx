import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileCode,
  FileDiff,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { RenameField } from './RenameField'
import tabDrag from './TabDrag.module.css'
import styles from './WorkspaceTabs.module.css'

/**
 * The kind of a tab, which sets its icon: a session, or the icon that All
 * files gives a code file, a Markdown file, or another file, or a diff.
 */
export type TabKind = 'session' | 'code' | 'markdown' | 'file' | 'diff'

export type WorkspaceTab = {
  key: string
  kind: TabKind
  title: string
  /** The screen that the tab shows, when the mockups draw it. */
  to?: string
  selected: boolean
}

/** The open menu of a tab: beside it, or in a sheet that the screen draws. */
export type OpenTabMenu = { entries: readonly MenuEntry[]; anchored: boolean }

const icons: Readonly<Record<TabKind, LucideIcon>> = {
  session: MessageSquare,
  code: FileCode,
  markdown: FileText,
  file: File,
  diff: FileDiff,
}

function TabContent(props: { tab: WorkspaceTab }) {
  const Icon = icons[props.tab.kind]
  return (
    <>
      <Icon aria-hidden className={styles.icon} size={13} />
      <span className={styles.title}>{props.tab.title}</span>
    </>
  )
}

/** The label of a tab: a link to the screen that it shows, if one exists. */
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

/**
 * One tab of the row: its icon, its title, and its close button. While a
 * drag lasts, the dragged tab stays at its place as a faint copy, which
 * links nowhere. A tab with an open menu shows the menu below it. A tab
 * that renames its session shows the rename field in place of its label
 * and its close button. The field marks the tab, so the tab keeps a fill
 * only when it is the shown tab.
 */
export function TabItem(props: {
  tab: WorkspaceTab
  placeholder?: boolean
  menu?: OpenTabMenu
  renaming?: boolean
}) {
  const { tab, menu } = props
  if (props.renaming) {
    return (
      <li
        className={classes(
          styles.tab,
          tab.selected && styles.selected,
          styles.renaming,
        )}
      >
        <RenameField title={tab.title} />
      </li>
    )
  }
  const content = <TabContent tab={tab} />
  return (
    <li
      className={classes(
        styles.tab,
        tab.selected && styles.selected,
        props.placeholder && tabDrag.placeholder,
        menu && styles.menuOpen,
      )}
    >
      {props.placeholder ? (
        <span className={styles.link}>{content}</span>
      ) : (
        <TabLabel tab={tab}>{content}</TabLabel>
      )}
      <span className={styles.close}>
        <IconButton icon={X} label={`Close ${tab.title}`} quiet />
      </span>
      {menu?.anchored ? (
        <Menu
          entries={menu.entries}
          label={tab.title}
          placement="below-start"
        />
      ) : null}
    </li>
  )
}

/**
 * Where a dragged tab lands: a line between two tabs, and the tab lifted
 * under the pointer. `place` is the place of the tab after the drop, one of
 * `count`.
 */
export function DropPlace(props: {
  tab: WorkspaceTab
  place: number
  count: number
}) {
  return (
    <li className={tabDrag.drop}>
      <span aria-hidden className={tabDrag.line}>
        <span className={tabDrag.lineEnd} />
      </span>
      <div
        aria-hidden
        className={classes(styles.tab, styles.lifted, tabDrag.float)}
      >
        <span className={styles.link}>
          <TabContent tab={props.tab} />
        </span>
      </div>
      <span className={a11y.hidden} role="status">
        Moving {props.tab.title} to place {props.place} of {props.count}
      </span>
    </li>
  )
}
