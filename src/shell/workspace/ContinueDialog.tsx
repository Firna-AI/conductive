import { useSyncExternalStore } from 'react'
import { FileDiff, GitBranchPlus, GitCommitHorizontal } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/ArchiveDialog.module.css'
import { continueQuestion } from '../../../docs/mockups/src/components/workspace/barCopy'
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
      <ul aria-label="Work that is not pushed" className={styles.list}>
        {uncommittedFiles.map((file) => (
          <li className={styles.item} key={file}>
            <FileDiff aria-hidden className={styles.icon} size={14} />
            <span className={styles.path}>{file}</span>
            <span className={styles.detail}>
              {continueQuestion.notCommitted}
            </span>
          </li>
        ))}
        {unpushedCommits > 0 ? (
          <li className={styles.item}>
            <GitCommitHorizontal
              aria-hidden
              className={styles.icon}
              size={14}
            />
            <span className={styles.path}>
              {continueQuestion.commits(unpushedCommits)}
            </span>
            <span className={styles.detail}>{continueQuestion.notPushed}</span>
          </li>
        ) : null}
      </ul>
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
