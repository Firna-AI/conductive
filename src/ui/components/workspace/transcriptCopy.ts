/**
 * The words of a copy of a session transcript: the two items of the menu of
 * a session tab, and the toast that gives the result after the menu closes.
 * The concise copy holds the chat as it shows at first, with each fold
 * closed. The full copy holds the chat with every fold open.
 */

/** The item of the menu of a session tab for each kind of copy. */
export const transcriptItems = {
  concise: 'Copy concise transcript',
  full: 'Copy full transcript',
} as const

/**
 * The title of the toast after a copy: the copy worked, or its request or
 * its clipboard write failed.
 */
export const transcriptToasts = {
  copied: 'Transcript copied',
  failed: "The transcript didn't copy. Try again.",
} as const
