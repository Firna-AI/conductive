import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import {
  Archive,
  CircleAlert,
  CircleCheck,
  FileDiff,
  GitCommitHorizontal,
  RotateCw,
} from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/workspace/ArchiveDialog.module.css'
import { hasUnpushedWork, type ArchiveModel } from '../../app/archive-model'
import { useStore } from '../../app/store'
import { nameLabel } from '../../shared/name-label'
import type { ArchiveCheckResponse, Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import ui from '../ui/ui.module.css'

const kept = 'The chat stays in Archived, where you can read it.'

/**
 * The work that the check found, which is not on GitHub yet. The commits are
 * those of every local branch, so their status names no branch.
 */
function UnpushedList(props: { check: ArchiveCheckResponse }) {
  const commits = props.check.unpushedCommits
  return (
    <ul aria-label="Work that is not pushed" className={styles.list}>
      {props.check.uncommittedFiles.map((file) => (
        <li className={styles.item} key={file}>
          <FileDiff aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>{file}</span>
          <span className={styles.detail}>not committed</span>
        </li>
      ))}
      {commits > 0 ? (
        <li className={styles.item}>
          <GitCommitHorizontal aria-hidden className={styles.icon} size={14} />
          <span className={styles.path}>
            {commits} {commits === 1 ? 'commit' : 'commits'}
          </span>
          <span className={styles.detail}>not pushed</span>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * The question of Archive (decision 16). The check for work that is not
 * committed or pushed runs first. With such work, the dialog lists it, and
 * only "Archive anyway" deletes it. Cancel leaves the workspace as it was.
 */
export function ArchiveDialog(props: {
  archive: ArchiveModel
  workspace: Workspace
}) {
  const theme = useSharedUiTheme()
  const flow = useStore(props.archive.flow)
  const { workspace } = props
  const name = nameLabel(workspace.name)
  // While the archive runs, Cancel cannot undo it, so the dialog stays.
  const archiving = flow.step === 'confirm' && flow.archiving
  const cancel = () => {
    if (!archiving) props.archive.cancel()
  }
  const cancelButton = (
    <ActionButton disabled={archiving} onPress={cancel}>
      Cancel
    </ActionButton>
  )
  if (flow.step === 'closed') return null
  if (flow.step === 'checking' || flow.step === 'check-failed') {
    return (
      <Dialog
        actions={
          <>
            {cancelButton}
            {flow.step === 'check-failed' ? (
              <ActionButton
                icon={RotateCw}
                onPress={() => void props.archive.start()}
                tone="primary"
              >
                Try again
              </ActionButton>
            ) : null}
          </>
        }
        close={cancel}
        title={`Archive ${name}?`}
      >
        {flow.step === 'checking' ? (
          <div className={ui.center}>
            <Spinner color={theme.colors.muted} size={13} />
            Checking for work that is not pushed
          </div>
        ) : (
          <Notice
            body={flow.error.message}
            icon={CircleAlert}
            title="The check didn't finish"
            tone="danger"
          />
        )}
      </Dialog>
    )
  }
  const unpushed = hasUnpushedWork(flow.check)
  const confirm = (
    <ActionButton
      busy={flow.archiving}
      icon={Archive}
      onPress={() => void props.archive.confirm()}
      tone={unpushed ? 'danger' : 'primary'}
    >
      {unpushed ? 'Archive anyway' : 'Archive'}
    </ActionButton>
  )
  const failure = flow.error ? (
    <Notice
      body={flow.error.message}
      icon={CircleAlert}
      title="The workspace wasn't archived"
      tone="danger"
    />
  ) : null
  if (!unpushed) {
    return (
      <Dialog
        actions={
          <>
            {cancelButton}
            {confirm}
          </>
        }
        close={cancel}
        title={`Archive ${name}?`}
      >
        <StatusText
          icon={CircleCheck}
          label="Everything is pushed"
          tone="success"
        />
        <DialogText>Archive deletes the cloud computer. {kept}</DialogText>
        {failure}
      </Dialog>
    )
  }
  return (
    <Dialog
      actions={
        <>
          {cancelButton}
          {confirm}
        </>
      }
      close={cancel}
      title="Archive with work that is not pushed?"
    >
      <DialogText>
        Archive deletes the cloud computer of {name}, with this work:
      </DialogText>
      <UnpushedList check={flow.check} />
      <DialogText>{kept}</DialogText>
      {failure}
    </Dialog>
  )
}
