# Workspace links, file mentions, and tools

These pages are part of [the mockup catalogue](catalogue.md).

`app/workspace-links` draws the workspace numbers and the chips of
decisions 211 and 212, and the session chips and the messages from agent
tools of decisions 259 and 261. Its canonical screen has a message and an
answer with chips in Checkout address autocomplete, `W-395`. Its child
pages:

- `app/workspace-links/copy-link` has the header of Saved carts, `W-402`,
  just after a press on the label, with the note "Link copied". Its
  `failed` variant has a copy that failed, with the note "The link didn't
  copy. Try again." in the danger colour.
- `app/workspace-links/messages` has a pasted link as a chip in the
  message box. Its `sent` variant has the sent message while the agent
  works, and its `other-org` variant has a link of another org as plain
  text.
- `app/workspace-links/session-chips` has the second session of `W-395`,
  Debounce the address lookups to 250 ms, after its agent sent two
  messages. Its answer names the first session and the session of Saved
  carts as session chips: the state mark and the label of the workspace,
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
`app/new-workspace/first-turn`. The flow `user-flows/open-a-session-link`
starts at the message in Saved carts. A press on the chip of the closed
session opens `W-395` on its workspace page, at its first session, and a
press on the chip of the `Sent by:` line there shows the second session.

`app/tools` shows the terminal. Its child pages show the Preview tool,
from decisions 220 C and 221 D, its list after a failed repair, and the
hidden Desktop:

- `app/tools/preview` has an open port preview. Each tab shows the port
  and the program name of its server, cut to 10 characters, such as
  `6006 storybook…`. Its tooltip and its spoken name give the port, the
  full name, and the folder. Each tab has its Close button after its
  label, as the tabs of the centre tab row have: it shows on the current
  tab, on hover, and while the focus is in the tab, and a hidden one keeps
  its place. The bar has no Close of its own. Two named tabs do not fit
  beside the actions of the frame, so the end of the tab row fades, as the
  centre tab row does. Its variants:
  - `detected` has the port form with no preview open. Each server that
    the runner detects is a button with its port, its name, and its
    folder. A folder that does not fit keeps its end, after "…". The
    smaller Other port row opens any other port.
  - `no-servers` has a report with no server. The form asks the user to
    start one in the terminal or to ask the agent, and keeps the field.
  - `no-report` has no report, as for a sandbox from an older image. The
    form reads as before. It moved from `app/tools/preview-empty` and
    declares `movedFrom`.
  - `another-port` has the form after "+", beside the tabs of the open
    previews. The ports of the open previews leave the list.
- `app/tools/preview-repair` has the port form after a failed repair of
  the list, from decision 96. The form keeps its last list and the Other
  port row. Under them, the row of a file list that is not the latest one
  says "The latest list of servers is unavailable", with the time since
  the failure, and no Dismiss. A newer full report clears it. The page
  stands beside `app/tools/preview`, which already shows five screens.
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
  the sent message with both chips. Its `workspace-chip` and
  `attached-file` variants show the same × on a pasted workspace link and
  on an attached file.

On a phone each chip of the composer keeps its icon and ends with a ×.
The flow `user-flows/mention-a-file` goes from the query to the sent
message, and ends with a press on the file chip, which opens
`app/files/code`.
