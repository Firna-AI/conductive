import type { ReactNode } from 'react'
import { CornerDownLeft } from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import {
  CapabilitiesButton,
  type CapabilitiesControl,
} from '../capabilities/CapabilitiesButton'
import { messageField } from '../../entries/components/chat/MessageField.mockup'
import { modelPicker } from '../../entries/components/chat/ModelPicker.mockup'
import type { SessionLogin } from '../../../../../src/ui/components/chat/SessionLogin'
import { sessionLoginLabel } from '../../entries/components/chat/SessionLogin.mockup'
import { defined } from '../../defined'
import {
  actionButton,
  iconButton,
} from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import dialog from '../../../../../src/ui/components/common/ConfirmDialog.module.css'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import card from '../../../../../src/ui/components/common/ModalCard.module.css'
import styles from '../../../../../src/ui/components/new-workspace/NewWorkspaceDialog.module.css'

/**
 * The repository of the new workspace, as a compact picker with no
 * chevron. `menu` draws its menu open below it.
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
 * The section of the new workspace, as a compact picker with no chevron at
 * the end of the header. `menu` draws its menu of the sections open below
 * it.
 */
function SectionPicker(props: {
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
      >
        {props.section}
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
  /**
   * The branch control close right of the repository picker, with its
   * dropdown drawn open below it, as on the New workspace page.
   */
  branch?: ReactNode
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
   * The login that the first message runs on, when it is not the own login
   * of the person, such as the org login: a label after the model picker
   * names it, "Acme's login", as in the composer.
   */
  login?: SessionLogin
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
  /**
   * The Capabilities icon after the attach button, and its control when
   * it is open, above the icon (secrets decision 6).
   */
  capabilities?: CapabilitiesControl
}

/**
 * New workspace as a wide, compact dialog over the dimmed app, drawn open,
 * for a computer. The repository picker and the branch control close
 * right of it sit at the top left, and the section of the new workspace at
 * the top right, as a picker of the section. The pickers show no chevrons.
 * On the default branch the branch control is only a muted icon. The
 * target of a picked branch lives in the dropdown of the branch control, so no line
 * follows the header (decision 309). The message fills the middle, with a
 * chip for each of its files at its place, and a pasted link to a
 * workspace of the org shows as a chip, as in the composer. The attach
 * button, the Capabilities icon, and the model picker sit at the bottom
 * left, with the label of the org login after the model picker when the
 * first message runs on it. Create sits at the bottom right. The attach
 * button puts each picked file at the caret. The whole card takes a drop
 * of files, and its full border shows the drop state while they hover over
 * it. A phone always opens the page instead. The files show the chips of
 * every composer, and Create waits for their uploads, as Send does. A
 * dialog taller than the room of the window keeps its header and its
 * footer, and the message and the notices scroll between them.
 */
export function NewWorkspaceDialog(props: NewWorkspaceDialogProps) {
  const uploads = props.attachments.some((file) => file.state !== undefined)
  return (
    <div className={dialog.layer}>
      <div aria-hidden className={dialog.scrim} />
      <section
        aria-label="New workspace"
        aria-modal
        className={classes(
          styles.dialog,
          card.card,
          props.drop && styles.dropping,
        )}
        role="dialog"
      >
        <div className={classes(styles.header, card.head)}>
          {props.repository ? (
            <span className={styles.source}>
              <RepositoryPicker
                menu={props.repositoryMenu}
                name={props.repository}
              />
              {props.branch}
            </span>
          ) : null}
          <SectionPicker menu={props.sectionMenu} section={props.section} />
        </div>
        <div className={card.body}>
          <div className={styles.body}>
            <messageField.Component
              files={props.attachments}
              lines={7}
              maxLines={14}
              moklyInstance="message-field"
              placeholder={props.placeholder}
              text={props.text}
              {...defined({ caret: props.caret })}
            />
          </div>
          {props.notices === undefined ? null : (
            <div className={styles.notices}>{props.notices}</div>
          )}
        </div>
        <div className={classes(styles.footer, card.foot)}>
          <iconButton.Component
            icon="paperclip"
            label="Attach files"
            moklyInstance="attach-files"
          />
          {props.capabilities ? (
            <CapabilitiesButton
              {...props.capabilities}
              placement="above-start"
            />
          ) : null}
          <modelPicker.Component
            choice={props.choice}
            moklyInstance="model-picker"
          />
          {props.login ? (
            <sessionLoginLabel.Component
              moklyInstance="session-login"
              owner={props.login.owner}
            />
          ) : null}
          <span className={styles.spacer} />
          <CreateButton ready={props.ready && !uploads} />
        </div>
      </section>
    </div>
  )
}
