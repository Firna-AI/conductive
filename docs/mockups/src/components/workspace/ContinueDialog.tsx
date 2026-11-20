import type { Viewport } from '@mokly/mokly'
import { GitBranchPlus } from 'lucide-react'
import { unpushedWork } from '../../fixtures/barActions'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { continueQuestion } from './barCopy'
import { LocalWorkList } from './LocalWorkList'

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
      <LocalWorkList commits={commits} files={files} />
      <DialogText>{continueQuestion.outcome(commits)}</DialogText>
    </ConfirmDialog>
  )
}
