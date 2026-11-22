import { GitCommitHorizontal, GitPullRequest } from 'lucide-react'
import { DialogText } from '../common/ConfirmDialog'
import { LocalWorkList, WorkRow } from './LocalWorkList'
import { repositoryQuestion } from './repositoryMoveCopy'

/** The work that the question of a repository change lists. */
export interface RepositoryChangeWorkLists {
  /**
   * The local work in the old folder, as Continue counts it. `displayFiles`
   * gives the name that each changed file shows, as `LocalWorkList` says.
   */
  left: {
    files: readonly string[]
    displayFiles?: readonly string[]
    commits: number
  }
  /** The number of the open pull request of the old branch, or null. */
  pullRequest: number | null
  /** The pushed commits of the old branch that its base does not hold. */
  pushedCommits: number
  /** The changed files of the new folder, which move to the new branch. */
  carriedFiles: readonly string[]
  /** The name that each file of `carriedFiles` shows, in its order. */
  displayCarriedFiles?: readonly string[]
}

/**
 * The text of the question before a repository change: what the change
 * does, the work that stays with the old repository, and the work of the
 * new folder that moves to the new branch. A list without work does not
 * show. Each changed file shows by its label, such as one that hides a
 * secret value, or by its real path without one. It takes no fixtures, so
 * the app can use it too.
 */
export function RepositoryChangeText(props: {
  /** The name of the old repository. */
  from: string
  /** The name of the new repository. */
  to: string
  work: RepositoryChangeWorkLists
}) {
  const { from, to, work } = props
  const { left } = work
  const leaves =
    left.files.length > 0 ||
    left.commits > 0 ||
    work.pullRequest !== null ||
    work.pushedCommits > 0
  return (
    <>
      <DialogText>{repositoryQuestion.intro(to)}</DialogText>
      {leaves ? (
        <>
          <DialogText>{repositoryQuestion.left(from)}</DialogText>
          <LocalWorkList
            commits={left.commits}
            displayFiles={left.displayFiles}
            files={left.files}
            label={repositoryQuestion.left(from)}
          >
            {work.pullRequest === null ? null : (
              <WorkRow
                detail={repositoryQuestion.open}
                icon={GitPullRequest}
                name={repositoryQuestion.pullRequest(work.pullRequest)}
              />
            )}
            {work.pushedCommits > 0 ? (
              <WorkRow
                detail={repositoryQuestion.onGitHub}
                icon={GitCommitHorizontal}
                name={repositoryQuestion.pushed(work.pushedCommits)}
              />
            ) : null}
          </LocalWorkList>
        </>
      ) : null}
      {work.carriedFiles.length > 0 ? (
        <>
          <DialogText>{repositoryQuestion.carried(to)}</DialogText>
          <LocalWorkList
            commits={0}
            displayFiles={work.displayCarriedFiles}
            files={work.carriedFiles}
            label={repositoryQuestion.carried(to)}
          />
        </>
      ) : null}
    </>
  )
}
