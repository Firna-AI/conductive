import type { ReactNode } from 'react'
import { ChevronDown, CircleUser, FolderGit2, Paperclip } from 'lucide-react'
import type { IssuePriority, IssueStatus } from '../../fixtures/issues'
import { defaultChoice } from '../../fixtures/agents'
import { MessageField } from '../chat/MessageField'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import dialog from '../common/ConfirmDialog.module.css'
import card from '../new-workspace/NewWorkspaceDialog.module.css'
import { priorityLabels, statusLabels } from './issueCopy'
import { IssueStatusIcon, PriorityIcon } from './IssueStatusIcon'
import styles from './IssueDialog.module.css'

/** A compact picker of the dialog, such as the state or the repository. */
function Picker(props: { label: string; icon: ReactNode; name: string }) {
  return (
    <button
      aria-haspopup="menu"
      aria-label={`${props.label}: ${props.name}`}
      className={styles.picker}
      type="button"
    >
      {props.icon}
      {props.name}
    </button>
  )
}

/** The fields of an issue that the dialog shows filled in. */
export type IssueDraft = {
  title: string
  body: string
  status: IssueStatus
  priority: IssuePriority
  assignee: string
  repository: string
}

/**
 * New issue as a dialog over the dimmed app, in the card of New workspace.
 * `issue` asks for a title and a description, with the state, the
 * priority, the assignee, and the repository as pickers under them. Create
 * issue saves it and starts no cloud computer. Create and start also opens
 * its workspace. `task` is New workspace with one more button: Save as
 * issue keeps the message as an issue, and Start makes the workspace.
 */
export function IssueDialog(props: {
  mode: 'issue' | 'task'
  draft: IssueDraft
  /** The screens that the two buttons open. */
  saveTo: string
  startTo: string
}) {
  const { draft } = props
  const pickers = (
    <>
      <Picker
        icon={<IssueStatusIcon status={draft.status} />}
        label="State"
        name={statusLabels[draft.status]}
      />
      <Picker
        icon={<PriorityIcon priority={draft.priority} />}
        label="Priority"
        name={priorityLabels[draft.priority]}
      />
      <Picker
        icon={<CircleUser aria-hidden size={13} />}
        label="Assignee"
        name={draft.assignee}
      />
    </>
  )
  return (
    <div className={dialog.layer}>
      <div aria-hidden className={dialog.scrim} />
      <section
        aria-label={props.mode === 'issue' ? 'New issue' : 'New workspace'}
        aria-modal
        className={card.dialog}
        role="dialog"
      >
        <div className={card.header}>
          <ActionButton
            accessibilityLabel={`Repository: ${draft.repository}`}
            icon={FolderGit2}
            menu
            tone="plain"
            trailing={
              <ChevronDown aria-hidden className={card.chevron} size={13} />
            }
          >
            {draft.repository}
          </ActionButton>
          <span className={styles.kind}>
            {props.mode === 'issue' ? 'New issue' : 'Acme · Checkout'}
          </span>
        </div>
        {props.mode === 'issue' ? (
          <div className={styles.fields}>
            <span aria-label="Title" className={styles.title} role="textbox">
              {draft.title}
            </span>
            <span
              aria-label="Description"
              className={styles.body}
              role="textbox"
            >
              {draft.body}
            </span>
            <div className={styles.pickers}>{pickers}</div>
          </div>
        ) : (
          <div className={card.body}>
            <MessageField
              lines={5}
              maxLines={12}
              placeholder=""
              text={draft.body}
            />
          </div>
        )}
        <div className={card.footer}>
          <IconButton icon={Paperclip} label="Attach files" />
          {props.mode === 'task' ? (
            <ModelPicker choice={defaultChoice} />
          ) : null}
          {props.mode === 'task' ? (
            <div className={styles.pickers}>{pickers}</div>
          ) : null}
          <span className={card.spacer} />
          <ScreenLink asChild to={props.saveTo}>
            <ActionButton
              tone={props.mode === 'issue' ? 'primary' : 'secondary'}
            >
              {props.mode === 'issue' ? 'Create issue' : 'Save as issue'}
            </ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.startTo}>
            <ActionButton
              tone={props.mode === 'issue' ? 'secondary' : 'primary'}
            >
              {props.mode === 'issue' ? 'Create and start' : 'Start'}
            </ActionButton>
          </ScreenLink>
        </div>
      </section>
    </div>
  )
}
