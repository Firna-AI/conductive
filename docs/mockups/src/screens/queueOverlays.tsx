import type { Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { removeQuestion } from '../../../../src/ui/components/workspace/queueCopy'
import { pullRequestOf, queuedWorkspace } from '../fixtures/mergeQueue'
import { pullRequest } from '../fixtures/pullRequests'
import { repositories } from '../fixtures/repositories'
import type { Workspace } from '../fixtures/workspaces'
import { queuePaths } from '../queuePaths'
import {
  leavingWithOpen,
  removeCancelPath,
  type WorkspaceQueueState,
} from './queueBarStates'

/**
 * The question before Remove from queue. The entry loses its place, and
 * its pull request targets the default branch again. A lower entry of a
 * member stack takes the entries above it in its unit along, and the
 * question names them (decision 315). Remove from queue leads to the bar
 * of the workspace outside the queue, which offers Add to merge queue
 * again.
 */
export function RemoveQueueDialog(props: {
  state: WorkspaceQueueState | undefined
  workspace: Workspace
  viewport: Viewport
}) {
  const leaving = leavingWithOpen(props.state).map(({ key }) => ({
    name: queuedWorkspace(key).name,
    number: pullRequestOf(key),
  }))
  const trunk = repositories[props.workspace.repository].defaultBranch
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={removeCancelPath(props.state)}>
            <actionButton.Component moklyInstance="dialog-cancel">
              {removeQuestion.cancel}
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={queuePaths.add}>
            <actionButton.Component
              icon="list-x"
              moklyInstance="dialog-remove-from-queue"
              tone="primary"
            >
              {removeQuestion.confirm}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="remove-queue-dialog"
      title={removeQuestion.title}
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="queue-leaves">
        {removeQuestion.body(pullRequest.number, { text: trunk }, leaving)}
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
