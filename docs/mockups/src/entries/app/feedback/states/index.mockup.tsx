import { defineScreen } from '@mokly/mokly'
import {
  feedbackDraft,
  FeedbackScreen,
  feedbackSchema,
} from '../../../../screens/FeedbackScreen'

export const feedbackStates = defineScreen({
  title: 'Dialog states',
  description:
    'The empty dialog, as it opens without a kept draft. The message box is empty and has the focus, and Send is off until the box has text.',
  rationale:
    'The text is the only part of a message that the person must give, so Send waits only for it. A close without a send keeps the draft in the memory of the tab, and the browser keeps nothing in its storage. A send clears the draft.',
  relatedDocs: [],
  propSchema: feedbackSchema,
  props: { ...feedbackDraft, draft: 'empty' },
  useCasePaths: ['user-flows/send-feedback'],
  render: (props, context) => (
    <FeedbackScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-reply-address',
      title: 'No reply address',
      description:
        "Cal's GitHub account has no primary verified email. In place of an address, the reply line says how to get a reply: add a verified email on GitHub, then sign in again. Send still works.",
      rationale:
        'The Worker reads the primary verified email at each sign-in, so a new email counts after the next sign-in. The dialog has no email field, as decision 272 chose.',
      props: { draft: 'message', reply: 'none' },
    },
    {
      slug: 'sending',
      title: 'Sending',
      description:
        'Cal pressed Send. A spinner leads "Sending", and the dialog takes no change: Cancel and Add screenshots are off, and Escape and a press outside do nothing. The dialog closes when the send is done.',
      rationale:
        'The dialog stays open during the send, as the New workspace dialog does while it creates, so a failure shows beside the kept draft. A second press after a lost reply sends one email, because the request carries the ID of the draft.',
      props: { draft: 'screenshot', send: 'sending' },
      useCasePaths: ['user-flows/send-feedback'],
    },
    {
      slug: 'failed',
      title: 'Not sent',
      description:
        'The send failed, because the app could not reach the server. The dialog keeps the text and the screenshot. The notice under the box names what failed, with the message of the server, and a new press of Send tries again.',
      rationale:
        'Each error of the send shows its message in the same notice, such as a deployment without a team inbox or an email that the email service refused. The draft stays, so a failure loses nothing.',
      props: { draft: 'screenshot', send: 'failed' },
    },
    {
      slug: 'sent',
      title: 'Sent',
      description:
        'The send went. The dialog closed, and a toast at the bottom right of the window thanks Cal. On a phone the toast sits at the bottom of the screen. The draft is gone, so the next open shows an empty dialog.',
      rationale:
        'The app keeps no copy of the feedback. The team reads it in its inbox and replies by email.',
      props: { send: 'sent' },
      useCasePaths: ['user-flows/send-feedback'],
    },
  ],
})
