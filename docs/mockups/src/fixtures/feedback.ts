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
