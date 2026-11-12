import type { ReactNode } from 'react'
import {
  ChevronDown,
  CornerDownLeft,
  FolderGit2,
  Paperclip,
} from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { MessageField } from '../chat/MessageField'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import dialog from '../common/ConfirmDialog.module.css'
import { Menu, type MenuEntry } from '../common/Menu'
import styles from './NewWorkspaceDialog.module.css'

/**
 * The repository of the new workspace, as a compact picker. `menu` draws
 * its menu open below it.
 */
function RepositoryPicker(props: {
  name: string
  menu?: readonly MenuEntry[]
}) {
  return (
    <span className={styles.anchor}>
      <ActionButton
        accessibilityLabel={`Repository: ${props.name}`}
        expanded={props.menu !== undefined}
        icon={FolderGit2}
        menu
        tone="plain"
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.name}
      </ActionButton>
      {props.menu ? (
        <Menu entries={props.menu} label="Repository" placement="below-start" />
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
    <ActionButton
      disabled={!props.ready}
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
    </ActionButton>
  )
}

export type NewWorkspaceDialogProps = {
  /** The chosen repository, or none while the org has chosen none. */
  repository?: string
  /**
   * The repository menu, drawn open: each chosen repository, and a waiting
   * one off with its note, as on the New workspace page.
   */
  repositoryMenu?: readonly MenuEntry[]
  /** The org and the section that the new workspace joins. */
  place: string
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
   * or an org without repositories.
   */
  notices: readonly ReactNode[]
  /**
   * The message has text, and it waits for no agent login and no
   * repository. Create is then on, once each file is uploaded.
   */
  ready: boolean
}

/**
 * New workspace as a wide, compact dialog over the dimmed app, drawn open,
 * for a computer. The repository picker sits at the top left, and the org
 * and the section of the new workspace at the top right. The message fills
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
          <span className={styles.place}>{props.place}</span>
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
        {props.notices.length > 0 ? (
          <div className={styles.notices}>{props.notices}</div>
        ) : null}
        <div className={styles.footer}>
          <ModelPicker choice={props.choice} />
          <span className={styles.spacer} />
          <IconButton icon={Paperclip} label="Attach files" />
          <CreateButton ready={props.ready && !uploads} />
        </div>
      </section>
    </div>
  )
}
