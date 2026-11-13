import type { Viewport } from '@mokly/mokly'
import { FolderGit2, GitCommitHorizontal, GitPullRequest } from 'lucide-react'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import { repositoryWork } from '../../fixtures/repositoryMove'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'
import { LocalWorkList, WorkRow } from './LocalWorkList'
import { repositoryQuestion } from './repositoryMoveCopy'

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
  const from = repositories[props.from].name
  const to = repositories[props.to].name
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
      <DialogText>{repositoryQuestion.intro(to)}</DialogText>
      <DialogText>{repositoryQuestion.left(from)}</DialogText>
      <LocalWorkList
        commits={left.commits}
        files={left.files}
        label={repositoryQuestion.left(from)}
      >
        <WorkRow
          detail={repositoryQuestion.open}
          icon={GitPullRequest}
          name={repositoryQuestion.pullRequest(repositoryWork.pullRequest)}
        />
        <WorkRow
          detail={repositoryQuestion.onGitHub}
          icon={GitCommitHorizontal}
          name={repositoryQuestion.pushed(repositoryWork.pushedCommits)}
        />
      </LocalWorkList>
      <DialogText>{repositoryQuestion.carried(to)}</DialogText>
      <LocalWorkList
        commits={carried.commits}
        files={carried.files}
        label={repositoryQuestion.carried(to)}
      />
    </ConfirmDialog>
  )
}
