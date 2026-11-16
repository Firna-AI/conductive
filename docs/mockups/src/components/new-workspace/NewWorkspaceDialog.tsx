import type { ReactNode } from 'react'
import { ChevronDown, CornerDownLeft } from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { MessageField } from '../chat/MessageField'
import { ModelPicker } from '../chat/ModelPicker'
import {
  actionButton,
  iconButton,
} from '../../entries/components/common/actions.mockup'
import { classes } from '../common/classes'
import dialog from '../common/ConfirmDialog.module.css'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import styles from './NewWorkspaceDialog.module.css'

/**
 * The repository of the new workspace, as a compact picker. `menu` draws
 * its menu open below it.
 */
function RepositoryPicker(props: {
  name: string
  menu?: readonly MenuEntryData[]
}) {
  return (
    <span className={styles.anchor}>
      <actionButton.Component
        accessibilityLabel={`Repository: ${props.name}`}
        expanded={props.menu !== undefined}
        icon="folder-git-2"
        menu
        moklyInstance="repository"
        tone="plain"
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.name}
      </actionButton.Component>
      {props.menu ? (
        <menu.Component
          entries={props.menu}
          label="Repository"
          moklyInstance="repository-menu"
          placement="below-start"
        />
      ) : null}
    </span>
  )
}

/**
 * The org and the section of the new workspace, as a compact picker at the
 * end of the header. `menu` draws its menu of the sections open below it.
 */
function SectionPicker(props: {
  place: string
  section: string
  menu?: readonly MenuEntryData[]
}) {
  return (
    <span className={classes(styles.anchor, styles.placeMenu)}>
      <actionButton.Component
        accessibilityLabel={`Section: ${props.section}`}
        expanded={props.menu !== undefined}
        menu
        moklyInstance="section"
        tone="plain"
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.place}
      </actionButton.Component>
      {props.menu ? (
        <menu.Component
          entries={props.menu}
          label="Section"
          moklyInstance="section-menu"
          placement="below-end"
        />
      ) : null}
    </span>
  )
}

/**
 * Create, with the hint of its key: on a computer, Enter creates the
 * workspace, and Shift+Enter adds a line. Create is off until the message
 * can go.
 */
function CreateButton(props: { ready: boolean }) {
  return (
    <actionButton.Component
      disabled={!props.ready}
      moklyInstance="create-workspace"
      tone={props.ready ? 'primary' : 'secondary'}
      trailing={
        <CornerDownLeft
          aria-hidden
          className={classes(styles.key, props.ready && styles.keyOnSolid)}
          size={13}
        />
      }
    >
      Create
    </actionButton.Component>
  )
}

export type NewWorkspaceDialogProps = {
  /** The chosen repository, or none while the org has chosen none. */
  repository?: string
  /**
   * The repository menu, drawn open: each chosen repository, and a waiting
   * one off with its note, as on the New workspace page.
   */
  repositoryMenu?: readonly MenuEntryData[]
  /** The org and the section that the new workspace joins. */
  place: string
  /** The section that the new workspace joins, such as General. */
  section: string
  /**
   * The section menu, drawn open: each section of the org in the order of
   * the list, with the current one checked. Archived is not a section.
   */
  sectionMenu?: readonly MenuEntryData[]
  /** The message, with a chip for each of its files at its place. */
  text: string
  attachments: readonly Attachment[]
  /**
   * Files hover over the dialog. The whole card is the message box, so its
   * full border shows the drop state, and a drop anywhere on it attaches.
   */
  drop?: boolean
  /**
   * A view runs no script, so this draws the caret at that index of the
   * text: the drop caret while files hover over the dialog.
   */
  caret?: number
  placeholder: string
  /** The model and the effort of the first message. */
  choice: AgentChoice
  /**
   * The notices of the New workspace page, above the footer: a failed
   * create, a repository that waits for its build, a missing agent login,
   * or an org without repositories. Without them, the dialog has no row of
   * notices.
   */
  notices?: ReactNode
  /**
   * The message has text, and it waits for no agent login and no
   * repository. Create is then on, once each file is uploaded.
   */
  ready: boolean
}

/**
 * New workspace as a wide, compact dialog over the dimmed app, drawn open,
 * for a computer. The repository picker sits at the top left, and the org
 * and the section of the new workspace at the top right, as a picker of the
 * section. The message fills
 * the middle, with a chip for each of its files at its place, and a pasted
 * link to a workspace of the org shows as a chip, as in the composer. The
 * model picker sits at the bottom left, and the attach button and Create
 * at the bottom right. The attach button puts each picked file at the
 * caret. The whole card takes a drop of files, and its full border shows
 * the drop state while they hover over it. A phone always opens the page
 * instead. The files show the chips of every composer, and Create waits
 * for their uploads, as Send does.
 */
export function NewWorkspaceDialog(props: NewWorkspaceDialogProps) {
  const uploads = props.attachments.some((file) => file.state !== undefined)
  return (
    <div className={dialog.layer}>
      <div aria-hidden className={dialog.scrim} />
      <section
        aria-label="New workspace"
        aria-modal
        className={classes(styles.dialog, props.drop && styles.dropping)}
        role="dialog"
      >
        <div className={styles.header}>
          {props.repository ? (
            <RepositoryPicker
              menu={props.repositoryMenu}
              name={props.repository}
            />
          ) : null}
          <SectionPicker
            menu={props.sectionMenu}
            place={props.place}
            section={props.section}
          />
        </div>
        <div className={styles.body}>
          <MessageField
            caret={props.caret}
            files={props.attachments}
            lines={7}
            maxLines={14}
            placeholder={props.placeholder}
            text={props.text}
          />
        </div>
        {props.notices === undefined ? null : (
          <div className={styles.notices}>{props.notices}</div>
        )}
        <div className={styles.footer}>
          <ModelPicker choice={props.choice} />
          <span className={styles.spacer} />
          <iconButton.Component
            icon="paperclip"
            label="Attach files"
            moklyInstance="attach-files"
          />
          <CreateButton ready={props.ready && !uploads} />
        </div>
      </section>
    </div>
  )
}
