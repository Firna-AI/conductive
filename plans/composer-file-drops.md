# Drop files into the composer as chips in the text

Status: Active. On branch `calummoore/composer-file-drag-and-drop`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today the paperclip button of each composer attaches files, and their
chips show in a row above the text. A member cannot drop a file on the
message box, and the text cannot say where each file belongs. This change
lets a member drop files on the composer of the chat, of the New workspace
page, and of the New workspace dialog. Each file then shows as a chip in
the text at the caret, as a file chip of the `@` list does. A file from
the paperclip goes there too, and the row above the text goes away. The
sent message keeps each chip at its place, and the agent reads the path of
each file at that place.

The message text holds a mention of the path where the Worker copies the
file, such as `@.context/attachments/<digest>/a.png`, as decision 262
says. The user chose option C of decision 262 on 10 November 2026. The
options check then added option D, a path that depends only on the file,
and recommends it. So decision 262 waits for the user again. The design
below follows C, and "What decision 262 changes" lists each part that D
changes. The read lines after the text stay as decision 244 says.

This change does not cover a paste of a file or an image, a drop of a
folder's files, or a drop on other parts of the app. The brainstorm notes
and the report of the options check are in `.context/composer-file-drops/`.

Contract owners:

- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [File mentions](../docs/protocol/file-mentions.md).
- [Workspace links](../docs/protocol/workspace-links.md#the-message-field).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- [Agents and sessions](../docs/protocol/agents-and-sessions.md#sessions).
- The [chat README](../src/chat/README.md) and
  [Loads, records, and sends](../src/chat/loads-and-sends.md).
- The [app README](../src/app/README.md), for New workspace.
- [Chat attachment storage and delivery](../worker/chat/attachments.md).
- The [shared contracts README](../src/shared/README.md).
- The [mockups README](../docs/mockups/README.md) and the
  [catalogue](../docs/mockups/catalogue.md).

Replaced ways:

- The row of attached files above the text → a chip for each file in the
  message field. Consumers: `DraftFiles` and `DraftChip` in
  `src/chat/components/AttachmentChips.tsx`, the chat `Composer.tsx`, the
  New workspace `Composer.tsx`, their tests, the composer states of the
  mockups, and the docs that name the row. Moved in Milestones 1, 2, and 6.
  Deleted in Milestone 6.
- Remove through `onRemoveFile` of each composer → removal of the chip
  from the text, which takes its file off the draft. Consumers: the
  `onRemoveFile` props, `removeFile` in
  `src/chat/state/attachment-actions.ts`, `NewWorkspaceModel.removeFile`,
  and `DraftUploads.remove`. Moved in Milestone 6. Deleted in Milestone 6.
- `attachmentPath` and `safeName` of `worker/chat/attachment-record.ts` →
  one path builder in `src/shared/`, which the Worker and the development
  fakes share. With option C of decision 262, the browser uses it too.
  Consumers: `attachment-claims.ts`, `attachment-copy.ts`, and their
  tests. Moved and deleted in Milestone 3.
- `src/chat/mentions/mention-text.ts` → the same syntax module in
  `src/shared/`, because the Worker reads mentions too. Consumers: the
  chip field, `chat-parts.ts`, `mention-rows.ts`, `mention-copy.ts`, and
  their tests. Moved and deleted in Milestone 3.

## Decisions

### 1. What a sent message keeps for each inline file

Decision 262. Added on 10 November 2026 from the brainstorm. Changed on
10 November 2026 by the options check, which added options D, E, and F,
a better root question, and a new recommendation.

- **Severity:** High. **Effort:** Large.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/components/TranscriptItem.tsx:38`,
  `worker/chat/send-message.ts:89`, `worker/chat/attachment-record.ts:72`
- **Background:** At Send, the composer gives the Worker the text and
  the list of files. Today the text holds no file. The sent message lists
  the files under its bubble, and the read lines follow the text
  (decision 244). The Worker copies each file to
  `.context/attachments/<digest>/<safe name>`, with a digest of the
  message ID and the file ID. PR #168 recorded that digest as an agent
  design call. The user's choice in decision 242 A was the copy into the
  repository folder with its ignore rule.
- **Problem:** No rule says what the text holds at the place of a chip.
  The sent message, the agent, the titles, and the transcript copy all
  read that text.
- **Impact if no action:** The field and the stored text cannot be built.
- **Root question:** What does a sent message keep at the place of each
  file, so that every reader finds the file there, also after Try again?
  The options check wrote this question, because the options differ most
  in the titles, the copies, and Try again.
- **Options:**
  - **A.** Send writes the original name of each file at its place. The
    file list and the read lines stay as now. Only the browser changes.
    The sent message shows no chip in the text. The agent must match names
    to read lines, so two files with one name are ambiguous. Effort: Large.
  - **B.** The text keeps a token such as `[File 1]` at each place. The
    sent message shows the chip there. The runner puts the same number in
    each read line. Try again keeps the tokens. Titles and copies must
    turn each token into the name. A typed `[File 1]` becomes a chip.
    Effort: Large.
  - **C.** The text keeps a mention of the copied file, such as
    `@.context/attachments/1f2e…/a.png`. The agent reads the path at its
    place. The stored text and the agent's text stay the same. The sent
    message shows the chip with the original name and size. The browser
    builds each path at Send with code that it shares with the Worker. Try
    again must rewrite the paths, because its new message ID gives new
    paths. Titles and copies turn each path into the name. The folder rule
    of decision 242 stays. Effort: Large.
  - **D.** Added by the options check. As C, but each file gets one copy
    path for its life, from its own ID only, such as
    `@.context/attachments/<digest of the file ID>/a.png`. Conductor uses
    this kind of path. The upload reply gives the path, and Send writes
    `@` and the path at each place. So the browser needs no path code, Try
    again sends the same text, and a copy of a ready chip in the field can
    give its mention. The folder rule of decision 242 changes. A later
    message with the same file, such as Try again, copies the same bytes
    to the same path again. A command stored before the change holds an
    old path, so its copy fails once. Effort: Large.
  - **E.** Added by the options check. The browser sends a token with the
    file ID at each place. The Worker turns each token into `@` and the
    path when it accepts the message, and it stores that text. So an open
    tab with old code cannot write a wrong path. Try again rewrites the
    paths, as in C. The request text is then not the stored text, so the
    repeat check of a send must build the text first. A token that names
    no file of the message needs a rule, and a refusal is a new
    validation. Effort: Large.
  - **F.** Added by the options check. The stored text keeps a token with
    the file ID at each place. When the Worker gives the message to the
    runner, it writes `@` and the copied path at each token. So Try again
    keeps the text, the browser needs no path code, and the sent chip
    finds its file by ID. The agent then reads other text than the stored
    message, which decision 216 rejected for typed mentions. A reader of
    the stored text that does not know the token, such as a later API
    client, shows a code in place of the file. Effort: Large.
- **Left out:**
  - Drop into the row above the text: it fails the goal, which asks for
    chips in the text.
  - Remove each chip at Send with nothing in its place: A is better on
    every point, because the sentence around the chip then breaks.
  - Offsets of each file beside the text: F is better on every point,
    because its tokens move with the text when a reader cuts it, such as
    for a session title.
  - A mention that also holds the name, as Conductor stores it: each
    reader of a message also gets its files with their names, so C and D
    give the same with a simpler mention.
  - A drop straight into the cloud computer with an ordinary `@`
    mention: it breaks decision 132, which needs an upload before the
    cloud computer exists and while it is stopped.
- **Wider fix:** D. The class is a stored text that names a path tied to
  the message ID, so each new message ID needs a rewrite. D removes the
  class. The rewrite of C in `retryMessage` fixes Try again only.
- **Previous examples:** `@` file chips keep their mention in the text
  (decisions 213 and 216). Conductor stores a dropped screenshot in the
  message text as `@⟦<name>⟧(<encoded path>)`, with a path that depends
  only on the file. PR #168 tied the digest to the message, so that each
  message's copy has its own folder.
- **Recommendation:** D, changed from C by the options check on 10
  November 2026. The path of a file then never changes, so no part of the
  app must build or rewrite it, at the cost of a rare second write of the
  same bytes to one path. C stays a sound choice, and it keeps the copy
  rules of the Worker as they are.
- **Action:** ask the user, because D changes the folder rule of
  decision 242 in `docs/protocol/messages-and-attachments.md`, and C, the
  earlier choice of the user, has real trade-offs against D.
- **Chosen:** C, by the user on 10 November 2026, before the options
  check added D, E, and F. The decision waits for the user again.

### 2. Where a file from the paperclip goes

Decision 263. Added on 10 November 2026 from the brainstorm. Changed on
10 November 2026 by the options check, which added options C and D and a
better root question. It kept the recommendation.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/components/AttachmentChips.tsx:139`
- **Background:** In all three composers, the paperclip button opens the
  file picker. Each picked file shows in the row above the text.
- **Problem:** The request gives chips in the text to dropped files only.
  If picked files stay in the row, the box shows files in two places.
- **Impact if no action:** The row stays beside the chips in the text,
  and each place needs every upload state.
- **Root question:** Where does each attached file show in the message
  box, whatever way the member attaches it? The options check wrote this
  question, because it also settles a later paste of a file.
- **Options:**
  - **A.** It goes into the text at the caret, as a dropped file does.
    The row above the text goes away. This removes a part that is on
    `main`. Effort: Small.
  - **B.** It stays in the row above the text. Only a dropped file goes
    into the text. Effort: Small.
  - **C.** Added by the options check. A picked file always goes at the
    end of the text. So its place never depends on a caret that the
    member set earlier. A picked file then never stands inside a
    sentence. Effort: Small.
  - **D.** Added by the options check. Each file goes into the text at
    the caret, as in A. The row stays, but only for the files that upload
    or failed, with the ring, Try again, and the ×. A ready file shows
    only as its chip. A file that uploads then shows in two places, and
    the box grows and shrinks as the row comes and goes. Effort: Medium.
- **Left out:** Drops only, with no paperclip: it breaks the phone layout
  and the keyboard, which cannot drop a file.
- **Wider fix:** None, because this is a design choice.
- **Previous examples:** None found.
- **Recommendation:** A, kept by the options check. A pick and a drop
  then work the same way, and the field shows the new chip with the caret
  after it.
- **Action:** ask the user, because A removes a part that is on `main`.
- **Chosen:** A, by the user on 10 November 2026. The options check kept
  A, so the choice stands.

## Design

Each call below is my call, made on 10 November 2026 under the decision
test, unless it names a decision.

### Where a file goes

- All three composers take a drop: the chat, the New workspace page, and
  the New workspace dialog. Reason: they share one field, and the request
  names the chat and New workspace.
- The drop target is the whole message box: the text, the bar, and the
  padding. A drop on the text puts the files at the place under the
  pointer, where the field shows the caret during the drag. A drop on the
  rest of the box puts them at the caret, or at the end when the field
  has no caret. Reason: this fits "the cursor" as the pointer and as the
  caret.
- A file from the paperclip goes to the caret, or to the end (decision
  263 A).
- A space follows each new chip, as after a pick of the `@` list
  (decision 213). The caret then stands after the last new chip, and the
  field takes the focus.
- The files of one drop or pick go in their order, as one step of undo.
- While files hover over the box, the box shows a drop state with a
  full border. Mockup Milestone 1 draws it.
- While the composer takes no change, such as during a create, the box
  takes no drop. The pointer shows that a drop does nothing.
- A file drop outside each message box does nothing. Reason: the browser
  would open the file in place of the app, and the drafts live only in
  memory. The Mac app already drops that navigation.
- A dropped folder is not attached. The notice over the box names it and
  says to attach its files. A file over 25 MB gets no chip, and the
  notice names it, as now. Reason: a folder upload fails, and a failed
  chip that Try again cannot fix tells the member nothing.
- A paste of a file or an image stays out of scope. A paste stays plain
  text, as now.

### The chip in the message field

- Each attached file is a chip in the text. It is one unit of the text,
  as a file chip is: Backspace and Delete remove it whole, and the arrow
  keys step over it.
- The chip has the inline size of a file chip. Its icon cell shows the
  kind of the file, the upload ring, the spinner, or the failed mark. Then
  come the name and a muted label: the share that uploaded, "Uploading",
  the size, or "Failed". A failed chip offers Try again in the chip. Its
  Try again takes the keyboard focus.
- The × of the icon cell removes the chip where a pointer hovers. Where
  no pointer hovers, a × at the end removes it (decision 217).
- A chip that leaves the text takes its file off the draft and stops its
  upload. Undo brings back the chip and the file. A ready file comes back
  ready, and a stopped upload starts again. Reason: the draft never sends
  a file that its text does not show.
- A copy or a cut of a chip in the field gives the name of its file as
  plain text. Reason: with C, the path does not exist before Send,
  because the chat makes the message ID at Send. "What decision 262
  changes" gives the copy with D.
- A cut and a paste, or a drag, inside the same field keeps each chip
  with its file. The field keeps the field text of its last copy, cut, or
  drag, with its marks. A paste or a drop whose plain text is that copy
  takes the kept text, and each mark of a file of the draft becomes its
  chip again. A drag of a workspace chip or a file chip then keeps it as
  a chip too. A paste in another place gives the plain text. Reason: the
  browser's own drag gives only the words that a chip shows, so a drag
  turns the chip into text and takes its file off the draft. The options
  check found this.

### The draft and the send

- The draft text holds a mark for each attached file at its place: the
  draft ID of the file between the private-use characters U+E000 and
  U+E001. Typing and a plain paste cannot make a mark. The field drops a
  mark of a file that its draft does not hold.
- The field writes each mark with the spaces of a mention, as
  `joinFieldParts` does for a file chip. So the mention that replaces the
  mark at Send stays one mention.
- The draft keeps each file whose chip left the text as a detached file
  until the draft ends, so that undo can bring it back. A send, a
  sign-out, and a new draft end the detached files.
- Send marks the draft as sending, then builds the text: each mark
  becomes `@` and the path of its file. With C, the browser builds each
  path from the message ID, the attachment ID, and the stored name. The
  send then sends that text, with the attachment IDs in the order of the
  chips.
- With C, the path builder uses Web Crypto. The app already needs a
  secure context for `crypto.randomUUID`, and the Mac app's scheme is
  secure, so the browser has it.
- After a send, the draft text clears when it is still the draft text,
  with its marks, that the send took. A failed send keeps the draft, its
  marks, and its message ID. So Send again sends the same text.
- Each change that takes a file off the draft without its chip also
  takes its mark out of the text: a send whose text the member changed
  during the send, a model change that keeps fewer files, and a sign-out.
  Reason: the text never shows a chip without its file. The options check
  found the case of the send.
- A model change to another agent sends the draft text with its marks.
  The Worker only compares and returns that text.
- The New workspace message still needs words outside its chips, as
  now. A message in a chat can hold only files, as now.
- A sign-out on New workspace drops the files and their marks.

### The sent message

- The Worker gives each file of a sent message its `path`, the relative
  path of decision 242, when it accepts the message. A stored message from
  before this change has no path. Its files show under the message.
- A mention in a sent message whose path is the path of one of its files
  shows as a chip of that file, with its kind, its name, and its size.
  This holds in every chat, also in an archived one, because the chip
  comes from the message itself.
- A file of the message with no chip in its text shows under the message,
  as now.
- A copy of a sent chip gives its mention, as for a file chip.
- The agent gets the text unchanged, with each mention, then the read
  lines (decision 244).

### Titles, copies, and Try again

- In a session title and in the workspace title request, each mention of
  a file of the message becomes the name of the file. A message whose
  text holds only such mentions gives no title, and starts no title
  request. Reason: a path makes a poor title, and a message with only a
  screenshot gives no title today.
- In a transcript copy, each mention of a file of the message becomes the
  name of the file. The attachments line lists only the files that the
  text does not show.
- With C, Try again sends under a new message ID, so the Worker rewrites
  each mention of a file of the message to the new path. The folder rule
  of decision 242 stays.
- The browser, the Worker, and the development fakes share one mention
  syntax in `src/shared/`. The Worker and the fakes share one path
  builder there, and with C the browser uses it too.

### What decision 262 changes

The design above follows C, the earlier choice of the user. With D, these
parts change, and the rest stays:

- The digest of the copy folder comes from the file ID only. The folder
  rule of decision 242 in `docs/protocol/messages-and-attachments.md` and
  the path rules in `worker/chat/attachments.md` change.
- The upload reply gives the `path` of each file, and Send writes it at
  each mark. The browser has no path code and no Web Crypto.
- Try again sends the same text, with no rewrite.
- A copy of a ready chip in the field gives its mention. A paste of a
  mention of a file of the draft gives its chip back. A chip that uploads
  or failed still gives its name.
- Each message still copies its files before it goes out, so a later
  message with the same file, such as Try again, writes the same bytes to
  the same path again. My call: keep one copy for each message, as now,
  so that Try again gives the agent the original bytes. A copy proof for
  each file was not chosen, because a later message would then read a
  copy that an agent changed or deleted.
- Two messages with the same file on one computer at the same time can
  then write one path while an agent reads it. The composers make such
  messages only after a send whose reply was lost, and an edit and a new
  send.
- A command stored before the change holds an old path. Its copy fails
  once, and Try again works. No converter stays, because the project is
  not in production.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show the chips in the text in each composer, the drop state,
the drop at a place, a folder that was not attached, and the chips of a
sent message. Each page keeps a desktop and a phone variant.

- [ ] Add a pure mockup part for the file chip of the message field, on
      `InlineChip.module.css`, `ChipRemove`, `attachmentCopy.ts`, and
      `sizes.ts`: the icon cell with each glyph, the name, the muted
      label, Try again in a failed chip, and the × of each pointer kind.
- [ ] Add a pure mockup part for the file chip of a sent message: the
      kind icon, the name, and the muted size.
- [ ] Put the file chips into the text of the message field mockup, and
      remove the row of attached files above the text.
- [ ] Update `app/composer`: two uploaded files in a sentence.
- [ ] Update `app/attachments`: a file that uploads, a failed upload, a
      file over 25 MB, a sent message with its chips in the text, and a
      first message with files.
- [ ] Add `app/attachments/drop`: files over the box with the drop caret
      in the text, the files at that place after the drop, and a folder
      that was not attached. Its phone variant shows a pick at the caret.
- [ ] Update `app/file-mentions/chips/attached-file`: remove a file chip
      of the text.
- [ ] Update `app/new-workspace/files` and every New workspace state
      that shows files.
- [ ] Add the flow `user-flows/drop-a-file`: a drag of a screenshot onto
      the chat box, the drop, the upload, Send, and the sent message with
      the agent's answer.
- [ ] Update the rows of `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages, and save
      the screenshots under `.context/composer-file-drops/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of decisions 262 and 263 and of
the design calls above that are requirements.

- [ ] Update `docs/protocol/messages-and-attachments.md`: the drop, the
      place of each file, the chip in the text, the mention in the text,
      the sent chips, the files under the message, the order of the
      files, Try again, the workspace title request, folders, and drops
      outside the box. With D, also change the folder rule of decision
      242.
- [ ] Update `docs/protocol/file-mentions.md`: the mention of an attached
      file, the sent chip of each file of the message, and the removal of
      a file chip of the text in place of the row above it.
- [ ] Update `docs/protocol/workspace-links.md#the-message-field`: the
      field holds the chips of attached files too.
- [ ] Update `docs/protocol/session-transcripts.md`: the names in place
      of the mentions, and the attachments line.
- [ ] Update `docs/protocol/agents-and-sessions.md#sessions`: the names
      in a session title, and no title from a message with only files.
- [ ] Read `docs/protocol/create-a-workspace.md` and
      `docs/architecture.md`, and update each sentence about the files of
      a message.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` in full. Update each sentence
      that restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence about attached files, such as in `sessions-and-chat.md`.
- [ ] Read the `attachments` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`, and update
      its note when it restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Shared paths, sent paths, titles, and Try again

Depends on: 2

The Worker, the browser, and the development fakes share the mention
syntax and the path builder. Each sent file carries its path. Titles,
transcript copies, and Try again read the mentions of the files. The
TODOs marked C or D apply only to that option of decision 262.

- [ ] Move `src/chat/mentions/mention-text.ts` to `src/shared/`, and move
      each consumer and test to it.
- [ ] Move `attachmentPath`, `safeName`, and `ATTACHMENTS_DIRECTORY` to
      `src/shared/attachment-paths.ts`. Move the Worker consumers and the
      tests of the path.
- [ ] D: make the digest come from the file ID only, in the path builder
      and in the path check of `worker/chat/attachment-copy.ts`.
- [ ] Add the path of each file to `src/shared/messages.ts`. C: a sent
      attachment has `path: string | null`. D: every attachment has it,
      also the upload reply, and `src/app/attachment-upload.ts` reads it.
- [ ] Set `path` of each file in `resolveMessageAttachments`. Read it in
      `src/chat/api/read-chat.ts` and `src/app/api/read-workspaces.ts`,
      with null for a stored message without it.
- [ ] Add `src/shared/attachment-mentions.ts`: the file of a mention, the
      text with the names of the files, and the test for own words. C:
      also the move of the paths to another message ID.
- [ ] Use the names in `worker/chat/session-titles.ts` and
      `worker/chat/workspace-titles.ts`. Start no title from a message
      with only file mentions.
- [ ] C: rewrite the paths of the text in `retryMessage` of
      `worker/chat/send-message.ts`.
- [ ] Use the names and the shorter attachments line in
      `src/shared/transcript/markdown-items.ts`.
- [ ] Give the development fakes in `src/chat/dev/`, `src/app/dev/`, and
      `src/test-support/` the paths and the titles. C: also the rewrite.
- [ ] Update `worker/chat/attachments.md` and `src/shared/README.md`. D:
      also the copy rule of a later message with the same file.
- [ ] Add the tests of the path of a sent file, the titles, and the copy.
      C: also the rewrite. D: also the path of an upload. See each fail
      first.

## Milestone 4: Sent messages show each file at its place

Tags: ui

Depends on: 1, 3

- [ ] Add a part for a mention of a file of the message to
      `src/chat/links/chat-parts.ts`.
- [ ] Draw that part in `src/chat/links/LinkedText.tsx` with the mockup
      part of the sent chip. Give it the mention for a copy, as
      `mention-copy.ts` reads it.
- [ ] Make `UserBubble` give the files to the text, and make `SentFiles`
      list only the files without a chip.
- [ ] Update the key code of `src/chat/README.md`.
- [ ] Add the tests of the sent chip, the shorter list, and the copy.

## Milestone 5: The file chip of the message field

Tags: ui

Depends on: 1, 2

The field can hold and draw a chip for each file of its draft. No
composer puts one there yet.

- [ ] Add `src/app/draft-marks.ts`: the mark of a file, the marks of a
      text, and the text without its marks.
- [ ] Add the decorator node of an attached file to
      `src/chat/components/chip-field/`, with the mark as its text.
- [ ] Give the field its files through a source: the file of each mark
      and Try again. Drop a mark of a file that the draft does not hold.
- [ ] Write each mark with the spaces of a mention in `$fieldText`.
- [ ] Draw the chip with the mockup part and the live state of its file.
- [ ] Make a copy of a file chip give the name of its file. D: a ready
      chip gives its mention, and a paste of that mention gives the chip
      back.
- [ ] Add the caret at a point of the field, from the caret position of
      the browser.
- [ ] Keep the field text of the last copy, cut, or drag, with its marks.
      Make a paste or a drop of that copy in the same field give back its
      chips, and make a drag carry the plain text of a copy.
- [ ] Add `insertFiles` to `FieldHandle`: chips at a point, at the caret,
      or at the end, each with a space, in one step of undo, then the
      focus.
- [ ] Update the message field rules of `src/chat/loads-and-sends.md`.
- [ ] Add the DOM tests of the insert, the removal, undo, the copy, the
      cut and paste, the drag inside the field, and each state of the
      chip.

## Milestone 6: Each composer puts its files in the text

Tags: ui

Depends on: 3, 4, 5

- [ ] Make the attach of each draft give the new file IDs at once, while
      the uploads run.
- [ ] Bring the files of each draft in line with the marks of each new
      text: detach and stop a file whose chip left, and bring back a
      detached file whose chip came back.
- [ ] Build the text of each send from the marks and the paths, after
      the draft is marked as sending. Clear the draft text when it is
      still the draft text, with its marks, that the send took.
- [ ] Take the mark of each file out of the text when the file leaves
      the draft without its chip: a send whose text changed during the
      send, a model change that keeps fewer files, and a sign-out.
- [ ] Apply the same rules to New workspace: the attach, the detached
      files, the send text, the need for words, and the sign-out.
- [ ] Make the paperclip of each composer insert its files at the caret.
- [ ] Remove the row above the text, `DraftFiles`, `DraftChip`, the
      `onRemoveFile` props, and the remove actions. Move their tests to
      the chips of the text.
- [ ] Update `src/chat/README.md`, `src/chat/loads-and-sends.md`, and
      `src/app/README.md`.
- [ ] Add the tests of the detach, the return, the send text, the marks
      that leave with their files, the order of the files, and New
      workspace.

## Milestone 7: Drops into each composer

Tags: ui

Depends on: 6

- [ ] Add a drop hook for the message box: file drags only, the drop
      state, no drop while the composer takes no change, and the split of
      files and folders.
- [ ] Make the box of each composer a drop target, which attaches the
      files and inserts them at the caret of the point.
- [ ] Name each dropped folder in the notice over the box.
- [ ] Ignore each file drop outside a message box, from the root of the
      app.
- [ ] Set the `drag-and-drop-attachments` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts` to Available,
      with a note of what a member can do, as
      `docs/protocol/conductor-comparison.md#statuses` says. Reason: the
      merge of this change ships the feature, and the row stays Under
      consideration on `main` until then.
- [ ] Update `src/chat/README.md` and `src/app/README.md`.
- [ ] Add the DOM tests of the drop, the drop state, a box that takes no
      change, a folder, and a drop outside the box.
- [ ] Smoke-test a drop in Chrome on the development page and in the app.
      Save the screenshots under `.context/composer-file-drops/`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, drop a screenshot into a chat of a running
      workspace. Check that the agent reads the file at the path of the
      mention, and that the sent message shows the chip.
