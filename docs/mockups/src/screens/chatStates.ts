/**
 * The tab of the centre column: the first session, a new session, the
 * linked session that a member's message opened from the first session,
 * the second session, or a file, a Markdown preview, a diff, or a file
 * whose name the app does not know, such as a file that moved. An image of
 * the branch shows as its picture, or with the state of an image that the
 * browser cannot draw. `attachment` is the copy of an attached screenshot,
 * which a press on its sent chip opens. A phone shows a file in Files.
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
  'image',
  'image-not-drawn',
  'attachment',
] as const

/**
 * The temporary tab, from decisions 284 to 287: the one file or diff tab
 * that the next press on a file or a diff replaces. Its title shows in
 * italics. With `none`, every tab is kept. `opened` draws the file or the
 * diff of `tab` in the temporary tab, at the end of the row. `replaced`
 * draws it in the place of the file that the temporary tab held, before
 * the tab of a new session that opened after that file. `kept` draws the
 * file that the temporary tab held, which a double-click kept, then the
 * file of `tab` in a new temporary tab at the end of the row. A session or
 * the code file in `tab` draws no temporary tab, and a phone row shows no
 * file tabs.
 */
export const temporaryTabStates = [
  'none',
  'opened',
  'replaced',
  'kept',
] as const

/**
 * The panes of the centre column, from split panes decisions 1 C and 2 A.
 * `one` draws one pane with one tab row. `sessions` draws the first session
 * and the code file in the left pane, beside the second session in the
 * right pane, which has the focus after its drop. `file` draws both
 * sessions in the left pane, which has the focus, beside the kept code file
 * in the right pane.
 *
 * The `drag-` states draw a tab in the middle of a drag. Over one pane, the
 * code file hovers over the left half of its content, or the second session
 * over the right half. Over the split of `sessions`, the code file hovers
 * over the content of the right pane, or over the right row before its
 * first tab. A phone has no drop on the content, so its long press lifts
 * the second session in the one row: at its place over one pane, and
 * across the border into the left part over a split.
 *
 * A phone, and a centre column narrower than two panes of 320 px, draw one
 * row with the tabs of both panes, and the shown tab of the focused pane.
 * A read-only workspace draws the saved split, with no drag.
 */
export const paneStates = [
  'one',
  'sessions',
  'file',
  'drag-left',
  'drag-right',
  'drag-pane',
  'drag-row',
] as const

/**
 * The composer: empty, with a message that is not sent yet, with attached
 * files, with its picker open, or with a message for an agent that is not
 * connected. Or with a message in a session whose starter's login is not
 * available, or whose starter keeps that login for their own messages.
 * Each attached file is a chip at its place in the text. With files, a file
 * can still upload, its upload can fail, or a file over the size limit can
 * stay out of the message. `workspace-link` holds a message with a pasted
 * link to another workspace of the org, which shows as a chip.
 * `session-link` holds pasted links to two sessions, which show as session
 * chips. `picker-unlisted` opens the picker on an own endpoint whose model
 * list lacks a model.
 *
 * The `mention-` states open the list of `@`: with a query, without one,
 * with no match, while the tree loads, and with no tree. `file-chips` holds
 * a file chip and a folder chip. The `-pointer` states draw the pointer
 * over the icon of the first chip of the text, where a × takes the place of
 * the icon. A phone has no pointer, so it shows the × at the end of each
 * chip instead.
 *
 * The `drop` states draw a drop of files on the box: a screenshot that
 * hovers over it with the drop caret in the text, the screenshot at that
 * place after the drop, and a drop with a folder, which the box does not
 * attach. A phone shows a pick at the caret in place of the drag: the caret
 * where the pick goes, then the picked file at the caret.
 */
export const composerStates = [
  'empty',
  'draft',
  'attachments',
  'uploading',
  'upload-failed',
  'too-large',
  'picker',
  'picker-unlisted',
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
  'drop-over',
  'dropped',
  'dropped-folder',
  'unreadable-folder',
] as const
