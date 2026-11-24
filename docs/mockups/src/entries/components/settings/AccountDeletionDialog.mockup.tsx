import { defineComponent } from '@mokly/mokly'
import {
  AccountDeletionDialog,
  deletionQuestions,
} from '../../../components/settings/AccountDeletionDialog'
import { viewports } from '../common/viewports'

/**
 * The question before the request of an account deletion, drawn open,
 * registered with Mokly. A screen that draws a screen of another viewport
 * passes `viewport`. Without it, a page of the dialog draws the layout of
 * its own view.
 */
export const accountDeletionDialog = defineComponent({
  slug: 'account-deletion-dialog',
  title: 'Account deletion dialog',
  description:
    'The question before the request of an account deletion: it names the account, says that the product deletes it after the request, and that nobody can undo the deletion. Then Cancel and Request deletion. While the request runs, a spinner leads Request deletion, and Cancel is off. A request that failed keeps the question open, with its error. Cancel and Request deletion open their pages only when the screen gives them. On a phone the dialog opens as a sheet. Its own page shows the question.',
  relatedDocs: ['docs/mockups/catalogue-account.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: {
      /** Asked, the request runs, or the request failed. */
      state: { enum: deletionQuestions },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** The page under the question, which Cancel opens. */
      cancelTo: { type: 'string', minLength: 1 },
      /** The section after the request, which Request deletion opens. */
      requestedTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { state: 'ask' },
  render: (props, context) => (
    <AccountDeletionDialog
      cancelTo={props.cancelTo}
      requestedTo={props.requestedTo}
      state={props.state}
      viewport={props.viewport ?? context.viewport}
    />
  ),
  variants: [
    {
      slug: 'sending',
      title: 'Sending',
      description:
        'The request runs: a spinner leads Request deletion, and Cancel is off.',
      props: { state: 'sending' },
    },
    {
      slug: 'failed',
      title: 'Not sent',
      description:
        'The request did not reach the server: the error under the text, with the message of the server, and both actions on.',
      props: { state: 'failed' },
    },
  ],
})
