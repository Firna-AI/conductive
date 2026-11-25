import { defineComponent } from '@mokly/mokly'
import {
  ConfirmDialog,
  DialogText,
} from '../../../../../../src/ui/components/common/ConfirmDialog'
import { actionButton } from './actions.mockup'
import { viewports } from './viewports'

/** A paragraph of a dialog, registered with Mokly. */
export const dialogText = defineComponent({
  slug: 'dialog-text',
  title: 'Dialog text',
  description:
    'A paragraph of a dialog, such as what an action stops. Its page shows a paragraph with its text.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['children'],
  render: (props) => <DialogText>{props.children}</DialogText>,
  variants: [
    {
      slug: 'paragraph',
      title: 'Paragraph',
      description: 'A paragraph that says what the action changes.',
      props: {},
      slots: {
        children:
          'Every cloud computer of Acme stops, and its workspaces and chats are deleted.',
      },
    },
  ],
})

/** The two actions of a question: Cancel, then the action. */
const questionActions = (
  <>
    <actionButton.Component moklyInstance="cancel">
      Cancel
    </actionButton.Component>
    <actionButton.Component icon="trash-2" moklyInstance="delete" tone="danger">
      Delete org
    </actionButton.Component>
  </>
)

/**
 * The dialog of the app, drawn open, registered with Mokly. A screen
 * supplies its text and its actions in the `children` and `actions` slots.
 * A screen that draws a screen of another viewport, such as the Mac app in
 * a phone view, passes `viewport`. Without it, a page of the dialog draws
 * the layout of its own view.
 */
export const confirmDialog = defineComponent({
  slug: 'confirm-dialog',
  title: 'Confirm dialog',
  description:
    'The dialog of the app, drawn open: a question that the user confirms before an action, or a short form. Desktop shows a dialog over the dimmed app, and a phone shows a sheet. The actions come last, with the confirming action at the end. Its own page shows the dialog without text or actions.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** The wider dialog of a form with a message box. */
      wide: { type: 'boolean' },
      /**
       * The whole title shows, on more lines when it is long, for a title
       * that is the only place that names its subject, such as a repository.
       */
      wrapTitle: { type: 'boolean' },
    },
  } as const,
  slots: ['children', 'actions'],
  props: { title: 'Delete Acme?' },
  render: (props, context) => (
    <ConfirmDialog
      actions={props.actions}
      title={props.title}
      viewport={props.viewport ?? context.viewport}
      wide={props.wide}
      wrapTitle={props.wrapTitle}
    >
      {props.children}
    </ConfirmDialog>
  ),
  variants: [
    {
      slug: 'question',
      title: 'Question',
      description:
        'A question before an action that deletes: its text, Cancel, and the danger action.',
      props: {},
      slots: {
        children: (
          <dialogText.Component>
            Every cloud computer of Acme stops, and its workspaces and chats are
            deleted.
          </dialogText.Component>
        ),
        actions: questionActions,
      },
    },
    {
      slug: 'wide',
      title: 'Wide form',
      description: 'The wider dialog of a form with a message box.',
      props: { title: 'Send feedback', wide: true },
      slots: {
        children: (
          <dialogText.Component>
            Say what you saw, and what you expected.
          </dialogText.Component>
        ),
        actions: (
          <>
            <actionButton.Component moklyInstance="cancel">
              Cancel
            </actionButton.Component>
            <actionButton.Component moklyInstance="send" tone="primary">
              Send
            </actionButton.Component>
          </>
        ),
      },
    },
  ],
})
