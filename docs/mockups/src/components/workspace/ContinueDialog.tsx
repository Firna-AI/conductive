import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { unpushedWork } from '../../fixtures/barActions'
import { repositories } from '../../fixtures/repositories'
import type { Workspace } from '../../fixtures/workspaces'
import { barPaths, checksPaths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { continueQuestion } from '../../../../../src/ui/components/workspace/barCopy'
import { localWorkList } from '../../entries/components/workspace/LocalWorkList.mockup'

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
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={checksPaths.merged}>
            <actionButton.Component moklyInstance="dialog-cancel">
              {continueQuestion.cancel}
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={barPaths.continuing}>
            <actionButton.Component
              icon="git-branch-plus"
              moklyInstance="dialog-continue"
              tone="primary"
            >
              {continueQuestion.confirm}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="continue-dialog"
      title={continueQuestion.title}
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="intro">
        {continueQuestion.intro(base)}
      </dialogText.Component>
      <localWorkList.Component commits={commits} files={files} />
      <dialogText.Component moklyInstance="outcome">
        {continueQuestion.outcome(commits)}
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
