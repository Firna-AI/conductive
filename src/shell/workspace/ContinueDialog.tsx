import { useSyncExternalStore } from 'react'
import { GitBranchPlus } from 'lucide-react'
import { continueQuestion } from '../../ui/components/workspace/barCopy'
import { LocalWorkList } from '../../ui/components/workspace/LocalWorkList'
import type { BarActions } from '../../github/barActions'
import { baseBranchLabel } from '../../github/bannerStatus'
import type { GitHubFeed } from '../../github/githubStore'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useGitHubFeed, useScreenBar } from './github/WorkspaceGitHub'

/**
 * The name that the question shows for the branch that Continue starts
 * from: its own label, which hides each secret value. A reply of an older
 * Worker has no label, so the GitHub state of the screen gives its label,
 * only when that state names the same target. So the question never names
 * another branch. Without a label, it names the real branch.
 */
function startLabel(
  question: { baseBranch: string; displayBaseBranch?: string },
  github: GitHubFeed | null,
): string {
  const { baseBranch: base, displayBaseBranch } = question
  if (displayBaseBranch !== undefined) return displayBaseBranch
  const state = github?.state
  if (state?.status !== 'ready') return base
  const { banner } = state.snapshot
  return banner.baseBranch === base ? baseBranchLabel(banner) : base
}

function Question(props: { actions: BarActions }) {
  const { actions } = props
  const { question } = useSyncExternalStore(
    actions.subscribe,
    actions.getSnapshot,
  )
  const github = useGitHubFeed()
  if (!question) return null
  const cancel = () => actions.cancelContinue()
  const { uncommittedFiles, displayUncommittedFiles, unpushedCommits } =
    question.localWork
  const base = startLabel(question, github)
  return (
    <Dialog
      action={
        <ActionButton
          icon={GitBranchPlus}
          onPress={() => actions.confirmContinue()}
          tone="primary"
        >
          {continueQuestion.confirm}
        </ActionButton>
      }
      busy={false}
      close={cancel}
      title={continueQuestion.title}
    >
      <DialogText>{continueQuestion.intro(base)}</DialogText>
      <LocalWorkList
        commits={unpushedCommits}
        displayFiles={displayUncommittedFiles}
        files={uncommittedFiles}
      />
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
