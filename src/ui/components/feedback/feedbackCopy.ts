/**
 * The words of feedback: the row of the command palette, the Feedback
 * dialog that the row opens, and the toast after a send. The mockups
 * choose them, and the app can share them.
 */

import { FEEDBACK_SENDS_PER_HOUR } from '../../../shared/feedback'

/** The label of the row, and the title of the dialog that it opens. */
export const sendFeedbackLabel = 'Send feedback'

/** The words that a search finds the row by, which the row does not show. */
export const sendFeedbackWords = [
  'bug',
  'idea',
  'support',
  'contact',
  'help',
  'report',
] as const

/** The group of the row on the Actions tab. */
export const helpGroupLabel = 'Help'

/** The text of the empty message box. */
export const feedbackPlaceholder =
  'Report a bug, share an idea, or ask a question'

/** The button that opens the file picker. A paste or a drop adds one too. */
export const addScreenshotsLabel = 'Add screenshots'

/** The name of the list of the chips, which screen readers hear. */
export const screenshotsLabel = 'Screenshots'

/** What the message carries besides its text and its screenshots. */
export const contextLine =
  'The message also includes the current org, the open workspace, the app version, and your browser.'

/** Where the team replies: the primary verified email of the GitHub account. */
export function replyLine(email: string): string {
  return `The team replies to ${email}.`
}

/** How a person without a primary verified email gets a reply. */
export const noReplyLine =
  'To get a reply, add a verified email on GitHub, then sign in again.'

/** The reply line while the app reads the reply address. */
export const replyLoadingLine = 'Loading the reply address'

/**
 * The title of the notice of a read of the reply address that failed, over
 * the message of the server and Try again.
 */
export const replyNotLoadedTitle = "The reply address didn't load"

/** The button that sends the message, and its label while the send runs. */
export const sendLabel = 'Send'

export const sendingLabel = 'Sending'

/** The title of the notice of a failed send, over the message of the server. */
export const notSentTitle = "The feedback wasn't sent"

const minuteMs = 60_000

/**
 * The body of the notice of a send over the limit, with the time when the
 * person can try again, in Unix milliseconds, as the server gives it. The
 * time shows on the 24-hour clock, such as 15:02. It rounds up to a whole
 * minute, so the shown minute is never before that time. Without
 * `timeZone`, the time shows in the time zone of the browser.
 */
export function sendLimitBody(retryAt: number, timeZone?: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(Math.ceil(retryAt / minuteMs) * minuteMs)
  return `You can send up to ${FEEDBACK_SENDS_PER_HOUR} feedback messages an hour. Try again at ${time}.`
}

/** The title of the notice for a file that the dialog did not add. */
export function notAddedTitle(name: string): string {
  return `${name} wasn't added`
}

/**
 * The body of that notice for a screenshot over the limit. It gives no
 * size of the file, as the notice of an attached file gives none.
 */
export const screenshotLimitBody =
  'Together, the screenshots can be up to 7 MB.'

/** The body of that notice for a file of another type. */
export const imageTypesBody = 'Add a PNG, JPEG, GIF, or WebP image.'

/** The toast after a send, when the dialog has closed. */
export const sentToastTitle = 'Thanks for your feedback'
