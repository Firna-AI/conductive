# Workspace links, file mentions, and tools

These pages are part of [the mockup catalogue](catalogue.md).

`app/workspace-links` draws the workspace numbers and the chips of
decisions 211 and 212, and the session chips and the messages from agent
tools of decisions 259 and 261. Its canonical screen has a message and an
answer with chips in Checkout address autocomplete, `W-395`. The answer
links Postcode lookup for the shipping and billing forms, `W-372`, which
left the list after its 14 days. Its chip still shows, with the archived
mark, and a press on it opens `app/archive/removed`. Its child
pages:

- `app/workspace-links/copy-link` has the header of Saved carts, `W-402`,
  just after a press on the label, with the note "Link copied". Its
  `failed` variant has a copy that failed, with the note "The link didn't
  copy. Try again." in the danger colour.
- `app/workspace-links/messages` has a pasted link as a chip in the
  message box. Its `sent` variant has the sent message while the agent
  works, and its `other-org` variant has a link of another org, which is
  a link of the app and no chip.
- `app/workspace-links/session-chips` has the second session of `W-395`,
  Debounce the address lookups to 250 ms, after its agent sent two
  messages. Its answer names the first session and the session of Saved
  carts as session chips: the list mark and the label of the workspace,
  the icon of a session tab, and the session title. Its `pasted` variant
  has two pasted session links in the message box: a session without a
  title, which shows Untitled, and a session with a long title.
- `app/workspace-links/sent-by` has the first session of `W-395` with the
  message from the second session. The message ends with a blank line, a
  `---` line, and a `Sent by:` line whose session link shows as a session
  chip. Its `other-workspace` variant has the message from the same
  session in Saved carts, which joins the running turn there and names a
  closed session of `W-395`.

The message box of New workspace shows a pasted link as a chip in
`app/new-workspace/workspace-link`, a child page of `app/new-workspace`,
and in the `workspace-link` child page of `app/new-workspace/dialog`.
The flow `user-flows/link-a-workspace` goes from the copy to the answer,
and ends with a press on the chip, which opens
`app/new-workspace/first-turn`. The flow
`user-flows/open-a-removed-workspace` goes from the answer, through a press
on the chip of `W-372`, to its read-only chat. The flow `user-flows/open-a-session-link`
starts at the message in Saved carts. A press on the chip of the closed
session opens `W-395` on its workspace page, at its first session, and a
press on the chip of the `Sent by:` line there shows the second session.

`app/tools` shows three terminals as tabs of the Terminal tool, from
decisions 1 to 3 of the terminal tabs change, with the test run of
Terminal 2 shown. Its child
pages show the other states of the terminals, the Preview tool, from
decisions 220 C and 221 D, the Preview tabs of the centre row, from
decisions 288 to 292, its list after a failed repair, and the hidden
Desktop:

- `app/tools/terminals` has the one terminal that a workspace starts
  with. Its `limit` variant has ten terminals, with the + off and the line
  that says how to open another. Its `close` variant has the question
  before Terminal 2 closes. Its `open-failed` and `close-failed` variants
  have the toast of a failed open and of a failed close.
- `app/tools/disconnected` has Terminal 2 after its connection ended, with
  Reconnect.
- `app/tools/older-software` has the one terminal of a cloud computer with
  older software, without tabs.
- `app/tools/preview` has an open port preview in its Preview tab of the
  centre row, from decisions 288, 290, and 291. Each port has its own
  Preview tab, with a globe icon and the label of its port. A bar over the
  page holds Reload and Open. Only a Preview tab has this bar. The Preview
  tool in the tools panel has no bar on desktop. It lists each port, and
  the row of the shown tab is the current one. A click on a port shows its
  tab, or opens one. Nothing in the tool ends a preview, from decision
  292. A phone has no Preview tab in its row, so its Preview page keeps
  the page in a frame, with the tabs of the open previews, "+", Reload,
  and Open. Each tab there shows the port and the program name of its
  server, cut to 10 characters, such as `6006 storybook…`. Its tooltip and
  its spoken name give the port, the full name, and the folder. Each tab
  has its Close button after its label, as the tabs of the centre tab row
  have: it shows on the current tab, on hover, and while the focus is in
  the tab, and a hidden one keeps its place. Two named tabs do not fit
  beside the actions, so the end of the tab row fades, as the centre tab
  row does. A press on the local address of port 3000 in an answer opens
  its Preview tab, as the flow `user-flows/open-a-local-server` shows. Its
  variants:
  - `detected` has the port form with no preview open. Each server that
    the runner detects is a button with its port, its name, and its
    folder. A folder that does not fit keeps its end, after "…". The
    smaller Other port row opens any other port.
  - `no-servers` has a report with no server. The form asks the user to
    start one in the terminal or to ask the agent, and keeps the field.
  - `no-report` has no report, as for a sandbox from an older image. The
    form reads as before. It moved from `app/tools/preview-empty` and
    declares `movedFrom`.
  - `another-port` has the form after "+" on a phone, beside the tabs of
    the open previews. The ports of the open previews leave the list. The
    desktop shows the same screen as the open preview.
- `app/tools/preview-tab` has the first session shown, with the Preview
  tabs of two ports behind it in the row. Their pages stay loaded. The
  page stands beside `app/tools/preview`, which already shows five
  screens. Its variant:
  - `closed` has the row after Close of both Preview tabs, from decision
    289. The previews end when the cloud computer stops, from decisions
    292 and 294.
- `app/tools/preview-repair` has the port form after a failed repair of
  the list, from decision 96. The form keeps its last list and the Other
  port row. Under them, the row of a file list that is not the latest one
  says "The latest list of servers is unavailable", with the time since
  the failure, and no Dismiss. A newer full report clears it. The page
  stands beside `app/tools/preview`, which already shows five screens.
- `app/tools/preview-opening` has the page that shows while a preview
  opens: in the frame of the Preview tool, in a new tab from Open, and in
  the default browser from the Mac app. The logo tile sits above a turning
  ring and "Opening preview", on the background of the app. The page
  fades in after 150 ms, so a fast open shows no flash. The server sends
  it as one small file, from `worker/previews/opening-page.ts`. Its
  `failed` variant has "Preview not available" and asks the user to open
  the preview again from the workspace.
- `app/tools/desktop` has the hidden Desktop. It moved into its own
  folder and kept its path, so that `app/tools` shows only its canonical
  screen.

`app/file-mentions` draws the list of `@` and the file chips of decisions
213 to 217. Its canonical screen has the query `@addr` in Checkout address
autocomplete, with the best matches above the message box. Its child
pages:

- `app/file-mentions/list` has the list without a query, folders first.
  Its `no-match` variant says "Nothing matches “zipcode”", its `loading`
  variant says "Loading files…", and its `unavailable` variant says that
  the list of all files is unavailable.
- `app/file-mentions/chips` has a file chip and a folder chip in the
  message box. Its `pointer` variant has the pointer over the icon of the
  file chip, where a × takes the place of the icon. Its `sent` variant has
  the sent message with both chips, and the answer with its own file
  chips. Its `workspace-chip` and `attached-file` variants show the same
  × on a pasted workspace link and on an attached file in the text.
- `app/file-mentions/answers` has an answer of the agent with file chips,
  from answer chip decisions 1 and 2 of 13 November 2026, and with a
  screenshot as a picture, from screenshot decision 2 of 18 November
  2026. A `@` mention, an absolute path under the repository folder in
  code, and a relative path with the line target `:19-22` in code show
  as chips. A path in another repository and a code block stay code. The
  Markdown image of the screenshot shows as a small picture at its place
  in the line, at most 240 px high. A press on the chip with the line
  target opens `app/files/code/at-line`. A press on the picture, or on the
  chip after.png, opens `app/files/image/from-answer`. The page shows only
  its canonical screen. Its child pages:
  - `app/file-mentions/answers/loading` has the box of the label, as wide
    as the answer and 240 px high, while the read of the picture runs.
  - `app/file-mentions/answers/stopped` has the answer while the cloud
    computer is stopped. The chat reads no picture then, so the image
    shows as the link Postcode field on a phone.
  - `app/file-mentions/answers/work` has the open work of a finished turn
    with two screenshots. The closed line of the first message shows its
    image as a link, and the open line of the last message shows its
    picture.

On a phone each chip of the composer keeps its icon and ends with a ×.
The flow `user-flows/mention-a-file` goes from the query to the sent
message, and ends with a press on the file chip, which opens
`app/files/code`. The flow `user-flows/open-a-file-from-an-answer` goes
from the answer of `app/file-mentions/answers` to the file tab at the
lines, `app/files/code/at-line`. Then a press on the picture of the
screenshot opens it in the file tab, `app/files/image/from-answer`.
