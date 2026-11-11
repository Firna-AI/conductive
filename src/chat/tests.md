# Chat tests

This guide belongs to [the chat](README.md). It says what each test file of
the chat checks. [Tests](README.md#tests) gives the command and the shared
helpers.

`state/prompt-actions.test.ts` sends fixed prompts over the fake API. It
checks the request and the unchanged draft, a send during a turn, a missing
login, a linked session, and the client ID of a second try in the same and
in another session. `components/ContinuedNote.test.tsx` folds the note of
Continue once at its place, also after a repeat and in a new tab, in the
history of a closed session, and draws "You" or the name of the member.
`components/TryAgain.dom.test.tsx` mounts the chat and presses Try again.
It checks the plain message of a refused retry in a tab that missed newer events.
`state/linked-replies.test.tsx` drives replies of Send and Try again that
name a linked session, in both orders, and two chats with different readers
on one fake stream. `components/SessionLogin.test.tsx` renders the login
label and its notices. `components/ComposerModels.dom.test.tsx` opens the
model picker of a reader whose own endpoint list leaves models out, in the
reader's own session, in the session of another member, and before a
message that starts a linked session. `components/SourceLink.dom.test.tsx` presses the link
of a linked session to its open and its closed source. In an archived
workspace, it opens a linked session that closed before the archive from the
session history. Its source link writes nothing.
`state/first-start.test.ts` drives Send in two sessions during the first
start, after it failed, and during a resume. It checks the saved message of
a failed start from a read and the stream, and a send that the Worker
refuses. `components/FirstStart.dom.test.tsx` mounts the chat without a
host, sends with Enter and Send during the first start and after it failed,
and checks the saved message on the bar of a failed first start and of a
failed resume. `components/WorkFold.dom.test.tsx` reads the folds of ended
turns from the rendered chat. `components/OpenFold.dom.test.tsx` opens a
fold and a message line, and checks that each line keeps its place. It
also presses a workspace chip in a message line, with and without a
modifier key. It also opens a message line with a table: the closed line
shows the cells, the table opens under the line, and a line that starts
with a table keeps a name. An open table-first line has no hidden link
that the keyboard can reach. The chip stays active in its table.
`components/open-fold-test-kit.tsx` holds the mount and layout helpers.
`components/AgentText.dom.test.tsx` renders `AgentText`. It checks where a
table starts and ends, the alignment, the content of a cell, HTML as text,
code blocks, the cells of each row, and the span of at most 1,000 columns.
It also checks workspace chips in cells and links that stay code inside
a code span.
`components/TableReply.dom.test.tsx` drives chat events. It checks a header
row before its separator row, the rows and a partial row that arrive, and
the same reply from the saved history.
`components/ReadingPlace.dom.test.tsx` lays the chat out as a browser lays
out its reversed scroll box. It ends a long turn while the reader reads
higher up, and checks the read row and the newest message at the bottom.
`components/TabDrag.dom.test.tsx` mounts the chat with the real
`FileTabItem` of the Files screens and drags tabs with pointer events over
boxes that `components/tab-drag-test-kit.tsx` gives them. The file tab of
the kit has a real path with a fake secret value and a label that hides
it, so a name that the row takes from a path fails the tests. A mouse
moves a file tab before a session tab, and the click at the end selects
nothing.
Escape keeps the order. A finger lifts a session tab after 450 ms, near
the clipped end of a full row, which takes the browser layout of
`components/row-layout-test-kit.ts`. While the finger holds still, the row
does not scroll. Its release with no move opens the tab menu as a sheet,
which the late click of the finger does not close. In a full row, a mouse
holds a dragged tab near each end. The drag kit holds the animation
frames, so this test fakes them and steps them one at a time. The row
scrolls toward each end, and the drop goes to a place that the scroll
showed. A second drag scrolls by the same step, so the first drag left no
frame loop running. `components/TabMenu.dom.test.tsx` opens the tab menu
with Shift and F10 and with a right click, moves a file tab with Move
left, and opens the rename field in a tab that does not show.
`components/TranscriptCopy.dom.test.tsx` copies the transcript of a tab
that never showed, through the real controller, client, and menu, with
the copy of the app's test services. Copy full transcript asks for the
full text, copies the reply, says "Transcript copied", and keeps the shown
tab, the view, and the loaded history. A failed request says "The
transcript didn't copy. Try again." and copies nothing. In an archived
workspace on a phone, a finger that moves first opens nothing, and a long
press lifts no tab, keeps the menu of the browser shut, and opens a sheet
with only the copy items. The late click of the finger selects nothing,
and Copy concise transcript copies the concise text.
`components/TabRow.dom.test.tsx` turns the wheel over a full row and reads
its fades. It also scrolls a full row over the browser layout of
`components/row-layout-test-kit.ts`, which gives the row and its tabs
their boxes and calls back each `ResizeObserver`, as happy-dom does not.
The row scrolls the shown tab into view at the mount, on a new shown
tab, and on a narrower row, the moved tab after a move, and a tab that
opens as far as the shown tab still shows. It keeps the whole shown tab
in view after the close of a tab before it and after a rename makes it
wider, and a row that the user scrolled away stays there. On a phone, a
finger that moves after its long press drags a tab toward the clipped
end. The row scrolls, the release drops the tab at the place that the
status says, and no tab menu opens.
`components/tab-row-test-kit.ts` sends their right clicks, keys, and
wheel turns.
`components/SessionTabs.test.tsx` renders the tab of a session with no
title and its rename field.
`components/chip-field/ChipTextField.test.tsx` pastes workspace links,
steps over a chip, removes it with Backspace and Delete, restores a draft,
copies, follows the list, and checks a field that takes no change. It
also checks that a focus puts the caret at the end of a kept draft, and
later back where the user put it. It checks that undo stays with its
draft after a switch to another draft with equal text, with the focus as
it was, and moves with a draft that moves.
`components/chip-field/chip-field-test-kit.tsx` mounts the field with an
owner that keeps the draft of each session, as the chat does.
`components/ComposerDrafts.dom.test.tsx` switches the sessions of the
chat after a delete, and moves the draft of a composer with its identity.
Undo stays with its draft in both.
`components/chip-field/field-text.test.ts` checks the separator rule, for
links and for mentions. `components/chip-field/MentionList.dom.test.tsx`
opens the list of `@`, moves its highlight, picks with Enter and Tab,
closes it with Esc and a space, starts each query at the top, continues
a restored query, shows its one-line states, also with the real store of
the files, and checks that Enter then sends nothing.
`components/chip-field/FileChips.dom.test.tsx` restores file chips from a
draft, opens a file and a folder, removes a chip with its ×, also as the
first change, pastes a mention, and follows the tree.
`components/chip-field/mention-field-test-kit.tsx` mounts the field with the
files of a chat: a fake with two plain states, no tree and a tree of
entries, or the real store of the Files screens over the fake API for the
states that the cloud computer marks. `components/AttachmentChips.dom.test.tsx`
removes an attached file with the cell of its icon, also a failed upload
that keeps its Try again, and on a phone with its × at the end. The DOM
tests focus, type, paste, clear, and read the field through
`src/test-support/message-field.ts`.
`mentions/mention-text.test.ts` reads and writes mentions, and
`mentions/mention-rows.test.ts` orders the rows of the list.
`links/chat-parts-mentions.test.ts` reads mentions in a sent message, and
`links/FileLink.dom.test.tsx` opens a file and a folder from its chip, and
copies messages with file chips, without hidden text.
`links/workspace-links.test.ts` reads links with and without a tab path,
Markdown links, a code label in a sent message, code, `..`, other origins
and orgs, unknown workspaces, and punctuation. `links/LinkedText.test.tsx`
mounts an answer with chips: in bold, in a list, with a bold or a code
label, and a link in inline code and in a code block.
`state/workspace-list.test.ts` checks that a chat without sources reads the
list while it shows, and not while it is hidden. The workspace screen's
`LinkChips.test.tsx` checks the chips of a kept chat on a phone, and its
`FileMentions.test.tsx` lists the files on a phone before a visit to
Files, and opens a file and a folder from their chips, also into a hidden
right column.

`components/ReadOnlyChat.dom.test.tsx` checks the read-only behavior of both hosts.
A right click and Shift and F10 open a tab menu with only the copy items, with no line.
It changes `readOnly` during a rename and archives a kept chat during a close question.
Each edit hides, the old tab name stays, and no write goes out.
The session history remains available after Archive.
