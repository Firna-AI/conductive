import type { Viewport } from '@mokly/mokly'
import { Check } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/**
 * A person who waits, as the question names them, and whether their GitHub
 * account has a primary verified email, which gets the approval email.
 */
export type ApprovePerson = {
  login: string
  name?: string
  verifiedEmail: boolean
}

/**
 * The operator confirms an approval. The question names the person and
 * says that an approval is final. With a verified email, it says that an
 * email tells them at once. Without one, no email goes out, so it says
 * that they see the app access at their next visit.
 */
export function ApproveDialog(props: {
  person: ApprovePerson
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the approval. */
  cancel: string
  done: string
}) {
  const { login, name, verifiedEmail } = props.person
  const who = name ?? `@${login}`
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <ActionButton icon={Check} tone="primary">
              Approve
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={`Approve @${login}?`}
      viewport={props.viewport}
    >
      <DialogText>
        {verifiedEmail
          ? `${who} gets app access now, and an email tells them that they can come in.`
          : `${who} gets app access now, and sees it at their next visit. No email goes out, because their GitHub account has no verified email.`}
      </DialogText>
      <DialogText>
        An approval is final. You can still suspend the user later.
      </DialogText>
    </ConfirmDialog>
  )
}
