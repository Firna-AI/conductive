import { Ban, CircleAlert, LockOpen, TriangleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  liftFiles,
  liftGivesBack,
  selfSuspendWarning,
  suspendFiles,
  suspendStops,
} from '../../../docs/mockups/src/components/operator/operatorCopy'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useAction } from '../ui/useAction'
import { targetName, type Target } from './TargetParts'

/**
 * The write of a question, and the dismissal of the question. While the
 * write runs, nothing closes the question, as the Archive question does:
 * Cancel is off, and Escape and a press outside do nothing, on desktop and
 * in the sheet of a phone. A dismissal cannot stop the write, and a failure
 * shows in the question. The rest of the page is inert while the question
 * shows, so no newer question opens before the write ends, and the close
 * after the write closes only its own question.
 */
function useQuestion(write: () => Promise<void>, close: () => void) {
  const action = useAction(async () => {
    await write()
    close()
  })
  const dismiss = () => {
    if (!action.pending) close()
  }
  return { ...action, dismiss }
}

/**
 * The operator confirms a suspension. The question says what stops, what the
 * members keep, and that the files of a stopped workspace can be deleted. On
 * the operator's own page it warns first. A failed suspension shows its error,
 * and the question stays open.
 */
export function SuspendDialog(props: {
  target: Target
  /** The target is the account of the operator. */
  self: boolean
  suspend: () => Promise<void>
  close: () => void
}) {
  const { target } = props
  const name = targetName(target)
  const suspend = useQuestion(props.suspend, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={suspend.pending} onPress={suspend.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={suspend.pending}
            icon={Ban}
            onPress={() => suspend.run()}
            tone="danger"
          >
            {target.kind === 'user' ? 'Suspend user' : 'Suspend org'}
          </ActionButton>
        </>
      }
      close={suspend.dismiss}
      title={`Suspend ${name}?`}
    >
      {props.self ? (
        <Notice icon={TriangleAlert} title={selfSuspendWarning} tone="danger" />
      ) : null}
      <DialogText>{suspendStops(target.kind, name)}</DialogText>
      <DialogText>{suspendFiles}</DialogText>
      {suspend.error ? (
        <Notice
          body={suspend.error.message}
          icon={CircleAlert}
          title={`${name} wasn't suspended`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}

/**
 * The operator confirms a lift. The question says what comes back, and that a
 * workspace that stopped 14 days ago or more may have lost its files. A failed
 * lift shows its error, and the question stays open.
 */
export function LiftDialog(props: {
  target: Target
  lift: () => Promise<void>
  close: () => void
}) {
  const { target } = props
  const name = targetName(target)
  const lift = useQuestion(props.lift, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={lift.pending} onPress={lift.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={lift.pending}
            icon={LockOpen}
            onPress={() => lift.run()}
            tone="primary"
          >
            Lift suspension
          </ActionButton>
        </>
      }
      close={lift.dismiss}
      title={`Lift the suspension of ${name}?`}
    >
      <DialogText>{liftGivesBack(target.kind, name)}</DialogText>
      <DialogText>{liftFiles}</DialogText>
      {lift.error ? (
        <Notice
          body={lift.error.message}
          icon={CircleAlert}
          title={`The suspension of ${name} wasn't lifted`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
