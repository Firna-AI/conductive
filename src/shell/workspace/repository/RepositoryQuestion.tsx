import { FolderGit2 } from 'lucide-react'
import { RepositoryChangeText } from '../../../ui/components/workspace/RepositoryChangeText'
import { repositoryQuestion } from '../../../ui/components/workspace/repositoryMoveCopy'
import { ActionButton } from '../../ui/actions'
import { Dialog } from '../../ui/Dialog'
import type {
  RepositoryChange,
  RepositoryQuestion as Question,
} from './repository-change'

/**
 * The question before a repository change, after its check found work
 * that the workspace stops following, or work in the new folder that moves
 * to the new branch (repository change decision 3 D). Change repository
 * asks again with the work allowed, and Cancel sends nothing. A phone shows
 * it as a sheet.
 */
export function RepositoryQuestion(props: {
  change: RepositoryChange
  question: Question
}) {
  const { change, question } = props
  const { localWork } = question.work
  const cancel = () => change.cancel()
  return (
    <Dialog
      action={
        <ActionButton
          icon={FolderGit2}
          onPress={() => change.confirm()}
          tone="primary"
        >
          {repositoryQuestion.confirm}
        </ActionButton>
      }
      busy={false}
      close={cancel}
      title={repositoryQuestion.title}
    >
      <RepositoryChangeText
        from={question.from}
        to={question.to.fullName}
        work={{
          left: {
            files: localWork.uncommittedFiles,
            displayFiles: localWork.displayUncommittedFiles,
            commits: localWork.unpushedCommits,
          },
          pullRequest: question.work.pullRequest?.number ?? null,
          pushedCommits: question.work.pushedCommits,
          carriedFiles: question.work.carriedFiles,
          displayCarriedFiles: question.work.displayCarriedFiles,
        }}
      />
    </Dialog>
  )
}
