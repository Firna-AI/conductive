import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  File,
  FileCode,
  FileDiff,
  FileText,
  Globe,
  MessageSquare,
  SquareSlash,
  SquareTerminal,
} from 'lucide-react'
import { menu as menuPart } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { ScreenLink } from '../common/ScreenLink'
import { iconButton } from '../../entries/components/common/actions.mockup'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import { renameField } from '../../entries/components/workspace/RenameField.mockup'
import { sessionTabIcon } from '../../entries/components/workspace/SessionTabIcon.mockup'
import { defined } from '../../defined'
import tabDrag from '../../../../../src/ui/components/workspace/TabDrag.module.css'
import styles from '../../../../../src/ui/components/workspace/WorkspaceTabs.module.css'

/**
 * The kind of a tab, which sets its icon: a session, or the icon that All
 * files gives a code file, a Markdown file, or another file, or a diff, or
 * a terminal of the Terminal tool, or the one Preview tab of the centre
 * row (decision 288), or a skill, with the skill icon of its chip (skill
 * tab decision 1 B).
 */
export type TabKind =
  | 'session'
  | 'code'
  | 'markdown'
  | 'file'
  | 'diff'
  | 'terminal'
  | 'preview'
  | 'skill'

export type WorkspaceTab = {
  key: string
  kind: TabKind
  title: string
  /** The screen that the tab shows, when the mockups draw it. */
  to?: string
  selected: boolean
  running?: boolean
  /**
   * The session of the tab holds an open request, so its tab shows the
   * needs-input mark in place of its icon or its spinner (needs-input
   * decision 2 B).
   */
  needsInput?: boolean
  /**
   * The temporary tab, from decision 284: the next press on a file, a diff,
   * or a skill replaces it (skill tab decision 2 A). Only its title
   * changes, in italics.
   */
  temporary?: boolean
  /**
   * The label of the file can hide a secret value: it holds "[redacted]",
   * or the app does not know the name of the file yet. Its menu then
   * leaves out Copy path.
   */
  hidesPath?: boolean
}

/** The open menu of a tab: beside it, or in a sheet that the screen draws. */
export type OpenTabMenu = {
  entries: readonly MenuEntryData[]
  anchored: boolean
}

const icons: Readonly<Record<TabKind, LucideIcon>> = {
  session: MessageSquare,
  code: FileCode,
  markdown: FileText,
  file: File,
  diff: FileDiff,
  terminal: SquareTerminal,
  preview: Globe,
  skill: SquareSlash,
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
      {tab.kind === 'session' ? (
        <sessionTabIcon.Component
          moklyInstance="session-icon"
          running={tab.running ?? false}
          {...defined({ needsInput: tab.needsInput })}
        />
      ) : (
        <Icon aria-hidden className={styles.icon} size={13} />
      )}
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
  const close = (
    <iconButton.Component
      icon="x"
      label={`Close ${tab.title}`}
      moklyInstance="close"
      quiet
    />
  )
  if (props.renaming) {
    return (
      <li
        className={classes(
          styles.tab,
          tab.selected && styles.selected,
          styles.renaming,
        )}
      >
        <renameField.Component title={tab.title} />
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
        <menuPart.Component
          entries={menu.entries}
          label={tab.title}
          moklyInstance="menu"
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
