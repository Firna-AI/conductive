import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  CornerDownLeft,
  FolderGit2,
  GitBranch,
  GitBranchPlus,
  GitPullRequest,
  Paperclip,
} from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { chosenBranch, chosenPullRequest } from '../../fixtures/branches'
import { AttachmentChips } from '../chat/AttachmentChips'
import { MessageField } from '../chat/MessageField'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import dialog from '../common/ConfirmDialog.module.css'
import { ScreenLink } from '../common/ScreenLink'
import {
  BranchPicker,
  pullRequestText,
  type BranchChoice,
  type PickerState,
} from './BranchPicker'
import type { BranchLinks } from './branchScreens'
import styles from './NewWorkspaceDialog.module.css'

/** The repository of the new workspace, as a compact picker. */
function RepositoryPicker(props: { name: string }) {
  return (
    <ActionButton
      accessibilityLabel={`Repository: ${props.name}`}
      icon={FolderGit2}
      menu
      tone="plain"
      trailing={
        <ChevronDown aria-hidden className={styles.chevron} size={13} />
      }
    >
      {props.name}
    </ActionButton>
  )
}

/** What the branch control says and shows for each choice. */
const branchLabels: Readonly<
  Record<BranchChoice, { label: string; icon: LucideIcon }>
> = {
  new: { label: 'New branch', icon: GitBranchPlus },
  existing: { label: chosenBranch.name, icon: GitBranch },
  'pull-request': {
    label: pullRequestText(chosenPullRequest),
    icon: GitPullRequest,
  },
}

/**
 * The branch of the new workspace, as a quiet picker beside the repository:
 * New branch by default. It opens the picker of the dialog with the current
 * choice still checked, where `links` names that screen, and the picker
 * hangs below it when it is open.
 */
function BranchControl(props: {
  choice: BranchChoice
  picker: PickerState
  links: BranchLinks
}) {
  const { label, icon } = branchLabels[props.choice]
  const open = props.picker !== 'closed'
  const to = props.links.picker
  const button = (
    <ActionButton
      accessibilityLabel={`Branch: ${label}`}
      expanded={open}
      icon={icon}
      menu
      tone="plain"
      trailing={
        <ChevronDown aria-hidden className={styles.chevron} size={13} />
      }
    >
      {label}
    </ActionButton>
  )
  return (
    <span className={styles.anchor}>
      {open || to === null ? (
        button
      ) : (
        <ScreenLink asChild to={to}>
          {button}
        </ScreenLink>
      )}
      {open ? (
        <BranchPicker
          choice={props.choice}
          links={props.links}
          placement="below-start"
          state={props.picker}
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
   * The branch of the new workspace, the state of its picker, and the
   * branch links of the dialog, from its full state.
   */
  branch: { choice: BranchChoice; picker: PickerState; links: BranchLinks }
  /** The org and the section that the new workspace joins. */
  place: string
  /** The message and its files. */
  text: string
  attachments: readonly Attachment[]
  placeholder: string
  /** The model and the effort of the first message. */
  choice: AgentChoice
  /**
   * The notices of the New workspace page, above the footer: a failed
   * create, a missing agent login, or an org without repositories.
   */
  notices: readonly ReactNode[]
  /** The message can go, so Create is on. */
  ready: boolean
}

/**
 * New workspace as a wide, compact dialog over the dimmed app, drawn open,
 * for a computer. The repository picker sits at the top left, with the
 * quiet branch picker beside it, and the org
 * and the section of the new workspace at the top right. The message and
 * its files fill the middle, and a pasted link to a workspace of the org
 * shows as a chip, as in the composer. The model picker sits at the bottom
 * left, and the attach button and Create at the bottom right. A phone
 * always opens the page instead.
 */
export function NewWorkspaceDialog(props: NewWorkspaceDialogProps) {
  return (
    <div className={dialog.layer}>
      <div aria-hidden className={dialog.scrim} />
      <section
        aria-label="New workspace"
        aria-modal
        className={styles.dialog}
        role="dialog"
      >
        <div className={styles.header}>
          {props.repository ? (
            <>
              <RepositoryPicker name={props.repository} />
              <BranchControl
                choice={props.branch.choice}
                links={props.branch.links}
                picker={props.branch.picker}
              />
            </>
          ) : null}
          <span className={styles.place}>{props.place}</span>
        </div>
        <div className={styles.body}>
          {props.attachments.length > 0 ? (
            <AttachmentChips attachments={props.attachments} />
          ) : null}
          <MessageField
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
          <CreateButton ready={props.ready} />
        </div>
      </section>
    </div>
  )
}
