/**
 * The tab of the centre column: the first session, a new session, the
 * linked session that a member's message opened from the first session,
 * the second session, an empty session that another member started, or a
 * file, a Markdown preview, a diff, or a file
 * whose name the app does not know, such as a file that moved.
 * `code-lines` is the code file at the lines that a chip of an answer
 * names, with the lines in view and marked. An image of
 * the branch shows as its picture, or with the state of an image that the
 * browser cannot draw. `attachment` is the copy of an attached screenshot,
 * which a press on its sent chip opens. `screenshot` is the screenshot of
 * the agent, which a press on its picture in an answer opens. A phone shows
 * a file in Files.
 *
 * `html` shows the HTML report of the context folder in Preview, with its
 * page in a frame (HTML preview decision 1 A). `html-source` shows its text,
 * `html-opening` the wait until its page loads, and
 * `html-older-software` the notice of a cloud computer whose software
 * cannot serve the files of the workspace yet. `html-failed` shows a
 * preview that did not open, with the message of the server.
 *
 * `preview` shows the page of port 3000 in its Preview tab, beside the
 * Preview tab of port 6006 (decision 291). `preview-behind` shows the first
 * session, and both Preview tabs stay in the row with their pages loaded.
 * A phone row shows no Preview tab, so a phone shows the page on its
 * Preview page. `explanation` shows the tab of the explanation of Cal
 * after Expand, at the end of the row.
 *
 * `skill` shows the skill tab of `plans`, which a press on its chip opens
 * (skill tab decision 1 B), in Preview, and `skill-source` in Source. The
 * other `skill-` states show a notice in place of its text: the read that
 * runs, a skill that the list no longer holds, a text over the read limit,
 * and older cloud computer software. A phone shows the skill in Files.
 */
export const tabStates = [
  'session',
  'new-session',
  'linked-session',
  'later-session',
  'started-session',
  'code',
  'code-lines',
  'markdown',
  'diff',
  'unnamed-file',
  'image',
  'image-not-drawn',
  'attachment',
  'screenshot',
  'html',
  'html-source',
  'html-opening',
  'html-older-software',
  'html-failed',
  'preview',
  'preview-behind',
  'explanation',
  'skill',
  'skill-source',
  'skill-loading',
  'skill-gone',
  'skill-too-large',
  'skill-older-software',
] as const

/**
 * The temporary tab, from decisions 284 to 287: the one tab that the next
 * press on a file, a diff, or a skill replaces (skill tab decision 2 A).
 * Its title shows in italics. With `none`, every tab is kept. `opened`
 * draws the file, the diff, or the skill of `tab` in the temporary tab, at
 * the end of the row. `replaced` draws it in the place of the file that
 * the temporary tab held, before the tab of a new session that opened
 * after that file. `kept` draws the file that the temporary tab held,
 * which a double-click kept, then the file of `tab` in a new temporary tab
 * at the end of the row. `skill-kept` does the same with the skill tab of
 * `plans` as the kept tab. A session or the code file in `tab` draws no
 * temporary tab, and a phone row shows no file or skill tabs.
 */
export const temporaryTabStates = [
  'none',
  'opened',
  'replaced',
  'kept',
  'skill-kept',
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
 * with no match, while the tree loads, and with no tree. `mention-omitted`
 * asks for tsconfig.json. The states with a ready tree search the tree of
 * the `lists` of the workspace. A limited tree leaves out tsconfig.json, so
 * nothing that the list offers matches it there. `file-chips` holds
 * a file chip and a folder chip. `file-added` holds the chip that Add to
 * chat of a row menu put at the end of the draft, with a space after it.
 * The field takes the focus on desktop, so the caret stands after the
 * space. A phone draws no caret, because the field does not take the focus
 * there. The `-pointer` states draw the pointer over the icon of the first
 * chip of the text, where a × takes the place of the icon. A phone has no
 * pointer, so it shows the × at the end of each chip instead.
 * `skill-chip-name` draws the pointer over the name of the skill chip,
 * which a press opens in the skill tab, so the name is underlined.
 *
 * The `drop` states draw a drop of files on the box: a screenshot that
 * hovers over it with the drop caret in the text, the screenshot at that
 * place after the drop, and a drop with a folder, which the box does not
 * attach. A phone shows a pick at the caret in place of the drag: the caret
 * where the pick goes, then the picked file at the caret.
 *
 * The `capabilities` states open the Capabilities control of the icon
 * beside the attach button (secrets decision 8). A computer draws it above
 * the icon, and a phone as a sheet. `menu` opens the menu of the one button
 * of a phone, which holds Attach files and Capabilities (secrets decision
 * 16 G). A computer has no such menu, so it draws the composer as it is.
 *
 * Only the Mac app shows the Mac access part, with the switch of this Mac
 * (Mac access decision 7). A browser shows no Mac access part, so its view
 * of each state of the switch shows only the secrets. The switch is on in
 * `capabilities-on`, because this Mac has a grant until Stop for the
 * workspace. It is off in each other state. This Mac has no grant in
 * `capabilities`. In `capabilities-fifteen-minutes`, the 15 minutes run,
 * and the bar gives their time left. `capabilities-stopped` has the result
 * of the Stop of a switch-off. `capabilities-not-started` has a start that
 * failed, and `capabilities-not-reached` a start that found this Mac not
 * available (Mac access decision 3 A). In `capabilities-not-reached` and
 * `capabilities-not-available`, the page cannot read the settings of this
 * Mac, so the switch is disabled. `grant-not-started` and
 * `grant-not-reached` draw the notice over the composer of a new workspace
 * whose grant did not start after the create. Only the Mac app starts a
 * grant, so only its screens use them.
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
  'mention-omitted',
  'file-chips',
  'file-added',
  'file-chip-pointer',
  'skill-query',
  'skill-start',
  'skill-loading',
  'skill-unavailable',
  'skill-none',
  'skill-chip',
  'skill-chip-pointer',
  'skill-chip-name',
  'workspace-link-pointer',
  'attachment-pointer',
  'drop-over',
  'dropped',
  'dropped-folder',
  'unreadable-folder',
  'capabilities',
  'capabilities-on',
  'capabilities-fifteen-minutes',
  'capabilities-stopped',
  'capabilities-not-started',
  'capabilities-not-reached',
  'capabilities-not-available',
  'grant-not-started',
  'grant-not-reached',
  'menu',
] as const
