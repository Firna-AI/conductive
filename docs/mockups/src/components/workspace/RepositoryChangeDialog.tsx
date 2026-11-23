import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { FolderGit2 } from 'lucide-react'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import { repositoryWork } from '../../fixtures/repositoryMove'
import { paths } from '../../paths'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ConfirmDialog } from '../../../../../src/ui/components/common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { RepositoryChangeText } from '../../../../../src/ui/components/workspace/RepositoryChangeText'
import { repositoryQuestion } from '../../../../../src/ui/components/workspace/repositoryMoveCopy'

/**
 * The question before a repository change, when the workspace has work
 * that it stops following, or work in the new folder that moves to the
 * new branch (repository change decision 3 D). The first list gives the
 * local work of the old folder, the open pull request, and the pushed
 * commits of the old branch. All of it stays. The second list gives the
 * local work of the new folder. Cancel keeps the workspace as it is.
 */
export function RepositoryChangeDialog(props: {
  from: RepositoryKey
  to: RepositoryKey
  viewport: Viewport
}) {
  const { left, carried } = repositoryWork
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.repositoryMenu}>
            <ActionButton>{repositoryQuestion.cancel}</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.repositoryChanging}>
            <ActionButton icon={FolderGit2} tone="primary">
              {repositoryQuestion.confirm}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={repositoryQuestion.title}
      viewport={props.viewport}
    >
      <RepositoryChangeText
        from={repositories[props.from].name}
        to={repositories[props.to].name}
        work={{
          left,
          pullRequest: repositoryWork.pullRequest,
          pushedCommits: repositoryWork.pushedCommits,
          carriedFiles: carried.files,
        }}
      />
    </ConfirmDialog>
  )
}
