# Drop files into the composer as chips in the text

Status: Active. On branch `calummoore/composer-file-drag-and-drop`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today the paperclip button of each composer attaches files, and their
chips show in a row above the text. A member cannot drop a file on the
message box, and the text cannot say where each file belongs. This change
lets a member drop files on the composer of the chat, of the New workspace
page, and of the New workspace dialog. Each file then shows as a chip in
the text at the caret, as a file chip of the `@` list does. A file from
the paperclip goes there too, and the row above the text goes away. The
sent message keeps each chip at its place. A press on a sent chip opens
the file tab of the copy of the file in the cloud computer. The agent
reads the path of each file at that place.

The user approved the implementation of all milestones and TODOs of this
plan on 10 November 2026: "impl all plan milestones and tasks". The user
did not override the actions of the `models` skill, so the
`default orchestrator` action runs the milestones.

On 11 November 2026, the user directed the orchestrator to commit and push
the verified mockup work, then continue every unblocked task through
Milestone 8. This instruction permits that work before all dependency
TODOs are complete. Composer drops decisions 1 and 2 remain unanswered.
Only the phone controls, their protocol text and field touch areas wait
for decision 1. Only the mixed-drop mockup and notice words wait for
decision 2. No option may be applied before the user answers.

The message text holds a mention of the copy path of each file, such as
`@.context/attachments/<digest>/a.png`. The digest comes from the file ID
only, so the path of a file never changes (decision 262 D). The read lines
after the text stay as decision 244 says. The file tab shows each PNG,
JPEG, GIF, and WebP file up to its read limit as a picture, also an
attached screenshot (decision 265 B).

This change does not cover a paste of a file or an image, a drop of a
folder's files, a drop on other parts of the app, or a picture of each
image in the sent message. The brainstorm notes and the reports of the
options checks are in `.context/composer-file-drops/`.

Contract owners:

- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Message attachments](../docs/protocol/message-attachments.md), which
  holds the attachment requirements after the protocol split on `main`.
- [File mentions](../docs/protocol/file-mentions.md).
- [Workspace links](../docs/protocol/workspace-links.md#the-message-field).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- [Agents and sessions](../docs/protocol/agents-and-sessions.md#sessions).
- [Tools of a workspace](../docs/protocol/workspace-tools.md#files-and-changes),
  for the file tab of an image.
- The [chat README](../src/chat/README.md) and
  [Loads, records, and sends](../src/chat/loads-and-sends.md).
- The [files README](../src/files/README.md).
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
  mockups, and the docs that name the row. Moved in Milestones 1, 2, and 7.
  Deleted in Milestone 7.
- Remove through `onRemoveFile` of each composer → removal of the chip
  from the text, which takes its file off the draft. Consumers: the
  `onRemoveFile` props, `removeFile` in
  `src/chat/state/attachment-actions.ts`, `NewWorkspaceModel.removeFile`,
  and `DraftUploads.remove`. Moved and deleted in Milestone 7.
- A copy path from the message ID and the file ID → a copy path from the
  file ID only, built once in `src/shared/`. Consumers: `attachmentPath`
  and `safeName` of `worker/chat/attachment-record.ts`,
  `attachment-claims.ts`, the path check of `attachment-copy.ts`, the docs
  that state the digest, and their tests. Moved and deleted in
  Milestone 3.
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
  app must build or rewrite it.
- **Action:** ask the user, because D changes the folder rule of
  decision 242 in `docs/protocol/messages-and-attachments.md`.
- **Chosen:** C, by the user on 10 November 2026. Then D, by the user on
  10 November 2026, after the options check added it.

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

### 3. What a press on a sent file does

Decision 264. Added on 10 November 2026 from the message of the user that
chose decision 262 D. Changed on 10 November 2026 by the options check,
which added option D and kept the recommendation.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/chat/links/LinkedText.tsx:50`
- **Background:** A press on a file chip of a sent message opens the file
  tab, as a press in All files does (decision 213). The Worker copies
  each attached file into `.context/attachments/` of the repository
  folder when its turn starts. Git ignores that folder, so All files does
  not list the copies. The file tab reads any path of the repository.
- **Problem:** The design of decision 262 gave the chip of a sent file no
  press.
- **Impact if no action:** A member cannot see an attached file again
  after Send.
- **Root question:** How does a member see an attached file of a sent
  message?
- **Options:**
  - **A.** The chip opens nothing. It shows the name and the size only.
    Effort: Small.
  - **B.** A press opens the file tab of the copy in the cloud computer,
    as a press on a file chip opens its file. Effort: Small.
  - **C.** A press opens the file from the app's own storage, which keeps
    each file up to 25 MB for the life of the workspace. It works while
    the cloud computer is stopped, and in an archived workspace. It gives
    the original bytes, also after an agent changed the copy. It needs a
    new read route with its access checks. Effort: Large.
  - **D.** Added by the options check. As B. Where the copy cannot show,
    the member downloads the original from the app's storage. This covers
    an archived workspace, a message that has not gone out, a copy that
    failed or that an agent deleted, and a file over 5 MiB. With decision
    262 D, the Worker finds the stored file of a copy path, because the
    path comes from the file ID only. It needs the read route of C, the
    fallback states of the sent chip and the file tab, and a rule in
    `docs/protocol/isolation.md` for who can read a stored file. The
    route also serves options C and D of decision 265. Effort: Large.
- **Left out:**
  - A view outside the file tab, such as a dialog over the chat: it
    breaks the user's choice, which names "the preview page".
  - The copies in All files: it breaks a requirement that stays in
    `docs/protocol/repository-folders.md#the-context-folder`, which keeps
    the context folder out of All files.
- **Wider fix:** None, because this is a design choice.
- **Previous examples:** File chips open their files (decision 213).
- **Recommendation:** B, kept by the options check. The user asked for
  it: "because its in .context, when the user clicks on it, they see the
  preview page as with any file that's presented". D can add the stored
  original later with no change to B.
- **Action:** ask the user, because B adds a press that no requirement
  covers.
- **Chosen:** B, by the user on 10 November 2026. The options check kept
  B, so the choice stands.

### 4. How an attached image looks when it opens

Decision 265. Added on 10 November 2026 by the working agent, from
decision 264. Changed on 10 November 2026 by the options check, which
added options D and E and a better root question. It kept the
recommendation.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `src/files/page/FileBody.tsx:28`
- **Background:** A press on a sent file opens its file tab (decision
  264 B). The file tab shows Markdown rendered, and other text with line
  numbers. It shows each other file, also a PNG or a JPEG, as "Download
  this file to open it". The file tab reads at most 5 MiB of a file, and
  over that limit it offers no Download. Most attached files are
  screenshots, and an attached file can hold up to 25 MB. The words of
  the user, "the image will be part of the message embed", can mean the
  chip, or a picture of the image in the message.
- **Problem:** A press on an attached screenshot shows no picture, only a
  Download button.
- **Impact if no action:** A member must download each screenshot to see
  it.
- **Root question:** How does a member see the picture of an attached
  image? The options check wrote this question, because the options also
  choose where the picture shows and which bytes it uses.
- **Options:**
  - **A.** The file tab as it is. An image shows "Download this file to
    open it". Effort: Small.
  - **B.** An image view in the file tab. A PNG, JPEG, GIF, or WebP file
    up to the 5 MiB read limit shows as a picture that fits the tab. This
    holds for every image of the workspace, also one from All files. A
    larger image keeps the state of the read limit, "Open this file in
    the terminal". Effort: Medium.
  - **C.** As B, and the file tab of an attached image over 5 MiB reads
    the image from the app's own storage, up to 25 MB. It needs a new
    read route for attached files, with its access checks. Effort: Large.
  - **D.** Added by the options check. As B, and each attached image of
    a sent message also shows as a small picture in the message, from the
    app's storage. A press on the picture opens the file tab. The picture
    shows also while the cloud computer is stopped, in an archived
    workspace, and up to 25 MB. It needs the read route of C, a read rule
    in `docs/protocol/isolation.md`, and a fixed box for each picture, so
    that a late picture does not move the chat. The Mac app loads its page
    from its own scheme, so each picture there needs a fetch and a data
    URL. Effort: Large.
  - **E.** Added by the options check. As B, and each attached image of a
    sent message also shows as a picture in the message, read from its
    copy, with no new route. It shows no picture while the cloud computer
    is stopped or starts, in an archived workspace, or over 5 MiB. Each
    picture is a read of up to 5 MiB, so a chat with many screenshots
    makes many large reads. Each picture also needs the fixed box of D.
    Effort: Large.
- **Left out:**
  - A view outside the file tab: it breaks decision 264 B, which opens
    the file tab.
  - A higher read limit: the Boat file read stops at 5 MiB, as
    `docs/protocol/workspace-tools.md#files-and-changes` says, and that
    reason holds.
- **Wider fix:** None, because this is a design choice.
- **Previous examples:** None found.
- **Recommendation:** B, kept by the options check. A press on a
  screenshot then shows the screenshot in the preview page that the user
  named, for each image of the workspace, with no new route. C helps for
  Retina screenshots of a whole screen, which can pass 5 MiB. D fits best
  if "the message embed" means a picture in the message.
- **Action:** ask the user, because the options have real trade-offs,
  and B to E add a view that the request does not name.
- **Chosen:** B, by the user on 10 November 2026.

### 5. Touch controls of an inline attached file

Composer drops decision 1. Added on 11 November 2026 from the mockup
check. The second-pass options check ran on 11 November 2026. The short
name follows [Decision numbers](../docs/architecture.md#decision-numbers).

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation. **Category:** Mockup.
- **Location:** `docs/mockups/src/components/chat/ChipRemove.module.css:67`,
  `docs/mockups/src/components/chat/AttachedFileChip.module.css:41`
- **Terms:**
  - **Touch area:** the part of the screen that takes a tap for a control.
    It can be larger than the control that the screen draws.
- **Background:** Each attached file now stands in the text as a chip.
  Its remove button is 18 px high, and Try again is 17 px high.
  The phone design asks for touch areas of at least 44 px.
  The file-mentions protocol says that an attached file keeps a remove
  button of touch size.
- **Problem:** The inline controls do not meet that attachment rule.
  A larger area can overlap the text or another chip on the next line.
  The field also clips such an area at its first and last lines.
- **Impact if no action:** The mockups and protocol disagree.
  The phone controls cannot be completed without choosing their touch rule.
- **Root question:** How does a member use Remove and Try again on a touch
  screen while each chip keeps the height of its line?
- **Options:**
  - **A.** Keep the controls at the line height, as ordinary inline chips
    work today. Record an exception to the 44 px attachment rule.
    Targets stay small. Effort: Small.
  - **B.** Give all inline chip controls a touch area of 44 px in height.
    Keep their drawn sizes. Add room inside the field's scroll box.
    A drawn control must take its own tap before another control's larger
    area. Adjacent text can still become part of a control's touch area.
    This also changes existing workspace and file chips. Effort: Small.
  - **C.** Keep the end remove button. On a phone, also put the selected
    chip's controls in a bar above the field. The bar gives a full-sized
    touch path, with another tap to select the chip. Effort: Medium.
  - **D.** As B, but only for attached-file controls. Existing workspace
    and file chips keep their current touch areas. Attached chips still
    need room and tap priority inside the field. Effort: Small.
  - **E.** As D for Remove. On a phone, put Try again in a notice above
    the box, with a touch-sized button. The failed file then appears in
    two places, and phone and desktop layouts differ. Effort: Medium.
- **Left out:** A file row above the text fails decision 263 A.
  Taller chips or taller text lines break the approved inline sizing.
  A long-press sheet, an icon replaced by a permanent remove button, or
  Backspace alone breaks the removal choice of decision 217.
- **Wider fix:** B. Shared controls use one touch rule.
- **Previous examples:** The workspace header and marketing text enlarge
  small controls over static text. An editable field has different tap
  behavior, because a tap places its caret.
- **Recommendation:** B, kept by the options check. It keeps the existing
  attachment touch rule and gives inline controls one shared rule.
- **Action:** ask the user, because the options trade larger targets
  against taps on adjacent text, and A changes a protocol requirement.
- **Chosen:** Waiting for the user. This blocks the phone control mockups,
  the corresponding protocol text in Milestone 2, and the field in Milestone 6.

### 6. Notice for folders and large files together

Composer drops decision 2. Added on 11 November 2026 from the mockup
check. The second-pass options check ran on 11 November 2026 and added D.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation. **Category:** UX wording.
- **Location:** `docs/mockups/src/components/chat/attachmentCopy.ts:33`,
  `docs/mockups/src/screens/composerNotice.tsx:63`
- **Background:** A drop can hold folders and files over 25 MB.
  The approved plan gives them no chip and names every folder in a notice.
  Current words cover one folder, or a name or count of large files.
- **Problem:** The mockup does not define the notice for several folders
  or for folders and large files together.
- **Impact if no action:** The combined-drop notice and its tests remain
  undefined for Milestone 8.
- **Root question:** How does the box name the items of one drop that it
  did not attach when their reasons differ?
- **Options:**
  - **A.** Use one notice for folders and one for large files.
    Each notice keeps its own reason and action. Two notices take more
    room, and their actions open the same file picker. Effort: Small.
  - **B.** Use one notice with a count such as "2 items weren't attached".
    Its body names each folder and gives the reasons. It offers
    "Attach files" when a folder is present. This changes the current
    file-only count title too. Effort: Small.
  - **C.** Use one notice with every refused name in its title.
    Its body gives the reasons. It offers "Attach files" when a folder
    is present. Long name lists make a long title. Effort: Small.
  - **D.** Use one notice whose title counts each kind:
    "2 files weren't attached", "2 folders weren't attached", or
    "1 folder and 1 file weren't attached". Its body names every folder
    and gives the reasons. It offers "Attach files" when a folder is
    present. File-only notices keep their current words. Effort: Small.
- **Left out:** A failed chip for a refused item breaks the no-chip rule.
  Refusing the whole drop discards files that can attach.
  A toast replaces the required notice. One notice per file changes the
  existing grouped large-file notice.
- **Wider fix:** None. This is a wording and notice-layout choice.
- **Previous examples:** Large files already use one count title.
- **Recommendation:** D, changed from B by the options check.
  It keeps the current file-only words and gives each kind its name.
- **Action:** ask the user, because the alternatives are correct notices
  with different layouts and words, and no rule chooses among them.
- **Chosen:** Waiting for the user. This blocks the mixed-drop mockup and
  the notice words in Milestone 8.

## Design

Each call below is my call, made on 10 November 2026 under the decision
test, unless it names a decision or another date.

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
- During a file drag over the text, the field draws a drop caret at the
  point under the pointer. It is 2 px wide, as high as the text line, and
  in the accent colour. The real caret moves only at the drop. Reason: a
  cancelled drag then leaves the member's selection unchanged. This is my
  call on 10 November 2026, from the mockup check.
- In the New workspace dialog, the message box is the whole dialog card.
  Its full border shows the drop state. Reason: the card holds the text,
  the controls, and their padding as one message box. This is my call on
  10 November 2026, from the mockup check.
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
- The Feedback dialog keeps its screenshot row. Reason: this change covers
  only the three chat composers, and the Feedback requirements still give
  screenshots their own row. This is my call on 10 November 2026, after
  Feedback merged into `main` during the mockup milestone.
- The app's file-drop guard prevents default browser navigation and keeps
  the existing Feedback screenshot drop and paste handlers. Reason: the
  user's preservation rule covers the Feedback feature that merged into
  `main` during this work. This is my call on 11 November 2026.

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
- A press on the name of a chip in the field opens nothing. Reason: the
  cloud computer gets the file only when the turn of its message starts.
- A chip that leaves the text takes its file off the draft and stops its
  upload. Undo brings back the chip and the file. A ready file comes back
  ready, and a stopped upload starts again. Reason: the draft never sends
  a file that its text does not show.
- A copy or a cut of a ready chip gives its mention, as for a file chip.
  A copy or a cut of a chip that uploads or failed gives the name of its
  file. A paste of a mention of a file of the draft gives its chip back,
  also of a file whose chip left the text. A paste in another composer
  gives the mention as text.
- A cut and a paste, or a drag, inside the same field keeps each chip
  with its file. The field keeps the field text of its last copy, cut, or
  drag, with its marks. A paste or a drop whose plain text is that copy
  takes the kept text, and each mark of a file of the draft becomes its
  chip again. A drag of a workspace chip or a file chip then keeps it as
  a chip too. Reason: the browser's own drag gives only the words that a
  chip shows, so a drag turns the chip into text and takes its file off
  the draft. The options check found this.

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
- The upload reply gives the `path` of each file (decision 262 D). Send
  writes `@` and that path at each mark, and it sends the attachment IDs
  in the order of the chips. Send waits until each file is ready, as now,
  so each file has its path.
- After a send, the draft text clears when it is still the draft text,
  with its marks, that the send took. A failed send keeps the draft and
  its marks. So Send again sends the same text.
- Each change that takes a file off the draft without its chip also
  takes its mark out of the text: a send whose text the member changed
  during the send, a model change that keeps fewer files, and a sign-out.
  Reason: the text never shows a chip without its file. The options check
  found the case of the send.
- A model change to another agent sends the draft text with its marks.
  The Worker only compares and returns that text.
- The New workspace message still needs words outside its chips, as
  now. A message in a chat can hold only files, as now.
- The mockups and the app share one draft mark syntax. The pure mockup
  helper moves to `src/app/draft-marks.ts` when the live field starts.
  Reason: two parsers of the same marks can disagree. This is my call on
  10 November 2026.
- Literal draft text uses a lossless escape for U+E000, U+E001, and
  U+E002. U+E002 followed by `0`, `1`, or `2` represents that literal
  character. A file mark keeps U+E000, its ID, and U+E001. Reason: a valid
  file mention or workspace link must not collide with a file mark.
  This is my call on 11 November 2026, after the checked implementation
  finding.
- The helper reads escaped literal text back as text. Send uses that text
  and the path of each file mark. A change that rebuilds internal draft
  text uses the helper's writer, so it keeps the escapes. The Worker still
  compares and returns the opaque draft string. Reason: every draft
  reader must keep the same text. This is my call on 11 November 2026.

### The copy path

- The copy path of a file is `.context/attachments/<digest>/<safe name>`.
  The digest is 32 lowercase hexadecimal characters from the file ID
  only (decision 262 D). The safe name keeps its rule.
- Each message still copies its files before it goes out, so a later
  message with the same file, such as Try again, writes the same bytes to
  the same path again. Reason: Try again then gives the agent the
  original bytes. A copy proof for each file was not chosen, because a
  later message would then read a copy that an agent changed or deleted.
- Two messages with the same file on one computer at the same time can
  write one path while an agent reads it. Only a send whose reply was
  lost, then an edit and a new send, makes such messages.
- A command stored before the change holds an old path. Its copy fails
  once, and Try again works. No converter stays, because the project is
  not in production.
- A stored copy proof is reused only when the command holds the current
  path of each file. Reason: an old proof must not bypass the planned
  failure of a command with an old path. This is my call on 11 November
  2026, from the implementation check.

### The sent message

- Each file of a sent message has its `path`. A stored message from
  before this change has a path of the old rule. Its text holds no
  mention of it, so its files show under the message.
- A mention in a sent message whose path is the path of one of its files
  shows as a chip of that file, with its kind, its name, and its size.
  The chip shows in every chat, also in an archived one, because it comes
  from the message itself.
- A press on a sent chip opens the file tab of its path, as a press on a
  file chip does (decision 264 B). A press may start a stopped cloud
  computer, as the open of any file does. All files does not list the
  copy, so the tab shows "File" until its read names the copy by its safe
  name, as for each path that no list names.
- The chip opens nothing while its message has not gone out to the
  agent, as while it waits for the cloud computer, or after the copy of
  its files failed. Reason: the copy comes with the turn, and a message
  goes out only after its copy. The chip opens nothing in a chat without
  the files of its workspace, such as in an archived workspace.
- A press on a chip whose copy an agent deleted, or that a later cloud
  computer does not hold, shows "This file moved or was deleted", as for
  each file. Option D of decision 264 would offer the original there. The
  options check found this case.
- A file of the message with no chip in its text shows under the message,
  as now.
- The bubble uses one reading of its text for both the chips and the
  remaining file list. Reason: a mention in code is not a chip, so its
  file must stay in that list. This is my call on 11 November 2026.
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
- Try again sends the same text and the same files, under a new message
  ID, as now. Each path stays right, because it comes from the file only.
- The browser, the Worker, and the development fakes share one mention
  syntax in `src/shared/`. The Worker and the development fakes share one
  path builder there. The browser reads each path from the replies.

### The image view

These calls follow decision 265 B.

- The file tab shows a PNG, JPEG, GIF, or WebP file as a picture, by the
  name of the file. Reason: the runner starts a GIF or a WebP read with
  `text/plain`, then uses `application/octet-stream` for non-text bytes.
  The Boat file read gives `application/octet-stream` for each binary
  file. The options check found the generic types. The implementation
  check corrected this reason on 11 November 2026.
- The picture comes from a `data:` address of the bytes that the file
  response holds. Reason: the content security policy of both apps lets
  an image load from `data:`, but not from `blob:`. The options check
  found this.
- The picture keeps its proportions and fits the width and the height of
  the tab. A smaller picture keeps its size.
- When the browser cannot draw the bytes, the tab shows "Download this
  file to open it", as for each binary file now. The options check found
  this case.
- The header of the tab keeps Copy and Download. Copy is off for a
  picture, as for every binary file now.
- An SVG file stays text with line numbers, as now. Reason: its source is
  what a member edits.
- The mockup pictures use fixed SVG drawings, while the app reads the real
  bytes from a `data:` address. Reason: Mokly's static document rules do
  not accept `data:` image addresses. This is my call on 10 November 2026.

The UI implementor made these calls on 11 November 2026 under the approved
image behavior:

- The page learns each picture's size with a detached `Image` before it
  draws the mockup part. It shows "Opening the file" during the first
  decode. Reason: the layout needs the picture's size.
- A changed picture stays visible until the browser draws or refuses the
  new bytes.
  Reason: the file tab keeps its content during a refresh, as its Markdown
  preview does.
- A decode with no picture size uses the Download state. An image file
  with no bytes keeps "This file is empty". Reason: neither can draw a
  picture, and an empty file already has its own state.
- A read sent as UTF-8 becomes UTF-8 bytes, then base64, for the data
  address. Reason: the address must preserve the read's bytes.
- The picture's `alt` uses the masked path label, with no `title`.
  Reason: the same label names the header and hides private path values.
- The app sizes its `img` through the page CSS beside the mockup layout.
  Reason: the mockups size an SVG child, while the app draws an image.

### Details from the mockup check

The UI implementor made these visual calls on 10 November 2026. They
refine the approved chip and image layout.

- The muted chip label uses the label font at 0.85 em. The chip title is
  the original file name. Reason: the label stays smaller than the name.
- Try again is underlined text in the failed chip. Reason: a standard
  button is taller than the text line. The phone form waits for
  composer drops decision 1.
- A screen reader hears "Attached file" before the file name. Reason:
  the spoken name distinguishes an attachment from an ordinary file chip.
- A sent chip uses the ordinary file chip colours at rest and its link
  hover. Reason: the two chips open files in the same way.
- The drop state uses a 1 px full border and a 1 px ring in the accent
  colour. It keeps the box fill and adds no hint text. Reason: the border
  shows the target without taking room from the draft.
- The folder notice offers "Attach files" to open the picker. Reason:
  the member can then select the folder's files.
- The phone drop mockups show a pick at the caret before and after the
  insertion. The folder state still shows its notice. Reason: the same
  composer supports both a pick and a drop.
- A picture stands in the middle of its tab with a hairline around it.
  Its tab uses the ordinary non-code file icon. Reason: a light picture
  needs an edge on a light tab, and All files uses that icon for images.
- A picture that does not decode keeps the existing binary-file words
  and Download action. Reason: the same recovery still works.
- The New workspace mockup fixtures put files at the end when the sample
  text gives them no place. They represent a pick with the caret at the
  end. Reason: the sample still shows the files beside the task words.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show the chips in the text in each composer, the drop state,
the drop at a place, a folder that was not attached, the chips of a sent
message, and the file tab that a sent chip opens. Each page keeps a
desktop and a phone variant.

- [ ] Add a pure mockup part for the file chip of the message field, on
      `InlineChip.module.css`, `ChipRemove`, `attachmentCopy.ts`, and
      `sizes.ts`: the icon cell with each glyph, the name, the muted
      label, Try again in a failed chip, and the × of each pointer kind.
- [x] Add a pure mockup part for the file chip of a sent message: the
      kind icon, the name, the muted size, and its look as a link.
- [ ] Apply the chosen phone touch rule and draw the chosen notice for
      several refused kinds, after composer drops decisions 1 and 2.
- [x] Put the file chips into the text of the message field mockup, and
      remove the row of attached files above the text.
- [x] Preserve the Feedback screenshot row after the new `main` changes.
      Give its mockup a screenshot type and a row part that do not need
      chat file IDs or copy paths.
- [x] Update `app/composer`: two uploaded files in a sentence.
- [x] Update `app/attachments`: a file that uploads, a failed upload, a
      file over 25 MB, a sent message with its chips in the text, and a
      first message with files.
- [x] Add `app/attachments/drop`: files over the box with the drop caret
      in the text, the files at that place after the drop, and a folder
      that was not attached. Its phone variant shows a pick at the caret.
- [x] Add `app/attachments/open`: the file tab that a press on a sent
      screenshot opens, with its picture (decision 265 B).
- [x] Update `app/file-mentions/chips/attached-file`: remove a file chip
      of the text.
- [x] Update `app/new-workspace/files` and every New workspace state
      that shows files.
- [x] Add the drop state to `app/new-workspace/dialog/files`, with the
      whole dialog card as the target and its full border as the state.
- [x] Add an image to `app/files`: the file tab of a picture, and of an
      image that the browser cannot draw.
- [x] Add the flow `user-flows/drop-a-file`: a drag of a screenshot onto
      the chat box, the drop, the upload, Send, the sent message with the
      agent's answer, and the file tab that a press on the chip opens.
- [x] Update the rows of `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages, and save
      the screenshots under `.context/composer-file-drops/`.
- [x] Capture the marketing pictures that show the changed composer again,
      with `npm run marketing:pictures`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of decisions 262 to 265 and of
the design calls above that are requirements.

- [x] Update `docs/protocol/message-attachments.md` and its owner page
      `docs/protocol/messages-and-attachments.md`: the drop, the
      place of each file, the chip in the text, the mention in the text,
      the copy path from the file ID, the sent chips and their press, the
      files under the message, the order of the files, Try again, the
      workspace title request, folders, and drops outside the box.
- [ ] Update `docs/protocol/file-mentions.md`: the mention of an attached
      file, the sent chip of each file of the message and its press, and
      the removal of a file chip of the text in place of the row above
      it.
      The touch-size text remains blocked by composer drops decision 1.
      The other text proceeds under the user's instruction of 11 November.
- [x] Keep the Feedback screenshot row, and correct its reason in
      `docs/protocol/feedback.md` after the chat composers move their files.
- [x] Update `docs/protocol/workspace-links.md#the-message-field`: the
      field holds the chips of attached files too.
- [x] Update `docs/protocol/session-transcripts.md`: the names in place
      of the mentions, and the attachments line.
- [x] Update `docs/protocol/agents-and-sessions.md#sessions`: the names
      in a session title, and no title from a message with only files.
- [x] Update `docs/protocol/workspace-tools.md#files-and-changes`: the
      picture of an image file.
- [x] Read `docs/protocol/create-a-workspace.md` and
      `docs/architecture.md`, and update each sentence about the files of
      a message.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` in full. Update each sentence
      that restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence about attached files and about the file tab, such as in
      `sessions-and-chat.md`.
- [x] Read the `attachments` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`, and update
      its note when it restates a changed fact.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: Shared paths, sent paths, titles, and copies

Depends on: 2

The Worker and the development fakes share the mention syntax and the
path builder. Each file has its path from the upload on. Titles and
transcript copies read the mentions of the files.

- [x] Move `src/chat/mentions/mention-text.ts` to `src/shared/`, and move
      each consumer and test to it.
- [x] Move `attachmentPath`, `safeName`, and `ATTACHMENTS_DIRECTORY` to
      `src/shared/attachment-paths.ts`. Make the digest come from the
      file ID only. Move the Worker consumers, the path check of
      `worker/chat/attachment-copy.ts`, and the tests of the path.
- [x] Add `path` to the attachment of `src/shared/messages.ts`. Give it in
      the upload reply and in each sent message, through
      `publicAttachment`. Read it in `src/app/api/read-workspaces.ts` and
      `src/chat/api/read-chat.ts`, with null for a stored message
      without it.
- [x] Add `src/shared/attachment-mentions.ts`: the file of a mention, the
      text with the names of the files, and the test for own words.
- [x] Use the names in `worker/chat/session-titles.ts` and
      `worker/chat/workspace-titles.ts`. Start no title from a message
      with only file mentions.
- [x] Use the names and the shorter attachments line in
      `src/shared/transcript/markdown-items.ts`.
- [x] Give the development fakes in `src/chat/dev/`, `src/app/dev/`, and
      `src/test-support/` the paths and the titles.
- [x] Update `worker/chat/attachments.md`, with the copy of a later
      message with the same file, and `src/shared/README.md`.
- [x] Add the tests of the path of an upload and of a sent file, the
      copy of a later message with the same file, the titles, and the
      transcript copy. See each fail first.

## Milestone 4: Sent messages show each file at its place

Tags: ui

Depends on: 1, 3

- [x] Add a part for a mention of a file of the message to
      `src/chat/links/chat-parts.ts`.
- [x] Draw that part in `src/chat/links/LinkedText.tsx` with the mockup
      part of the sent chip. Give it the mention for a copy, as
      `mention-copy.ts` reads it.
- [x] Make a press on a sent chip open the file tab of its path, through
      the `openFile` and the `href` of the chat files. Open nothing while
      its message waits, or without the files of the workspace.
- [x] Make `UserBubble` give the files to the text, and make `SentFiles`
      list only the files without a chip.
- [x] Update the key code of `src/chat/README.md`.
- [x] Add the tests of the sent chip, its press, the shorter list, and
      the copy.

## Milestone 5: Images in the file tab

Tags: ui

Depends on: 1, 2

The file tab shows each image up to the read limit as a picture
(decision 265 B). This holds for every image of the workspace.

- [x] Show a PNG, JPEG, GIF, or WebP file as a picture in
      `src/files/page/FileBody.tsx`, by the name of the file, from a
      `data:` address of the bytes of the file response.
- [x] Show "Download this file to open it" when the browser cannot draw
      the bytes.
- [x] Update `src/files/README.md`.
- [x] Correct the development guide and fixture comment for the sample
      PNG: its file tab shows a picture, and its diff stays binary.
- [x] Add the tests of a picture, a GIF from the runner, a picture from
      the Boat file read, bytes that the browser cannot draw, an SVG
      file, and an image over the read limit.

Implementation and verification evidence: `.context/composer-file-drops/m5-report.md`
and `.context/composer-file-drops/m5-docs-report.md`.

## Milestone 6: The file chip of the message field

Tags: ui

Depends on: 1, 2

The field can hold and draw a chip for each file of its draft. No
composer puts one there yet.

The field's phone touch areas remain blocked by composer drops decision 1.
The other field work proceeds under the user's instruction of 11 November.

- [x] Move the pure mockup mark helper to `src/app/draft-marks.ts`: the
      mark of a file, the marks of a text, and the text without its marks.
      Move each consumer to it, with no forwarding module.
- [x] Make literal draft text lossless with the checked escape. Keep the
      file mark format, preserve ordinary file mentions and workspace
      links, and keep typed or pasted text from making a file mark.
- [x] Add the decorator node of an attached file to
      `src/chat/components/chip-field/`, with the mark as its text.
- [x] Give the field its files through a source: the file of each mark,
      the file of each path, and Try again. Drop a mark of a file that
      the draft does not hold.
- [x] Write each mark with the spaces of a mention in `$fieldText`.
- [x] Draw the chip with the mockup part and the live state of its file.
- [x] Preserve the text and clipboard behavior of fields without a files
      source, including Feedback. Keep their private-use characters as
      literal text.
- [ ] Complete the phone touch areas after composer drops decision 1.
      This TODO stays open until the user answers.
- [x] Make a copy of a ready chip give its mention, and a copy of another
      chip give its name. Make a paste of a mention of a file of the
      draft give its chip back.
- [x] Add the caret at a point of the field, from the caret position of
      the browser.
- [x] Keep the field text of the last copy, cut, or drag, with its marks.
      Make a paste or a drop of that copy in the same field give back its
      chips, and make a drag carry the plain text of a copy.
- [x] Add `insertFiles` to `FieldHandle`: chips at a point, at the caret,
      or at the end, each with a space, in one step of undo, then the
      focus.
- [x] Update the message field rules of `src/chat/loads-and-sends.md`.
- [x] Add the DOM tests of the insert, the removal, undo, the copy, the
      cut and paste, the drag inside the field, and each state of the
      chip.

Implementation and verification evidence: `.context/composer-file-drops/m6-field-report.md`,
`.context/composer-file-drops/m6-codec-field-report.md`,
`.context/composer-file-drops/m6-docs-report.md`, and
`.context/composer-file-drops/m6-complete-gate.log`.

## Milestone 7: Each composer puts its files in the text

Tags: ui

Depends on: 3, 4, 6

- [ ] Make the attach of each draft give the new file IDs at once, while
      the uploads run.
- [ ] Bring the files of each draft in line with the marks of each new
      text: detach and stop a file whose chip left, and bring back a
      detached file whose chip came back.
- [ ] Build the text of each send from the marks and the paths of the
      files. Clear the draft text when it is still the draft text, with
      its marks, that the send took.
- [ ] Take the mark of each file out of the text when the file leaves
      the draft without its chip: a send whose text changed during the
      send, a model change that keeps fewer files, and a sign-out.
- [ ] Apply the same rules to New workspace: the attach, the detached
      files, the send text, the need for words, and the sign-out.
- [ ] Make the paperclip of each composer insert its files at the caret.
- [ ] Remove the row above the text, `DraftFiles`, `DraftChip`, the
      `onRemoveFile` props, and the remove actions. Move their tests to
      the chips of the text.
- [ ] Update `src/chat/README.md`, `src/chat/key-code.md`,
      `src/chat/loads-and-sends.md`, and `src/app/README.md`.
- [ ] Add the tests of the detach, the return, the send text, the marks
      that leave with their files, the order of the files, and New
      workspace.

## Milestone 8: Drops into each composer

Tags: ui

Depends on: 7

- [ ] Add a drop hook for the message box: file drags only, the drop
      state, no drop while the composer takes no change, and the split of
      files and folders.
- [ ] Make the box of each composer a drop target, which attaches the
      files and inserts them at the caret of the point.
- [ ] Keep uploaded bytes in the development fakes, and make their file
      reads show the copies at the returned paths for the required Chrome
      sent-chip smoke test. Keep those copies out of the file tree and keep
      the existing read limit.
- [ ] Name each dropped folder in the notice over the box.
      Mixed-drop and multiple-folder notice words remain blocked by
      composer drops decision 2. Apply no interim notice option.
- [ ] Ignore each file drop outside a message box, from the root of the
      app.
- [ ] Set the `drag-and-drop-attachments` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts` to Available,
      with a note of what a member can do, as
      `docs/protocol/conductor-comparison.md#statuses` says. Reason: the
      merge of this change ships the feature, and the row stays Under
      consideration on `main` until then.
- [ ] Update `src/chat/README.md`, `src/chat/key-code.md`, and
      `src/app/README.md`.
- [ ] Add the DOM tests of the drop, the drop state, a box that takes no
      change, a folder, and a drop outside the box.
- [ ] Smoke-test a drop in Chrome on the development page and in the app,
      then a press on the sent chip. Save the screenshots under
      `.context/composer-file-drops/`.

## Milestone 9: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8

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
      mention, that the sent message shows the chip, and that a press on
      the chip opens the file.
