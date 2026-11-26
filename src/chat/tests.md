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
in another session. After the second try sends, the next send of the same
prompt gets a new client ID. While one prompt waits, another prompt sends
nothing, also in another session, and a send from the composer still goes.
`components/ContinuedNote.test.tsx` folds the note of Continue once at its
place, also after a repeat, in a new tab, and in a closed session. It draws
"You" or the member, and each branch by its label, also in a copy.
`state/repository-folder.test.ts` checks that a record of another
repository reads the view again for the folder of the new repository, that
a record of the same repository does not, and that a failed read or a late
reply leaves no wrong folder.
`components/RepositoryChangedNote.test.tsx` checks the note of a repository
change in the same way, with its read from the stream and its copy.
`components/NewSessionText.test.tsx` checks that the New session text names
the branch of the chat's record by its real name when the host gives the
GitHub state of another branch, or of that branch without a label.

`components/CapabilityChangeNote.test.tsx` checks the note of a change of
the capabilities in the same way. It also checks that the stream reader
skips a note that it cannot read, such as one with a change of an unknown
kind, and keeps its event number.
`components/TryAgain.dom.test.tsx` mounts the chat and presses Try again.
It checks the plain message of a refused retry in a tab that missed newer events.
`state/linked-replies.test.tsx` drives replies of Send and Try again that
name a linked session, in both orders, and two chats with different readers
on one fake stream. `state/linked-reply-selection.test.ts` checks that such
a reply keeps a selected tab of another kind. A fixed prompt from a Preview
tab keeps that tab and the session of the chat. A held Send whose draft
cannot move, because the linked session holds a draft, keeps the file tab
that the user chose during the send. `components/SessionLogin.test.tsx` renders the login
label and its notices. `components/MissingLoginNotice.dom.test.tsx` mounts
the chat and checks the watch of the notice of a missing login. The notice
keeps one watch while it shows, also while the reader types. The watch ends
when a read names a login that serves and at the unmount, and a notice that
shows again starts a new one. `components/ComposerModels.dom.test.tsx` opens the
model picker of a reader whose own endpoint list leaves models out, in the
reader's own session, in the session of another member, and before a
message that starts a linked session. It reads the models in All models,
and in the reader's own session the favourites of the account, without the
favourite on a model that the list leaves out. In an empty session of another
member, it checks that the label and the picker follow the default login
that the record names, the org login. `components/ModelPicker.dom.test.tsx`
checks the New session mark of each model of the other agent in All
models, and the Fast row of the model picker: the keys reach it, a change
of it sends a choice that differs only in fast and keeps the menu open, the
trigger names Fast, and a model without fast mode has no row and turns fast
off. `components/ModelFavourites.dom.test.tsx` checks the favourites of the
menu: their rows with the muted words, a favourite on a model that the
picker does not offer, the mark of an exact match only, a pick, a favourite
of the other agent, and the menu with no favourite to show, which starts
with All models.
`components/AllModels.dom.test.tsx` checks the submenu of All models: its
keys, a hover, a pick, and its form in the phone layout, with Back.
`components/model-picker-test-kit.tsx` holds the models, the session, and
the readers of the menu that these picker tests share. `components/SourceLink.dom.test.tsx` presses the link
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
table starts, the lines after a list item without its indent, the
alignment, the content of a cell, HTML as text, code blocks, the cells of
each row, and the span of at most 1,000 columns. It also checks workspace
chips in cells and links that stay code inside a code span. It checks the
heading element of each level, with code, bold, and a chip in a heading,
and that an empty heading draws nothing.
`components/AgentLists.dom.test.tsx` renders lists in an answer and in a
message line: the numbers from the first item, a list under an item, the
list that holds the first table, which opens under the line, and task
boxes. A task box is a disabled check box before the words of its task,
and each box of a line has a name that says whether its task is done.
`components/AgentUpdates.dom.test.tsx` makes a live update of an answer,
and counts the blocks that draw again with a spy on `answerParts`. Then it
changes the workspaces, the tree, and the links of the screen, and checks
the chips and the links of the blocks whose text did not change.
`components/TranscriptView.test.tsx` renders the line of a stopped turn
and of an end reason. It also closes the open mark of the message that
the running turn writes last, and shows it as typed once a later step or
the end of the turn follows.
`components/AgentProse.dom.test.tsx` renders quotes, rules, emphasis,
strikethrough, and line breaks in an answer, with the shared prose style.
It checks them in a closed and an open message line, and a quote that
holds the first table of a message, which opens under the line.
`markdown/agent-blocks.test.ts` reads the blocks of agent messages: lists
by the rules of CommonMark, headings, underlines, quotes, rules, the own
cells of a table row in a quote, and the depth limit of lists and quotes
with no lost text. `markdown/agent-live.test.ts` reads live text: an open
mark closes only in the paragraph, the heading, or the table cell where
the text ends, and a finished message keeps it as typed. A live block that
reads a reference link keeps its reading. `markdown/agent-inline.test.ts` reads marks, entities,
escapes, code, and each form of a line break, with the line breaks that a
block draws. `markdown/agent-text-test-kit.ts` writes blocks and inline
text in a short form.
`components/MessageLine.dom.test.tsx` renders a message line. A heading in
a closed line is a span in the line, and the summary holds no heading
element. A line whose table follows only empty headings keeps a name.
When that line opens, its table shows the file chip of a mention. The
hidden text that names the line holds the mention as text, with no link.
`components/TableReply.dom.test.tsx` drives chat events. It checks a header
row before its separator row, the rows and a partial row that arrive, and
the same reply from the saved history.
`components/ReadingPlace.dom.test.tsx` lays the chat out as a browser lays
out its reversed scroll box. It ends a long turn while the reader reads
higher up, and checks the read row and the newest message at the bottom.
While the reader reads higher up, a message of another member keeps the
read row in place, and a message that the user sends goes to the bottom.
`components/TabPlace.dom.test.tsx` uses the same layout. It shows another
session tab, or a page in place of the chat as a file tab does, and checks
the read row after output came in the meantime. It also checks the bottom
for a reader at the bottom, for a read row that folded away, and for a
session that kept no place, the read row of a session whose sent message
still waits, a send after a switch of session tabs, and the bottom of a
session that the user closed and opened again. `components/reading-place-test-kit.tsx` holds
the long turn and the layout of both files. Its `layOutChat` also takes the
label of another chat and the height of each row, as the popover tests of
a long answer use it.
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
left, and opens the rename field in a tab that does not show. The menu of
the temporary tab leads with Keep open and a line. Keep open calls the
`keep` of the host, and the focus and the status follow. The label of the
file tab of the kit hides its secret value, so the tab has no Copy path,
and a read-only row opens no menu on it. `state/tab-order.test.ts` moves tabs through
the controller and checks the saved order. A move that changes the place
of the temporary tab drops its mark in the same save. A move of another
tab, and a move to its own place, keep the mark.
`state/saved-view.test.ts` fails the read of the saved view. A click on
a session tab and a new session each show the session and load its
history. A model change to the other agent shows its new session, loads
its history, and moves the draft there. The view stays null and no view
save goes out, so the server keeps the saved view. The row keeps the open
sessions in the order of creation, with each new session last.
`components/CloseTabs.dom.test.tsx` presses Close tabs to the right on
the first tab of a row with a file tab and a session tab. The file tab
leaves the view in one save, with its temporary mark, the session closes
with no stop, and the shown tab stays. When the shown tab is to the right,
the tab of the menu shows first. The item is off on the last tab. The
same file presses Close other tabs on the middle tab of a row with a
session tab, which shows, before it and the file tab after it. Both other
tabs close, the tab of the menu shows, and its session gets no close.
Then the item is off, because the row holds only that tab.
`state/controller.test.ts` closes an idle and a running session in one
close: the idle one closes at once, and the running one waits for one
question. `components/CloseQuestion.dom.test.tsx` checks the words of
that question for one and for two running sessions, and
`state/sessions.test.ts` drops a session that another member closes from
the question.
`state/close-actions.test.ts` closes a session tab while the test holds
its request. The tab moves to the session history at once. An open record
from the stream before the reply does not bring it back. A failed close
puts the tab back at its place in the row. When the user chose no other
tab during the close, the tab shows again with the notice
"The session didn't close". Another session tab or a Preview tab that the
user chose during the close stays selected. With the Preview tab, the
failed close also keeps the session of the chat. In both cases, the notice
goes to the chat, with no session.
`state/replay-navigation.test.ts` sends pages of the stored history of the
stream. Pages that close the shown session and then open it again keep the
saved order and the shown tab. A later save and a new start keep them too.
A dropped connection keeps the tabs until the next final page. An empty
final page then closes the tab of a session that stays closed. A close and
a reopen of the user apply at once. A failed close puts its tab back, keeps
the tab that the user chose, and shows its notice.
`state/replay-history.test.ts` checks history loads, a model change, and a
read-only chat during a replay. While the history of a selected session
loads beside the pages, its newer title and model show at once, and Send
sends that model. A failed earlier page of the first history load lets the
later session list set the tabs. The new session of a model change shows
from its first page, and its draft moves once. A read-only chat keeps its
local tabs and writes nothing.
`state/replay-completion.test.ts` checks the end of a replay after a
failed history load, and the hold of the first load. A selected session
whose newest page holds its close, and whose earlier page fails, closes
its tab when the load ends. The other session shows, and the closed list
holds the session. A page of the stream and live copies of the same events
then keep the tabs, and each message shows once and in order. While the
stored history of the stream still loads, a failed load, a successful Try
again, and a page with the same close keep the tabs. The empty final page
then closes the tab, and each message shows once and in order. When the
history of the first load ends before the second read of the session
list, the saved tabs stay, and that list sets them. When that read fails,
the hold still ends: the session whose newest record is closed leaves the
row, and the next tab shows.
`state/replay-read-only.test.ts` checks the open and the closed lists of a
read-only chat with local tabs. In each case, a replay closes a session,
reopens one, or brings a new one, with the Archive or a suspension. The
reader also closes, reopens, or chooses a tab. The local tabs, the shown
session, and the view stay, and nothing writes. The lists follow the
newest records, so a closed session leaves the open list. The session
history lists a new or a reopened session that has no tab. A suspended
chat with local tabs updates the lists at each page. After a dropped
connection and a local choice, the empty final page settles them. After a
Restore, the stored open sessions show as tabs in the saved view.
`state/replay-test-kit.ts` gives the replay tests a chat with two open
sessions, their saved view, and pages of session records and messages.
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
line lists only the other files. `../shared/transcript/turn-speed.test.ts`
copies the standard speed of a fast turn after its duration and in a stop
line, and nothing for a fast turn at fast speed.
`components/TurnSpeed.test.tsx` renders the end of fast turns: standard
speed with each known cause, "Standard speed" alone for another cause or
none, the words at the end of a stop line, and nothing for a fast turn at
fast speed or a turn without fast mode.
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
`components/chip-field/SkillList.dom.test.tsx` opens the list of `/`,
orders and filters its rows, picks with Enter and Tab, closes it with Esc
and a space, sends with Enter when no skill matches and while the loading
or the unavailable line shows, shows the line of an agent without skills
for `/` alone, shows the skills of the agent of a newly chosen model, and
offers a manual-only Claude skill only when `/` starts the text.
`components/chip-field/SkillChips.dom.test.tsx` restores skill chips of
either agent from a draft, keeps a skill text with more after it as text,
opens the skill tab of the agent of the composer, else of the other agent,
with a press on the name that takes no focus, removes a chip with its ×
and with Backspace, copies and pastes a chip, follows skill lists that
load later, and keeps a chip after a change of the model.
`components/chip-field/FileChips.dom.test.tsx` restores file chips from a
draft, opens a file and a folder, removes a chip with its ×, also as the
first change, pastes a mention, and follows the tree.
`components/chip-field/InsertMention.dom.test.tsx` puts the chip of Add to
chat with `insertMention` at the caret of a field without the focus, with
a space, as one step of undo. With `focus`, the field takes the focus with
the caret after the chip. Without it, a field with no caret takes the chip
at the end, and a later commit of the editor gives the field no focus, also
with the caret rule of Chrome from `chromeFocusOnCaret`. A folder chip ends
with `/`, and an entry that the list does not offer gets no chip.
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
states that the cloud computer marks. It also gives the skill lists of
`mentions/skills-test-kit.ts` and an agent that a test can change. The attached kit takes its tree from
the same fake. The DOM tests focus, type, paste, clear, and read the field
through `src/test-support/message-field.ts`. Its `messageText` reads each
field as a field without attached files, so the tests of attached files
read the draft that the owner keeps.
`../shared/mention-text.test.ts` reads and writes mentions, and
`mentions/mention-rows.test.ts` orders the rows of the list.
`mentions/skill-rows.test.ts` orders and limits the rows of the list of
`/`. `links/SkillLink.dom.test.tsx` shows a skill chip in a sent message
for a skill of either agent, as a link to its skill tab, keeps other skill
texts and code as text, opens the skill of the agent of the message, else
of the other agent, with the title of the same skill, copies the skill
text of a chip, and keeps each skill text as text without a list.
`../shared/attachment-mentions.test.ts` finds the attached file of a file
mention, and leaves a folder mention and other mentions alone. It puts the
original names in place of those mentions, and checks for words outside
them. For a title, it leaves out the mentions of attached images.
`links/chat-parts-mentions.test.ts` reads mentions in a sent message. A
mention of a file of the message is its chip, also when the tree holds
that path, and also without a tree. A folder mention of that path stays
text, and a mention or a path in code stays code.
`links/MessageFileChips.dom.test.tsx` opens a file and a folder from its
chip, copies messages with file chips in the copy state, and moves a
selection edge inside a chip to its edge.
`components/SentFileChips.dom.test.tsx`
mounts sent messages with files. It checks the chip of each file of the
message at its place. Under the message, only the files without a chip
show, such as a file whose mention stands in code. A press on a chip
opens the file tab of the copy that its link names. While a message
waits, and in a chat without the files of its workspace, the chip shows
and opens nothing. A copy of the messages gives the mention of each
chip, also of a chip that opens nothing.
`links/mention-copy-test-kit.tsx` holds the copy helpers of the DOM
tests. The Vitest configuration loads the style sheet of
`ChipCopyText.module.css` into the test page, so `copyAll` reads the real
rule of the copy state: the text of each block whose elements show. A
real copy in Chrome was a manual check. `components/AttachmentChips.test.tsx` renders the notice of the
files over the size limit, with one name or the count and the limit. It
also renders the files under a sent message, with their sizes and no
Remove.
`markdown/AnswerText.dom.test.tsx` mounts answers with file chips through
`AgentText`, which parses an answer again only when its text changes. One
case holds the reply of the tree. Until the tree comes, a mention and a
Markdown link of a file show as typed, and a path in code stays code.
Then the tree loads with no change of the text. The mention and the path
show as file chips, and the Markdown link shows as a file link.
`chat-files-test-kit.ts` starts the real store of the Files screens,
`WorkspaceFiles`, over the fake API, with the tree entries that a test
gives. It can hold the reply of the tree until the test releases it.
`markdown/AnswerText.dom.test.tsx`, `links/MessageFileChips.dom.test.tsx`,
`components/SentFileChips.dom.test.tsx`, and
`components/MessageLine.dom.test.tsx` take their files from it.
`markdown/answer-files.test.ts` reads the file chips and the file links of
an answer, with and without a tree, and the mentions right after a mark.
It also checks that only the image of a picture file can show as its
picture. `markdown/answer-links.test.ts` reads the web links of an answer:
a bare address in bold, a label with its formatting, a label that reads as
an address, a link that shows as typed, web images, code that holds one
address alone, and balanced square brackets in a bare address.
`markdown/answer-test-kit.ts` reads the first text of a message and writes
its parts in a short form.
`links/FilePicture.dom.test.tsx` mounts an answer with the Markdown image
of a screenshot in the chat pane, with a fake picture reader. Until the
tree comes, the image shows its alt text. The box of the label shows, and
the read starts for the message only when the box comes near the view,
with the scroll box of the chat as the root. The picture shows at its own
size with the label as its alternative text. A plain press opens the file
tab, and a press with a modifier key stays with the browser. The link
shows without a reader, with the code of its label, and after a failed
read and for bytes that the browser cannot draw. Without a reader, nothing
watches the image. An unmount aborts the read, and a copy gives the
Markdown image while the box and while the picture shows.
`components/AgentPictures.dom.test.tsx` checks the places of a picture: a
paragraph, a list item, and a quote show it, and a heading and a table
cell keep the link. A closed message line shows the link, and the open
line shows the picture, which a press opens. happy-dom toggles a
`<details>` for a click on a link in its summary, which a browser does
not, so the browser smoke test checks that the line stays open.
`links/picture-test-kit.tsx` holds their helpers: a stand-in for
`IntersectionObserver`, the fake reader, and the mount. They take the
image decoder of `fakeDecoder` from `../files/page/picture-test-kit.tsx`.
`components/same-data.test.ts` checks both compares of
`components/same-data.ts`: the props of a row for three levels under each
prop, and the plain data of the blocks of an answer at each depth.
`links/workspace-links.test.ts` reads links with and without a tab path,
Markdown links, a code label in a sent message, code, `..`, other origins
and orgs, which are links and no chips, unknown workspaces, and
punctuation. `links/LinkedText.test.tsx`
mounts an answer with chips: in bold, in a list, with a bold or a code
label, and a link in inline code and in a code block.
`links/chat-parts-links.test.ts` reads the web links of a sent message,
whose Markdown links show as typed around their addresses.
`links/WebLinkText.dom.test.tsx` mounts an answer in a screen that opens
links. It checks the words, the title, and the target of each kind of
link, a plain press and a press with a modifier key on each, a workspace
that runs no server, the links outside such a screen, and the links of a
message line. `links/links-test-kit.ts` holds the helpers of the link
tests.
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
`LinkChips.test.tsx` checks the chips of a kept chat on a phone, and a
link of another origin there. Its `TextLinks.test.tsx` presses a local
address and a link of the app on desktop, and a link of the app to the
address that shows, which replaces that address. It checks that an
archived workspace keeps a local address as text. Its
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
again, which sends the part of the same file again. On a computer, the cell of the
icon is the one button that removes a chip, and Backspace after a chip
removes it whole. On a phone, the icon stays, and the button at the end
of the chip removes it. Each removal takes the file off the draft and
stops its upload.
`state/attachment-actions.test.ts` attaches files to a chat draft over
the fake API, which uploads in parts. A part that fails at its first send
and at its three retries, after the waits of 1, 2, and 4 seconds on the
timers of the chat, fails the upload, which keeps its file and its
receipts, and Send waits. Try again through the files source of the draft
sends only the part with no receipt, in the same upload. It also checks
the measured bytes of an upload. A pick with two files over the 1 GB
limit and two unreadable folders uploads only its other file. The draft
keeps the names of each kind in their order, and Send clears them. A
removed file and a stopped chat abort their uploads. An expired file that
Send finds gone turns failed, and Try again uploads its kept `File` as a
new upload.
`state/attachment-waits.test.ts` checks that a failed part waits on the
timers of the chat, and that a Remove during the wait stops the upload.
`state/draft-file-lifecycle.test.ts` attaches files through the controller
and gets their IDs before the uploads end, with the queue of the pick. It
keeps a ready file for undo, and it detaches a file only when its last
mark leaves. It aborts the upload of a detached file, and ignores its late
progress, reply, and failure after undo starts it again in the same
upload, also from a queued start. Undo of several stopped uploads starts
them again in one new queue, and the stopped queue starts none of them.
A Remove while the start call or the complete call of a file waits starts
the next file of the pick at once, and the late answer changes nothing.
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
gives `readyChat`, a started chat whose uploads wait for the test. It can
also hold the requests that a test picks, such as with `firstCall`. Its
`pickChatFiles` attaches files, with optional refusals, and writes
the marks of the files as the field does. Both use the helpers of
`../app/draft-files.test-support.ts`.

`components/ComposerDrops.dom.test.tsx` mounts the composer of
`components/composer-files-test-kit.tsx`, which also gives its box and
drop state, and drops files with the helpers of
`src/test-support/file-drop.ts`.
Files over the box show its drop state and the drop caret, a leave hides
both, and a drag of text shows neither. A drop on the text puts the chips
at its place: in order, with spaces, as one step of undo, and without the
dragged path. A dropped folder becomes one zip chip at its place among
the files of the drop, also a folder alone. A folder that cannot be read
gets no chip, and its notice names it. An empty file attaches, and Attach
files of the notice opens the file picker. The box takes a drop during a
send, after the sent text left, and during an upload, and a drop on the
bar puts the chips at the caret.

`state/refused-folders.test.ts` gives a chat draft the names of
unreadable folders with no files, and checks that the draft keeps a copy of the names with no upload.
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

`dev/dev-stream.test.ts` drives `DevStream` of the development page
through the real `WorkspaceStream`, with fake timers. `DevStream` sends the
second of two parts first. `WorkspaceStream` then connects again and gets
both parts from the stored history. It delivers each part once and in
order, also after the late copy of the first part.

The tests of the secret requests are in the
[README of the secret requests](secrets/README.md#tests).

`components/ReadOnlyChat.dom.test.tsx` checks the read-only behavior of both hosts.
A right click and Shift and F10 open a tab menu with only the copy items, with no line.
It changes `readOnly` during a rename and archives a kept chat during a close question.
Each edit hides, the old tab name stays, and no write goes out.
The session history remains available after Archive.
