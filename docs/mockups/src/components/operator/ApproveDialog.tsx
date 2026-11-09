import type { Viewport } from '@mokly/mokly'
import { Check } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { ScreenLink } from '../common/ScreenLink'

/** A person who waits, as the question names them. */
export type ApprovePerson = { login: string; name?: string }

/**
 * The operator confirms an approval. The question names the person, says
 * that an email tells them at once, and says that an approval is final.
 */
export function ApproveDialog(props: {
  person: ApprovePerson
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the approval. */
  cancel: string
  done: string
}) {
  const { login, name } = props.person
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
        {name ?? `@${login}`} gets app access now, and an email tells them that
        they can come in.
      </DialogText>
      <DialogText>
        An approval is final. You can still suspend the user later.
      </DialogText>
    </ConfirmDialog>
  )
}
