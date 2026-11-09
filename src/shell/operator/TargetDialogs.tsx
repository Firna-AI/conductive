import { useState } from 'react'
import { Ban, CircleAlert, LockOpen, TriangleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { disableCodeOffer } from '../../../docs/mockups/src/components/operator/accessCopy'
import {
  liftQuestion,
  selfSuspendWarning,
  suspendQuestion,
  type QuestionTarget,
} from '../../../docs/mockups/src/components/operator/operatorCopy'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { CheckOption } from './CheckOption'
import { useQuestion } from './useQuestion'

/**
 * The operator confirms a suspension. The question says what stops, what the
 * members keep, what a lift does not bring back, and that the files of a
 * stopped workspace can be deleted. An org gives its deletion, so the
 * question of a deleted org says that no admin can restore it while it is
 * suspended. On the operator's own page it warns first. A user whose referral
 * code still lets people in gets the offer to disable it too, on by default,
 * and `suspend` gets the choice. A failed suspension shows its error, and the
 * question stays open.
 */
export function SuspendDialog(props: {
  target: QuestionTarget
  /** The target is the account of the operator. */
  self: boolean
  /** The referral code of a user, while it still lets people in. */
  referralCode?: string
  suspend: (disableCode: boolean) => Promise<void>
  close: () => void
}) {
  const { target, referralCode } = props
  const { name } = target
  const [disable, setDisable] = useState(true)
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
            onPress={() => suspend.run(referralCode !== undefined && disable)}
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
      {suspendQuestion(target).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {referralCode !== undefined ? (
        <CheckOption
          change={setDisable}
          checked={disable}
          disabled={suspend.pending}
          hint={disableCodeOffer.hint(referralCode)}
          label={disableCodeOffer.label}
        />
      ) : null}
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
 * workspace that stopped 14 days ago or more may have lost its files. A
 * deleted org stays deleted, so its question promises no access. A failed
 * lift shows its error, and the question stays open.
 */
export function LiftDialog(props: {
  target: QuestionTarget
  lift: () => Promise<void>
  close: () => void
}) {
  const { target } = props
  const { name } = target
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
      {liftQuestion(target).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
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
