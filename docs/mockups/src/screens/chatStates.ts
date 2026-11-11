/**
 * The tab of the centre column: the first session, a new session, the
 * linked session that a member's message opened from the first session,
 * the second session, or a file, a Markdown preview, a diff, or a file
 * whose name the app does not know, such as a file that moved. A phone
 * shows a file in Files.
 */
export const tabStates = [
  'session',
  'new-session',
  'linked-session',
  'later-session',
  'code',
  'markdown',
  'diff',
  'unnamed-file',
] as const

/**
 * The composer: empty, with a message that is not sent yet, with attached
 * files, with its picker open, or with a message for an agent that is not
 * connected. Or with a message in a session whose starter's login is not
 * available, or whose starter keeps that login for their own messages.
 * With files, a file can still upload, its upload can fail, or a file over
 * the size limit can stay out of the message. `workspace-link` holds a
 * message with a pasted link to another workspace of the org, which shows
 * as a chip. `session-link` holds pasted links to two sessions, which show
 * as session chips.
 *
 * The `mention-` states open the list of `@`: with a query, without one,
 * with no match, while the tree loads, and with no tree. `file-chips` holds
 * a file chip and a folder chip. The `-pointer` states draw the pointer
 * over the icon of the first chip or the first attached file, where a ×
 * takes the place of the icon. A phone has no pointer, so it shows the × at
 * the end of each chip instead.
 */
export const composerStates = [
  'empty',
  'draft',
  'attachments',
  'uploading',
  'upload-failed',
  'too-large',
  'picker',
  'no-agent',
  'no-starter-login',
  'not-shared',
  'workspace-link',
  'session-link',
  'mention-query',
  'mention-start',
  'mention-none',
  'mention-loading',
  'mention-unavailable',
  'file-chips',
  'file-chip-pointer',
  'workspace-link-pointer',
  'attachment-pointer',
] as const
