import type { Viewport } from '@mokly/mokly'
import { FileDiff, GitBranchPlus, GitCommitHorizontal } from 'lucide-react'
import { unpushedWork } from '../../fixtures/archive'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { continueQuestion } from './barCopy'
import styles from './ArchiveDialog.module.css'

/**
 * The question of Continue, after its check found local work. The changed
 * files move to the new branch. The commits that no remote branch holds,
 * on any local branch, stay where they are. Cancel keeps the workspace on
 * its branch.
 */
export function ContinueDialog(props: {
  workspace: Workspace
  viewport: Viewport
}) {
  const { files, commits } = unpushedWork
  const base = repositories[props.workspace.repository].defaultBranch
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={checksPaths.merged}>
            <ActionButton>{continueQuestion.cancel}</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={barPaths.continuing}>
            <ActionButton icon={GitBranchPlus} tone="primary">
              {continueQuestion.confirm}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={continueQuestion.title}
      viewport={props.viewport}
    >
      <DialogText>{continueQuestion.intro(base)}</DialogText>
      <ul aria-label="Work that is not pushed" className={styles.list}>
        {files.map((file) => (
          <li className={styles.item} key={file}>
            <FileDiff aria-hidden className={styles.icon} size={14} />
            <span className={styles.path}>{file}</span>
            <span className={styles.detail}>
              {continueQuestion.notCommitted}
            </span>
          </li>
        ))}
        <li className={styles.item}>
          <GitCommitHorizontal aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>
            {continueQuestion.commits(commits)}
          </span>
          <span className={styles.detail}>{continueQuestion.notPushed}</span>
        </li>
      </ul>
      <DialogText>{continueQuestion.outcome(commits)}</DialogText>
    </ConfirmDialog>
  )
}
