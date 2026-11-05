import type { Viewport } from '@mokly/mokly'
import {
  Archive,
  CircleCheck,
  FileDiff,
  GitCommitHorizontal,
} from 'lucide-react'
import { unpushedWork } from '../../fixtures/archive'
import { pullRequest } from '../../fixtures/pullRequests'
import type { Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import styles from './ArchiveDialog.module.css'

const kept = 'The chat stays in Archived, where you can read it.'

/** The work that the check found, which is not on GitHub yet. */
function UnpushedList(props: { branch: string }) {
  const { files, commits } = unpushedWork
  return (
    <ul aria-label="Work that is not pushed" className={styles.list}>
      {files.map((file) => (
        <li className={styles.item} key={file}>
          <FileDiff aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>{file}</span>
          <span className={styles.detail}>not committed</span>
        </li>
      ))}
      <li className={styles.item}>
        <GitCommitHorizontal aria-hidden className={styles.icon} size={14} />
        <span className={styles.path}>
          {commits} {commits === 1 ? 'commit' : 'commits'}
        </span>
        <span className={styles.detail}>not pushed to {props.branch}</span>
      </li>
    </ul>
  )
}

/**
 * The question of Archive, after the check for work that is not pushed.
 * Archive deletes the cloud computer and keeps the chat read-only. With
 * unpushed work the dialog lists it, and archiving deletes it. Cancel
 * leaves the workspace as it was, so the user can push first.
 */
export function ArchiveDialog(props: {
  workspace: Workspace
  pushed: boolean
  viewport: Viewport
}) {
  const { workspace } = props
  const cancel = (
    <ScreenLink asChild to={paths.app}>
      <ActionButton>Cancel</ActionButton>
    </ScreenLink>
  )
  if (props.pushed) {
    return (
      <ConfirmDialog
        actions={
          <>
            {cancel}
            <ScreenLink asChild to={paths.archived}>
              <ActionButton icon={Archive} tone="primary">
                Archive
              </ActionButton>
            </ScreenLink>
          </>
        }
        title={`Archive ${workspace.name}?`}
        viewport={props.viewport}
      >
        <StatusText
          icon={CircleCheck}
          label={`Everything is pushed, and #${pullRequest.number} is merged`}
          tone="success"
        />
        <DialogText>Archive deletes the cloud computer. {kept}</DialogText>
      </ConfirmDialog>
    )
  }
  return (
    <ConfirmDialog
      actions={
        <>
          {cancel}
          <ScreenLink asChild to={paths.archived}>
            <ActionButton icon={Archive} tone="danger">
              Archive anyway
            </ActionButton>
          </ScreenLink>
        </>
      }
      title="Archive with work that is not pushed?"
      viewport={props.viewport}
    >
      <DialogText>
        Archive deletes the cloud computer of {workspace.name}, with this work:
      </DialogText>
      <UnpushedList branch={workspace.branch} />
      <DialogText>{kept}</DialogText>
    </ConfirmDialog>
  )
}
