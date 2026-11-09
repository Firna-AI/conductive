# Chat tests

This guide belongs to [the chat](README.md). It says what each test file of
the chat checks. [Tests](README.md#tests) gives the command and the shared
helpers.

`components/TryAgain.dom.test.tsx` mounts the chat and presses Try again.
It checks the plain message of a refused retry in a tab that missed newer events.
`state/linked-replies.test.tsx` drives replies of Send and Try again that
name a linked session, in both orders, and two chats with different readers
on one fake stream. `components/SessionLogin.test.tsx` renders the login
label and its notices. `components/SourceLink.dom.test.tsx` presses the link
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
also opens a message line with a table: the closed line shows the cells,
the table opens under the line, and a line that starts with a table keeps
a name.
`components/AgentText.dom.test.tsx` renders `AgentText`. It checks where a
table starts and ends, the alignment, the content of a cell, HTML as text,
code blocks, the cells of each row, and the span of at most 1,000 columns.
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
