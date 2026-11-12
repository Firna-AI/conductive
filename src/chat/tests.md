# Chat tests

This guide belongs to [the chat](README.md). It says what each test file of
the chat checks. [Tests](README.md#tests) gives the command and the shared
helpers.

`state/instant-send.test.ts` checks a message while its send waits: it
leaves the composer and shows in the chat at once, and it goes back to the
composer, before newer text, when the Worker refuses it. It also shows a
fixed prompt at once. `state/prompt-actions.test.ts` sends fixed prompts over the fake API. It
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
failed resume. It attaches a file with the file picker, and Enter waits for
its upload. The first send then carries the mention of the returned path of
the file. `components/WorkFold.dom.test.tsx` reads the folds of ended
turns from the rendered chat. It also checks that only the newest run of
tool calls of a running turn stays open: between two calls, after a
message, and while a message waits. A newer run folds it, and so does the
end of the turn.
`components/OpenFold.dom.test.tsx` opens a
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
a code span. It checks the heading element of each level, with code, bold,
and a chip in a heading, and that an empty heading draws nothing.
`components/MessageLine.dom.test.tsx` renders a message line. A heading in
a closed line is a span in the line, and the summary holds no heading
element. A line whose table follows only empty headings keeps a name.
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
`components/SessionLinkCopy.dom.test.tsx` presses Copy link in the menu
of a tab that does not show. It copies the link of that session, says
"Link copied", keeps the shown tab, and sends no request. A refused write
says "The link didn't copy. Try again."
`../shared/transcript/session-markdown.test.ts` builds the concise and the
full text of a copy. In a member's message, it checks the name of each
attached file in place of its mention. It also checks that the attachments
line lists only the other files.
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
it was, and moves with a draft that moves. A field without attached files
keeps the characters of a mark as typed text: in a draft that comes back,
in typing, in a paste, and in a copy.
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
`components/chip-field/AttachedFiles.dom.test.tsx` attaches files and puts
their chips at the caret in the same event: in order, each with a space,
as one step of undo, with the focus. A point over the text puts the chips
at its place, and a point elsewhere puts them at the caret, which keeps
the text that it selects. The drop caret shows at the point and leaves
the caret as it was. A drop hides it, and a field that takes no change
shows none. The test checks each upload state of a chip, and Try again
from the keyboard with no send. A field that takes no change keeps each
chip.
A draft that comes back shows the chip of each file that the draft holds
and drops the other marks. A file that leaves the draft takes its chip
out, also after undo, with no step of undo. The × removes a chip as one
step of undo.
`components/chip-field/AttachedClipboard.dom.test.tsx` copies the mention
of a ready chip and the name of another chip, and a paste of that copy in
the same draft gives each chip back. A cut and a paste keep a chip with
its file, each as one step of undo. A pasted copy path gives the chip of
its file. A kept copy gives its chips back only in its own draft, while
the draft holds their files. Typed or pasted mark characters stay text
and make no chip, also after the draft comes back. A picked file mention
whose path holds such characters keeps its chip and its exact path beside
an attached file. A drag moves a chip with its file and gives its
mention, and a drop inside the dragged text keeps it.
`components/chip-field/attached-field-test-kit.tsx` mounts the field with
a store of draft files and an owner that can show another draft, and with
the files of a workspace when a test gives a tree.
`components/chip-field/attached-field-events.ts` drives the selection, the
clipboard, and the drags of the field, and lays out a point, which
happy-dom cannot do.
`components/chip-field/mention-field-test-kit.tsx` mounts the field with the
files of a chat: a fake with two plain states, no tree and a tree of
entries, or the real store of the Files screens over the fake API for the
states that the cloud computer marks. The attached kit takes its tree from
the same fake. The DOM tests focus, type, paste, clear, and read the field
through `src/test-support/message-field.ts`. Its `messageText` reads each
field as a field without attached files, so the tests of attached files
read the draft that the owner keeps.
`../shared/mention-text.test.ts` reads and writes mentions, and
`mentions/mention-rows.test.ts` orders the rows of the list.
`../shared/attachment-mentions.test.ts` finds the attached file of a file
mention, and leaves a folder mention and other mentions alone. It puts the
original names in place of those mentions, and checks for words outside
them.
`links/chat-parts-mentions.test.ts` reads mentions in a sent message. A
mention of a file of the message is its chip, also when the tree holds
that path, and also without a tree. A folder mention of that path stays
text, and a mention in code stays code. `links/FileLink.dom.test.tsx`
opens a file and a folder from its chip, and copies messages with file
chips, without hidden text. `components/SentFileChips.dom.test.tsx`
mounts sent messages with files. It checks the chip of each file of the
message at its place. Under the message, only the files without a chip
show, such as a file whose mention stands in code. A press on a chip
opens the file tab of the copy that its link names. While a message
waits, and in a chat without the files of its workspace, the chip shows
and opens nothing. A copy of the messages gives the mention of each
chip, also of a chip that opens nothing.
`links/mention-copy-test-kit.tsx` holds the copy helpers of both DOM
tests. `components/AttachmentChips.test.tsx` renders the notice of the
files over the size limit, with one name or the count and the limit. It
also renders the files under a sent message, with their sizes and no
Remove.
`links/workspace-links.test.ts` reads links with and without a tab path,
Markdown links, a code label in a sent message, code, `..`, other origins
and orgs, unknown workspaces, and punctuation. `links/LinkedText.test.tsx`
mounts an answer with chips: in bold, in a list, with a bold or a code
label, and a link in inline code and in a code block.
`components/AgentStop.dom.test.tsx` mounts the chat with its controller,
workspace list, and session reads, and draws four stops through the
workspace tools. The stopping sessions are a session of the chat's
workspace, with its live title and a note, a session of another
workspace, an unknown session of that workspace, and a session of a
workspace that the list does not hold. While the one read of the other
workspace waits, both of its stops show the chip of that workspace. After
the read, the known session shows its session chip, and the other
workspace got one request. The last stop keeps the session link as text.
`state/workspace-list.test.ts` checks that a chat without sources reads the
list while it shows, and not while it is hidden. The workspace screen's
`LinkChips.test.tsx` checks the chips of a kept chat on a phone, and its
`FileMentions.test.tsx` lists the files on a phone before a visit to
Files, and opens a file and a folder from their chips, also into a hidden
right column.

`components/ComposerFiles.dom.test.tsx` mounts the chat with its
controller, whose uploads wait for the test, from
`components/composer-files-test-kit.tsx`. It presses Attach files and
picks files through `pickFiles` of `src/test-support/file-picker.ts`. A
pick puts its chips at the end of a text without a caret, and at the
caret that the field kept while the button had the focus. The chips go in
order, each with a space, and the field takes the focus. Each chip shows
the upload of its file: the measured percent, Uploading before a
measurement, or the size when it is ready. Only a failed chip shows Try
again, which uploads the same file again. On a computer, the cell of the
icon is the one button that removes a chip, and Backspace after a chip
removes it whole. On a phone, the icon stays, and the button at the end
of the chip removes it. Each removal takes the file off the draft and
stops its upload.
`state/attachment-actions.test.ts` attaches files to a chat draft over
the fake API. A failed upload keeps its file, Send waits, and Try again
through the files source of the draft uploads the same file. It also
checks the measured bytes of an upload. A pick with two files over the
size limit and two folder names uploads only its other file. The draft
keeps the names of each kind in their order, and Send clears them. A
removed file and a stopped chat abort their uploads. An expired file that
Send finds gone turns failed, and Try again uploads its kept `File`.
`state/draft-file-lifecycle.test.ts` attaches files through the controller
and gets their IDs before the uploads end, with the queue of the pick. It
keeps a ready file for undo, and it detaches a file only when its last
mark leaves. It aborts the upload of a detached file, and ignores its late
progress, reply, and failure after undo starts it again, also from a
queued start. Undo of several stopped uploads starts them again in one
new queue, and the stopped queue starts none of them.
`state/draft-file-send.test.ts` sends a chat with only chips. It writes
the returned path at every mark, with each attachment ID once, in the
order of the first marks. Send clears the sent marks at once, and the
text, the files, and the escapes of literal text from during the send
stay. A refused send gives back the encoded text and the files, and each
sent file that the Worker no longer has turns failed.
`state/draft-file-moves.test.ts` reads the files of a moving draft through
its source during store notifications. A model change sends the encoded
text as it is, and its reply takes out each mark of an unkept file, also
of a detached one. A stopped chat ends the attached and detached files and
ignores late uploads. `state/draft-file-identity.test.ts` checks that a
fresh start clears the old draft, and that the source of the old draft
never reads the files of the new one. `state/draft-files.test-support.ts`
gives `readyChat`, a started chat whose uploads wait for the test. Its
`pickChatFiles` attaches files, with optional folder names, and writes
the marks of the files as the field does. Both use the helpers of
`../app/draft-files.test-support.ts`.

`components/ComposerDrops.dom.test.tsx` mounts the composer of
`components/composer-files-test-kit.tsx`, which also gives its box and
drop state, and drops files with the helpers of
`src/test-support/file-drop.ts`.
Files over the box show its drop state and the drop caret, a leave hides
both, and a drag of text shows neither. A drop on the text puts the chips
at its place: in order, with spaces, as one step of undo, and without the
dragged path. A dropped folder gets no chip and no upload, and its notice
names it, also for a folder alone. An empty file attaches, and Attach
files of the notice opens the file picker. The box takes a drop during a
send, after the sent text left, and during an upload, and a drop on the
bar puts the chips at the caret.

`state/refused-folders.test.ts` gives a chat draft folder names with no
files, and checks that the draft keeps a copy of the names with no upload.
An empty pick changes nothing, and a file with no bytes uploads and goes
with the message. The names move with their draft to a new session, and
another draft keeps its own. A later pick, or folders alone, replace both
lists, and Stop clears them. The start of a send clears both lists. The
names of an attach during the send stay after it, until a fresh start.

`dev/dev-attachment-files.test.ts` uploads files to the backend of the
development page and sends them through the chat API. The file client
then reads the exact bytes of each upload at its returned path, and All
files and Changes stay as they were. A queued message gets its copy only
after Resume gives it to the agent. `../app/dev/attachment-files.test.ts`
checks the same store in the fake of the app. `../app/dev/attachment-test-kit.ts`
holds the helpers of both tests.

`components/ReadOnlyChat.dom.test.tsx` checks the read-only behavior of both hosts.
A right click and Shift and F10 open a tab menu with only the copy items, with no line.
It changes `readOnly` during a rename and archives a kept chat during a close question.
Each edit hides, the old tab name stays, and no write goes out.
The session history remains available after Archive.
