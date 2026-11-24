import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { account } from '../../fixtures/orgs'
import { requestFailure } from '../../fixtures/deletionRequests'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { Linked } from '../common/ScreenLink'
import { accountDeletionCopy as copy } from './accountDeletionCopy'

/**
 * The states of the question: asked, the request runs, or the request did
 * not reach the server.
 */
export const deletionQuestions = ['ask', 'sending', 'failed'] as const

export type DeletionQuestion = (typeof deletionQuestions)[number]

/**
 * The question before the request of an account deletion: a dialog over
 * General on desktop, and a sheet on a phone. It names the account and
 * says that nobody can undo the deletion. While the request runs, the
 * question stays open: a spinner leads Request deletion, and Cancel is
 * off. A request that failed keeps the question open with its error, so
 * the person can try again. `cancelTo` is the page under the question, and
 * `requestedTo` is the section after the request. Without them, the
 * actions show without a link.
 */
export function AccountDeletionDialog(props: {
  state: DeletionQuestion
  viewport: Viewport
  cancelTo?: string
  requestedTo?: string
}) {
  const busy = props.state === 'sending'
  const cancel = (
    <actionButton.Component disabled={busy} moklyInstance="dialog-cancel">
      {copy.cancel}
    </actionButton.Component>
  )
  const confirm = (
    <actionButton.Component
      busy={busy}
      icon="trash-2"
      moklyInstance="dialog-request-deletion"
      tone="danger"
    >
      {copy.confirm}
    </actionButton.Component>
  )
  return (
    <confirmDialog.Component
      actions={
        busy ? (
          <>
            {cancel}
            {confirm}
          </>
        ) : (
          <>
            <Linked to={props.cancelTo}>{cancel}</Linked>
            <Linked to={props.requestedTo}>{confirm}</Linked>
          </>
        )
      }
      moklyInstance="account-deletion-dialog"
      title={copy.question}
      viewport={props.viewport}
    >
      <dialogText.Component>
        {copy.questionText(account.login)}
      </dialogText.Component>
      {props.state === 'failed' ? (
        <notice.Component
          body={requestFailure}
          icon="circle-alert"
          moklyInstance="request-failed"
          title={copy.failed}
          tone="danger"
        />
      ) : null}
    </confirmDialog.Component>
  )
}
