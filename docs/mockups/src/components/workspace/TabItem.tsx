import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileCode,
  FileDiff,
  FileText,
  MessageSquare,
  SquareTerminal,
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
 * files gives a code file, a Markdown file, or another file, or a diff, or
 * a terminal of the Terminal tool.
 */
export type TabKind =
  'session' | 'code' | 'markdown' | 'file' | 'diff' | 'terminal'

export type WorkspaceTab = {
  key: string
  kind: TabKind
  title: string
  /** The screen that the tab shows, when the mockups draw it. */
  to?: string
  selected: boolean
  /**
   * The temporary tab, from decision 284: the next press on a file or a
   * diff replaces its file. Only its title changes, in italics.
   */
  temporary?: boolean
}

/** The open menu of a tab: beside it, or in a sheet that the screen draws. */
export type OpenTabMenu = { entries: readonly MenuEntry[]; anchored: boolean }

const icons: Readonly<Record<TabKind, LucideIcon>> = {
  session: MessageSquare,
  code: FileCode,
  markdown: FileText,
  file: File,
  diff: FileDiff,
  terminal: SquareTerminal,
}

/**
 * The icon and the title of a tab, in the row and on the lifted copy of a
 * drag. The title of the temporary tab shows in italics, and a screen
 * reader hears "temporary" after it, because the italics carry the state
 * only for the eye. The tab menu and the move messages keep the title.
 */
function TabContent(props: { tab: WorkspaceTab }) {
  const { tab } = props
  const Icon = icons[tab.kind]
  return (
    <>
      <Icon aria-hidden className={styles.icon} size={13} />
      <span
        className={classes(styles.title, tab.temporary && styles.temporary)}
      >
        {tab.title}
      </span>
      {tab.temporary ? <span className={a11y.hidden}>, temporary</span> : null}
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
 * links nowhere. The temporary tab keeps its italics in both copies of a
 * drag. A tab with an open menu shows the menu below it. A tab
 * that renames its session shows the rename field in place of its label
 * and its close button. The field marks the tab, so the tab keeps a fill
 * only when it is the shown tab. A tab that cannot close, such as the last
 * terminal of a workspace, has no close button. `closeTo` is the screen
 * that the close button opens, such as the question before the close.
 */
export function TabItem(props: {
  tab: WorkspaceTab
  placeholder?: boolean
  menu?: OpenTabMenu
  renaming?: boolean
  closable?: boolean
  closeTo?: string
}) {
  const { tab, menu } = props
  const closable = props.closable ?? true
  const close = <IconButton icon={X} label={`Close ${tab.title}`} quiet />
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
        !closable && styles.kept,
      )}
    >
      {props.placeholder ? (
        <span className={styles.link}>{content}</span>
      ) : (
        <TabLabel tab={tab}>{content}</TabLabel>
      )}
      {closable ? (
        <span className={styles.close}>
          {props.closeTo ? (
            <ScreenLink asChild to={props.closeTo}>
              {close}
            </ScreenLink>
          ) : (
            close
          )}
        </span>
      ) : null}
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
 * The tab under the pointer during a drag: a raised card with its whole
 * title. `className` places it, at a line of the row or over the content of
 * a pane.
 */
export function LiftedTab(props: { tab: WorkspaceTab; className: string }) {
  return (
    <div
      aria-hidden
      className={classes(styles.tab, styles.lifted, props.className)}
    >
      <span className={styles.link}>
        <TabContent tab={props.tab} />
      </span>
    </div>
  )
}

/**
 * Where a dragged tab lands: a line between two tabs, and the tab lifted
 * under the pointer. `status` tells a screen reader the place of the tab
 * after the drop, as `moveStatus` words it.
 */
export function DropPlace(props: { tab: WorkspaceTab; status: string }) {
  return (
    <li className={tabDrag.drop}>
      <span aria-hidden className={tabDrag.line}>
        <span className={tabDrag.lineEnd} />
      </span>
      <LiftedTab className={tabDrag.float} tab={props.tab} />
      <span className={a11y.hidden} role="status">
        {props.status}
      </span>
    </li>
  )
}
