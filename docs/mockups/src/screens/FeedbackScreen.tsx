import type { SchemaProps, Viewport } from '@mokly/mokly'
import { offlineMessage } from '../components/common/LoadFailure'
import { SuccessToast } from '../components/common/SuccessToast'
import { sentToastTitle } from '../components/feedback/feedbackCopy'
import {
  FeedbackDialog,
  type FeedbackProblem,
} from '../components/feedback/FeedbackDialog'
import type { Attachment } from '../fixtures/attachments'
import {
  feedbackMessage,
  feedbackScreenshot,
  largeCapture,
  otherTypePhoto,
  replyEmail,
} from '../fixtures/feedback'
import { paths } from '../paths'
import { WorkspaceListScreen } from './WorkspaceListScreen'

export const feedbackSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['draft', 'reply', 'send', 'refusal'],
  properties: {
    /**
     * The message box: empty, with the message of Cal, or with the message
     * and the screenshot that Cal pasted.
     */
    draft: { enum: ['empty', 'message', 'screenshot'] },
    /**
     * The GitHub account of Cal has a primary verified email, which the team
     * replies to, or none.
     */
    reply: { enum: ['email', 'none'] },
    /**
     * The dialog before a send, while the send runs, or after the send
     * failed. After a send went, the dialog closes and the toast shows.
     */
    send: { enum: ['draft', 'sending', 'failed', 'sent'] },
    /**
     * A file that the dialog did not add: a capture that passes the limit of
     * the screenshots of the message, or a photo of another type.
     */
    refusal: { enum: ['none', 'too-large', 'other-type'] },
  },
} as const

export type FeedbackState = SchemaProps<typeof feedbackSchema>

/** The dialog with the message and the pasted screenshot, before a send. */
export const feedbackDraft: FeedbackState = {
  draft: 'screenshot',
  reply: 'email',
  send: 'draft',
  refusal: 'none',
}

const screenshots: Readonly<
  Record<FeedbackState['draft'], readonly Attachment[]>
> = {
  empty: [],
  message: [],
  screenshot: [feedbackScreenshot],
}

/**
 * The notice of a state: a failed send gives the message of the server,
 * such as when the app cannot reach it, and a refusal names its file.
 */
function problemOf(state: FeedbackState): FeedbackProblem | undefined {
  if (state.send === 'failed') {
    return { kind: 'not-sent', message: offlineMessage }
  }
  switch (state.refusal) {
    case 'none':
      return undefined
    case 'too-large':
      return { kind: 'too-large', name: largeCapture }
    case 'other-type':
      return { kind: 'other-type', name: otherTypePhoto }
  }
}

/**
 * The Feedback dialog over the list of Acme, where Cal opened the palette
 * and chose Send feedback. The palette closes first, so the dialog shows
 * alone over the page: a dialog on desktop, and a sheet over the list page
 * of a phone. After a send, the dialog closes and the toast shows over the
 * list.
 */
export function FeedbackScreen(props: {
  state: FeedbackState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const overlay =
    state.send === 'sent' ? (
      <SuccessToast phone={viewport === 'mobile'} title={sentToastTitle} />
    ) : (
      <FeedbackDialog
        problem={problemOf(state)}
        replyTo={state.reply === 'email' ? replyEmail : undefined}
        screenshots={screenshots[state.draft]}
        sendTo={paths.feedbackSending}
        sending={state.send === 'sending'}
        text={state.draft === 'empty' ? '' : feedbackMessage}
        viewport={viewport}
      />
    )
  return (
    <WorkspaceListScreen
      overlay={overlay}
      state={{ list: 'workspaces', menu: 'none', palette: 'closed' }}
      viewport={viewport}
    />
  )
}
