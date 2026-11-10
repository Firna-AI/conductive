import type { Viewport } from '@mokly/mokly'
import {
  Archive,
  CircleAlert,
  CircleCheck,
  FileDiff,
  GitCommitHorizontal,
  RotateCw,
} from 'lucide-react'
import type { UnpushedWork } from '../../fixtures/archive'
import { pullRequest } from '../../fixtures/pullRequests'
import type { Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import styles from './ArchiveDialog.module.css'

const kept = 'The chat stays in Archived, where you can read it.'

/**
 * What the check of Archive found: work that is not pushed, or none. Or
 * the check did not finish, with the message of the server.
 */
export type ArchiveQuestion =
  | { kind: 'pushed' }
  | { kind: 'unpushed'; work: UnpushedWork }
  | { kind: 'check-failed'; message: string }

/** Where Cancel leads, and where the workspace shows after its archive. */
export type ArchiveLinks = { cancel: string; archived: string }

/** The links of Archive in the header of the open workspace. */
export const headerArchiveLinks: ArchiveLinks = {
  cancel: paths.app,
  archived: paths.archived,
}

/** The work that the check found, which is not on GitHub yet. */
function UnpushedList(props: { work: UnpushedWork; branch: string }) {
  const { files, commits } = props.work
  return (
    <ul aria-label="Work that is not pushed" className={styles.list}>
      {files.map((file) => (
        <li className={styles.item} key={file}>
          <FileDiff aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>{file}</span>
          <span className={styles.detail}>not committed</span>
        </li>
      ))}
      {commits > 0 ? (
        <li className={styles.item}>
          <GitCommitHorizontal aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>
            {commits} {commits === 1 ? 'commit' : 'commits'}
          </span>
          <span className={styles.detail}>not pushed to {props.branch}</span>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * The question of Archive, after the check for work that is not pushed.
 * Archive deletes the cloud computer and keeps the chat read-only. With
 * unpushed work the dialog lists it, and archiving deletes it. Cancel
 * leaves the workspace as it was, so the user can push first. A check
 * that did not finish shows the message of the server and Try again, and
 * offers no archive.
 */
export function ArchiveDialog(props: {
  workspace: Workspace
  question: ArchiveQuestion
  links: ArchiveLinks
  viewport: Viewport
}) {
  const { workspace, question, links } = props
  const cancel = (
    <ScreenLink asChild to={links.cancel}>
      <ActionButton>Cancel</ActionButton>
    </ScreenLink>
  )
  if (question.kind === 'check-failed') {
    return (
      <ConfirmDialog
        actions={
          <>
            {cancel}
            <ActionButton icon={RotateCw} tone="primary">
              Try again
            </ActionButton>
          </>
        }
        title={`Archive ${workspace.name}?`}
        viewport={props.viewport}
      >
        <Notice
          body={question.message}
          icon={CircleAlert}
          title="The check didn't finish"
          tone="danger"
        />
      </ConfirmDialog>
    )
  }
  if (question.kind === 'pushed') {
    return (
      <ConfirmDialog
        actions={
          <>
            {cancel}
            <ScreenLink asChild to={links.archived}>
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
          <ScreenLink asChild to={links.archived}>
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
      <UnpushedList branch={workspace.branch} work={question.work} />
      <DialogText>{kept}</DialogText>
    </ConfirmDialog>
  )
}
