import type { SchemaProps, Viewport } from '@mokly/mokly'
import { offlineMessage } from '../components/common/LoadFailure'
import { SuccessToast } from '../components/common/SuccessToast'
import { sentToastTitle } from '../components/feedback/feedbackCopy'
import {
  FeedbackDialog,
  type FeedbackProblem,
} from '../components/feedback/FeedbackDialog'
import type { FeedbackReply } from '../components/feedback/FeedbackReply'
import {
  feedbackMessage,
  feedbackScreenshot,
  type FeedbackScreenshot,
  largeCapture,
  longFeedbackMessage,
  longFeedbackScreenshots,
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
     * The message box: empty, with the message of Cal, with the message and
     * the screenshot that Cal pasted, or with a long report of twelve lines
     * and three screenshots.
     */
    draft: { enum: ['empty', 'message', 'screenshot', 'long'] },
    /**
     * The read of the reply address: ready with the primary verified email
     * of Cal's GitHub account, which the team replies to, ready with none,
     * still loading, or failed. Send waits until the read is ready.
     */
    reply: { enum: ['email', 'none', 'loading', 'failed'] },
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
  Record<FeedbackState['draft'], readonly FeedbackScreenshot[]>
> = {
  empty: [],
  message: [],
  screenshot: [feedbackScreenshot],
  long: longFeedbackScreenshots,
}

const texts: Readonly<Record<FeedbackState['draft'], string>> = {
  empty: '',
  message: feedbackMessage,
  screenshot: feedbackMessage,
  long: longFeedbackMessage,
}

/** The read of the reply address in each state of the schema. */
const replies: Readonly<Record<FeedbackState['reply'], FeedbackReply>> = {
  email: { state: 'ready', email: replyEmail },
  none: { state: 'ready', email: null },
  loading: { state: 'loading' },
  failed: { state: 'failed' },
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
        reply={replies[state.reply]}
        retryTo={paths.feedback}
        screenshots={screenshots[state.draft]}
        sendTo={paths.feedbackSending}
        sending={state.send === 'sending'}
        text={texts[state.draft]}
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
