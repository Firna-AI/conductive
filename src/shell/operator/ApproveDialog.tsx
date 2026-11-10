import { Check, CircleAlert } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  approveQuestion,
  approveTitle,
  type ApproveTarget,
} from '../../../docs/mockups/src/components/operator/accessCopy'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { useQuestion } from './useQuestion'

/**
 * The operator confirms an approval. The question names the person and
 * says that an approval is final. With a verified email, it says that an
 * email tells them at once. Without one, it says that they see the app
 * access at their next visit. A failed approval shows its error, such as a
 * suspension of the person, and the question stays open.
 */
export function ApproveDialog(props: {
  person: ApproveTarget
  approve: () => Promise<void>
  close: () => void
}) {
  const { person } = props
  const approve = useQuestion(props.approve, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={approve.pending} onPress={approve.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={approve.pending}
            icon={Check}
            onPress={() => approve.run()}
            tone="primary"
          >
            Approve
          </ActionButton>
        </>
      }
      close={approve.dismiss}
      title={approveTitle(person.login)}
    >
      {approveQuestion(person).map((text) => (
        <DialogText key={text}>{text}</DialogText>
      ))}
      {approve.error ? (
        <Notice
          body={approve.error.message}
          icon={CircleAlert}
          title={`@${person.login} wasn't approved`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
