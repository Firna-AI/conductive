import { useSyncExternalStore } from 'react'
import { GitBranchPlus } from 'lucide-react'
import { continueQuestion } from '../../../docs/mockups/src/components/workspace/barCopy'
import { LocalWorkList } from '../../../docs/mockups/src/components/workspace/LocalWorkList'
import type { BarActions } from '../../github/barActions'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useScreenBar } from './github/WorkspaceGitHub'

function Question(props: { actions: BarActions }) {
  const { actions } = props
  const { question } = useSyncExternalStore(
    actions.subscribe,
    actions.getSnapshot,
  )
  if (!question) return null
  const cancel = () => actions.cancelContinue()
  const { uncommittedFiles, unpushedCommits } = question.localWork
  return (
    <Dialog
      actions={
        <>
          <ActionButton onPress={cancel}>
            {continueQuestion.cancel}
          </ActionButton>
          <ActionButton
            icon={GitBranchPlus}
            onPress={() => actions.confirmContinue()}
            tone="primary"
          >
            {continueQuestion.confirm}
          </ActionButton>
        </>
      }
      close={cancel}
      title={continueQuestion.title}
    >
      <DialogText>{continueQuestion.intro(question.baseBranch)}</DialogText>
      <LocalWorkList commits={unpushedCommits} files={uncommittedFiles} />
      <DialogText>{continueQuestion.outcome(unpushedCommits)}</DialogText>
    </Dialog>
  )
}

/**
 * The question of Continue, after its check found local work in the
 * sandbox: the changed files and the commits that no remote branch holds,
 * on every local branch. Continue anyway asks again with the work allowed,
 * and Cancel sends nothing.
 */
export function ContinueDialog() {
  const bar = useScreenBar()
  return bar ? <Question actions={bar.actions} /> : null
}
