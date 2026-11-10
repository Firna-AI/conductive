import type { Attachment } from './attachments'

/**
 * The feedback that Cal sends from the command palette: a message about
 * the Preview tab, and a screenshot that Cal pasted into it.
 */
export const feedbackMessage =
  'After I restart the dev server, the Preview tab stays blank until I reload the page.'

/** The screenshot that Cal pasted, a capture of the screen of a Mac. */
export const feedbackScreenshot: Attachment = {
  name: 'Screenshot 2026-11-10 at 14.32.05.png',
  kind: 'image',
  sizeBytes: 1_887_436,
}

/**
 * The primary verified email of Cal's GitHub account, which the Worker
 * saved at the last sign-in. The team replies to it.
 */
export const replyEmail = 'cal@example.com'

/**
 * A capture of a whole page. With the pasted screenshot, the two pass the
 * limit of the screenshots of one message, so the dialog does not add it.
 */
export const largeCapture = 'checkout-full-page.png'

/**
 * A photo from a phone in a format that is not PNG, JPEG, GIF, or WebP,
 * so the dialog does not add it.
 */
export const otherTypePhoto = 'IMG_4021.HEIC'

/**
 * A long report of twelve short lines, as a person writes the steps of a
 * bug on a phone, where Enter adds a line.
 */
export const longFeedbackMessage = [
  'The Preview tab stays blank after a restart.',
  'Steps:',
  '1. Open Checkout address autocomplete.',
  '2. Start the dev server in the terminal.',
  '3. Open the Preview tab.',
  '4. Stop the dev server, then start it again.',
  'Expected: the preview shows the page again.',
  'Actual: the preview stays blank.',
  'A reload of the page fixes it.',
  'It happens in Chrome and in the Mac app.',
  'It started after the update this week.',
  'The screenshots show each step.',
].join('\n')

/** The three captures of the long report, with the names that a Mac gives them. */
export const longFeedbackScreenshots: readonly Attachment[] = [
  {
    name: 'Screenshot 2026-11-10 at 14.31.08.png',
    kind: 'image',
    sizeBytes: 412_337,
  },
  feedbackScreenshot,
  {
    name: 'Screenshot 2026-11-10 at 14.33.51.png',
    kind: 'image',
    sizeBytes: 655_360,
  },
]
