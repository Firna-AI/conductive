# Tab scroll places

Status: Active. On branch `calummoore/seoul-aki1`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The tab row of a workspace holds session tabs, file tabs, and diff tabs.
Today no tab keeps the reader's place. All sessions share one chat box, so a
session opens at the scroll offset of the session before it. A file or diff
tab replaces the chat, so the chat opens again at the newest message. Each
file and diff page mounts again for its path, so it opens at the top. A
return to a kept workspace also opens its chat at the newest message.

This change makes each tab of the row give back the reader's place. It does
not cover the Files lists of the right column, the file pages of a phone,
which show in the Files tab outside the tab row, or a reload of the browser
tab.

Decisions (Cal, 2026-11-13, in this workspace's session):

- **How a tab gives back the place: B.** A chat tab keeps the row that the
  reader read, with its offset. A chat at the bottom opens at the bottom,
  with the output that came while the reader was away. A file or diff tab
  keeps its scroll offset. Rejected: A, a pixel offset for each tab, because
  output that arrives while the reader is away moves the read row. Rejected:
  C, keep each tab mounted and hidden, because of the memory of hidden chats
  and pages, browsers that reset the scroll of a hidden box, and the one
  chat box of all sessions. Reason: B alone keeps the read message in view
  when output arrives while the reader is away.
- **Which moves keep the place: B.** The moves between tabs of one
  workspace, and a return from another workspace. The places live with the
  workspace that the browser tab keeps in memory, so a reload forgets them.
  Rejected: A, the moves inside one workspace only, because a change of
  workspace is common. Rejected: C, also across a reload, because it needs
  a store in browser storage that a sign-out must clear. Reason: the app
  already keeps each shown workspace in memory.

Design calls (my calls, 2026-11-13):

- A session tab on a phone keeps its place by the same rules.
- A message that the user sends still moves the chat to the bottom.
- The anchor of a chat place is a transcript entry key, such as a message
  ID or the ID of a fold. Each entry renders in one wrapper element that
  carries the key, because the entry parts come from the mockups and render
  no common root. The wrapper is a flex column with the gap of the
  transcript, and an empty wrapper takes no space, so the chat looks the
  same.
- When the anchored row is gone, such as a run of tool calls that a work
  fold took, the chat opens at the bottom. Reason: a guess at another row
  can show a place that the reader never read.
- A fold keeps its own open state as today. A return to a chat that shows
  its folds closed puts the row of the fold at its saved offset.
- A file tab keeps a place for each view, so the code and the preview of a
  Markdown file each keep their own offset. A page whose content grows after
  the mount, such as a preview with pictures, tries the saved offset again at
  each change of size, until it reaches it or the user scrolls.
- The chat keeps the places of its session tabs in its `ChatStore`, which
  `ChatController.places` gives. Each send of this browser tab puts the
  place of its session at the bottom, also while a file tab shows. The files
  of a workspace keep the places of its file and diff tabs in its
  `WorkspaceFiles`. Both live as long as the kept workspace. (Changed on
  2026-11-13 after review finding 1: a fixed prompt sent while a file tab
  showed kept the old place.)
- A file or diff tab keeps its offset down and sideways, because a line of
  code can be wider than the box. (Review finding 5, 2026-11-13.)

- **A closed tab forgets its place: B.** (Cal, 2026-11-13, review finding
  2.) A session tab that opens again shows the bottom, and a file or diff
  tab shows the top. Rejected: A, a reopened tab returns to its last place,
  because a reopened tab is a new tab to the user. Rejected: C, only file
  and diff tabs forget, for the same reason.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#the-scroll-of-the-chat).
- [Agents and sessions](../docs/protocol/agents-and-sessions.md#the-tab-row).
- The [chat README](../src/chat/README.md) and [the tab row](../src/chat/tab-row.md).
- The [files README](../src/files/README.md).

## Milestone 1: Documentation and protocol

Depends on: none

State the new requirements of the tab row and of the chat scroll.

- [x] Add the place of each tab to "The scroll of the chat" in
      `docs/protocol/chat-and-events.md`, with its reason.
- [x] Add the place of file and diff tabs to "The tab row" in
      `docs/protocol/agents-and-sessions.md`, with its reason.
- [x] Read both legal pages and each public guide in full. Update each
      sentence that restates the scroll of the chat or of a tab.
- [x] Check the row of the comparison page in
      `src/marketing/from-conductor/` for a listed feature that this changes.

## Milestone 2: The place of a chat tab

Depends on: 1

- [x] Wrap each transcript entry, pending message, and the running turn in
      one row element with a `data-row` key, in `TranscriptView.tsx`.
- [x] Add a store of chat places to `ChatController`: the bottom, or a row
      key with its offset from the top of the box.
- [x] Give `useReadingPlace` the store and the shown session. A new
      `ReadingPlace` restores the saved place, then writes the place at each
      note. A change of session builds a new `ReadingPlace`.
- [x] Tests in `ReadingPlace.dom.test.tsx` or a new test file: a session
      switch, a file tab and back, output while away at the bottom and
      higher up, a lost anchor row, and a send after a return.
- [x] Update `src/chat/README.md` and `src/chat/transcript.md` or
      `tab-row.md`.

## Milestone 3: The place of a file or diff tab

Depends on: 1

- [x] Add a store of tab places to `WorkspaceFiles`.
- [x] Add a hook that restores and writes the scroll offset of a box for a
      tab key and a view. It retries at each change of size until it
      reaches the offset or the user scrolls.
- [x] Use it in `CodeView`, `MarkdownView`, and `DiffView` through a
      context that the desktop tab page gives.
- [x] Tests: two file tabs, a diff tab, the chat between them, and a late
      growth of the content.
- [x] Update `src/files/README.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Check the change in a browser on `npm run dev`: session tabs, file and
      diff tabs, and a return from another workspace.
- [x] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
