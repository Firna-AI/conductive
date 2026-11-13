# File chips in agent answers

Status: Active. On branch `calummoore/delft-i3g7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The chat shows each path in an agent answer as plain inline code, such as
`/home/user/code/remote-code/.context/archive-clear/archive-outline-after.png`.
A member who wants to see the file must find it in All files by hand. On
13 November 2026 the user sent a screenshot of such an answer and asked
for these paths to show as file chips. File chips already show in the
messages of members, for each `@` mention of an entry of the file tree.
[File mentions](../docs/protocol/file-mentions.md#chips-of-files-and-folders)
says today that "the answers of the agents keep their text".

This change shows a `@` mention in an answer as a file chip, as in the
messages of members. It also shows inline code of an answer as a file
chip when the whole code is the path of an entry of the file tree. The
agent instructions ask agents to name files as `@` mentions. The path can be relative to
the repository or absolute under the repository folder. A path can end
with a line number or a range of lines. Then the chip shows the line, and
a press opens the file tab with the line in view and marked. The change
does not cover code blocks, paths in plain text without `@`, Markdown links, tool
call lines, or paths in other repositories of the workspace.

Contract owners:

- [File mentions](../docs/protocol/file-mentions.md).
- [Workspace tools](../docs/protocol/workspace-tools.md#files-and-changes),
  for the file tab at a line.
- [Chat Markdown](../docs/protocol/chat-markdown.md) and
  [Chat tables](../docs/protocol/chat-tables.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- The [chat README](../src/chat/README.md),
  [Agent text](../src/chat/agent-text.md), and the
  [Files README](../src/files/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

Decision 3 is B, so Milestone 7 runs.

Related work: [Pressable links in the chat](pressable-chat-links.md) is an
active plan that also changes `src/chat/links/chat-parts.ts`. It makes an
address alone in inline code a link. The change that lands second merges
the two readings of inline code: a web address is a link, and a path of
the tree is a file chip.

## Terms

- **File tree:** the files and the folders that All files lists. It holds
  every file of the context folder `.context/`.
- **File chip:** the small box in chat text that shows the icon and the
  name of an entry of the file tree. A press opens the file.
- **Repository folder:** the folder of the workspace repository in the
  cloud computer, such as `/home/user/code/remote-code`.
- **Line target:** a line or a range of lines at the end of a path, such
  as `src/app.ts:42` or `src/app.ts:42-50`.
- **File tab:** the tab of the centre column that shows one file, as
  rendered Markdown, a picture, or text with line numbers.

## Decisions

An answer chip decision number names a decision of this change. The
protocol docs cite it so, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. The
options check of 13 November 2026 ran after the user's answers. It added
options 1 E, 1 F, 1 G, and 2 D, changed the recommendations of both
decisions, and found the problem of decision 3. Its report is in
`.context/answer-file-chips/options-check-report.md`.

### 1. How answers show the files they name

- **Answer:** A, on 13 November 2026. The options check then added E, F,
  and G. On 13 November 2026 the user changed the answer to A and C
  together: the chat reads both `@` mentions and paths in inline code in
  answers, and the instructions ask agents to write `@` mentions. Reason
  of the user: both forms work, and one form is the one that agents use.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/chat/links/chat-parts.ts`,
  `docs/protocol/file-mentions.md`.
- **Background:** Agents often name the files that they write, such as
  screenshots in `.context/`. The chat draws answers with the same parts as
  the messages of members, but reads no mentions in answers.
- **Problem:** A path in an answer is plain code, and nothing opens the
  file.
- **Impact if no action:** Members keep looking up files by hand.
- **Root question:** How does a member open a file that an answer names?
- **Options:**
  - **A.** Inline code whose whole text is the path of an entry of the
    file tree shows as a file chip. The path can be relative, or absolute
    under the repository folder. Each other path stays code. A copy gives
    the text of the answer. Effort: Medium.
  - **B.** A, plus paths in plain text and in Markdown links. More paths
    match. Plain words can become chips by mistake. Effort: Medium.
  - **C.** The runner tells the agents to write `@path`, and the chat
    reads mentions in answers. Agents do not always follow it, and old
    answers keep their code. Effort: Small.
  - **D.** The code keeps its look but becomes a link to the file. It is
    less clear that the code opens a file. It needs the same path rules
    as A. Effort: Medium.
  - **E.** A, plus one line in the agent instructions of
    `runner/src/instructions.ts`. The line says that a path alone in
    inline code shows as a file chip, and asks for each path in that form,
    relative to the repository, with `:line` for a line. Codex already
    writes paths in inline code by default. Only new sessions get the
    line, and agents can ignore it. Effort: Medium, a Small addition to
    A.
  - **F.** A, plus a Markdown link whose target is a path of the tree, and
    a plain-text word with a `/` that is a whole path of the tree. A
    single word stays text. It needs more rules, and a merge with the
    label links of `plans/pressable-chat-links.md`. Effort: Medium.
  - **G.** The answer keeps its text. A row under the answer shows one
    chip for each path that its inline code names. A chip is then away
    from its sentence. Effort: Medium.
- **Left out:**
  - A change of the stored answer text on the server. It changes what
    the agent wrote and what a copy gives, and A gives the same result.
  - A list of the files that the turn changed. It misses the files that
    the answer names but the turn did not change.
  - A picture for each image path. It misses files that are not
    pictures, and it can come later as its own change.
  - File data that the runner sends beside the answer. It needs new
    event data and does nothing for old answers.
- **Wider fix:** F. It still gives a chip when an agent writes a path as
  plain text or as a link.
- **Previous examples:** File chips in the messages of members
  (decision 213). Chips of attached files (decision 262 D).
- **Recommendation:** E, in place of the first recommendation A. E keeps
  the narrow rule of A, and makes new answers of Claude use the form that
  A reads, for a Small extra cost. F best protects against other forms.
- **Action:** Ask the user, because it changes a requirement in the
  protocol doc.

### 2. Paths with a line number

- **Answer:** C, on 13 November 2026.
- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/chat/links/chat-parts.ts`,
  `src/files/code/CodeView.tsx`.
- **Background:** Agents often write a path with a line target, and the
  instructions of this repository ask them to. The file tab cannot show a
  given line yet.
- **Problem:** Decision 1 A matches only an exact path, so a path with a
  line target stays code.
- **Impact if no action:** Many paths in answers stay plain code.
- **Root question:** How does a member see the line that an answer
  quotes? The options check wrote this question in place of "What does
  the chat show for a path with a line target?", because most of the work
  is in the file tab.
- **Options:**
  - **A.** It stays code. Effort: Small.
  - **B.** It is a chip with the label `app.ts:42`, which opens the file
    at its top. Effort: Small.
  - **C.** B, and the file tab shows the line in view and marked. The file
    tab needs new work. Effort: Medium.
  - **D.** The chip of B. A press shows the quoted lines in a small panel
    over the chat, with an Open file button that does C. It needs a new
    panel, mockups, and focus rules, and a press that differs from the
    other file chips. Effort: Large.
- **Left out:** The diff tab at the line. The diff shows only the changed
  parts of a file, so the line is often missing.
- **Shared assumption:** the quoted line still names the same code when
  the member presses the chip. An agent can edit the file after the
  answer, and the app keeps no older copy of the file.
- **Wider fix:** C.
- **Previous examples:** None found.
- **Recommendation:** C, in place of the first recommendation B. A label
  `app.ts:42` that opens the top of the file promises a line that the tab
  does not show.
- **Action:** Ask the user, because it changes what members see and the
  spec does not say.

### 3. Copies of answers with a file chip lose their formatting

- **Answer:** B, on 13 November 2026, in the user's words "3 = B, just
  check in chrome". The agent read this as a check in Chrome only, with
  no checks in Firefox and Safari.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design. Found by the options check.
- **Category:** Product bug.
- **Location:** `src/chat/links/mention-copy.ts:131`.
- **Background:** When a selection holds a file chip, the chat builds the
  copied text itself, so that the chip gives its text. It then sets plain
  text only. The browser's own copy also gives the formatted text, which
  rich editors such as Slack and Google Docs paste with bold and links.
  Today only messages of members hold file chips.
- **Problem:** With this change, most answers hold a file chip. A copy of
  such an answer loses its bold, its links, and its table layout.
- **Impact if no action:** A paste of an answer into a rich editor shows
  plain text, where it showed formatted text before.
- **Root question:** How does a copy of an answer with a file chip keep
  what the browser's own copy gives?
- **Options:**
  - **A.** Accept the plain-text copy. Keep the follow-up item
    `plans/follow-ups/chat-copy-through-native-copy.md` for later. Rich
    pastes of most answers lose their formatting until then. Effort:
    Small.
  - **B.** Do option D of that follow-up item in this change: the
    browser's own copy runs, and each chip gives hidden text with its
    source. It needs checks in Chrome, Firefox, and Safari, and a browser
    spec outside the gate. Effort: Medium.
  - **C.** Also set a formatted copy from the walker of the copy handler.
    It builds the formatted text by hand, which the follow-up item says
    already drifts from the browser. Effort: Medium.
- **Left out:** An answer chip without a copy rule. The browser then
  copies the name of the chip, not its path, so the copy is wrong.
- **Wider fix:** B. It removes the hand-built copy for each kind of chip.
- **Previous examples:** `plans/follow-ups/chat-copy-through-native-copy.md`.
- **Recommendation:** B. The copy of answers is common, and B fixes the
  same loss for the messages of members too.
- **Action:** Ask the user, because it adds browser checks outside the
  gate, and option A changes what members get today.

## Design

Each item below is my call, made on 13 November 2026, unless it names a
decision.

- **Which code:** inline code of an answer, in a paragraph, a
  heading, a list, or a table cell. The whole code must be the path, with
  an optional line target. A code block stays code. Reason: code blocks
  hold commands and output, not names of files.
- **Which paths:** the path of an entry of the file tree, with an optional
  `./` at its start. An absolute path counts when it starts with the
  repository folder and a `/`. A folder can end with `/`. A path that
  names no entry, a path in another repository, and a path outside the
  repository folder stay code. Reason: All files lists only the workspace
  repository, so the chip could open nothing else.
- **One word:** code of one word without a `/`, a `.`, or a line target
  stays code, also when a top-level entry has that name. Reason: words
  such as `runner`, `worker`, and `tools` name concepts as often as
  folders. `README.md` and `runner/` still match. Changed after the
  options check.
- **Line targets:** `:N`, `:N-M`, `:N:C`, `#LN`, `#LN-LM`, and `#LNCC`. A
  column is ignored. A line target on a folder keeps the code. A line
  target on a file that does not open as text, such as an image, gives a
  chip without the line. The `a/` and `b/` prefixes of a diff and a bare
  file name with no folder that names a nested file stay code, because
  they can name more than one entry.
- **The chip:** the file chip of the messages of members, with the name
  of the entry. A line target adds `:N` or `:N-M` to the name. The title
  gives the repository path and the line target. Bold ends at the chip, as
  it ends at code.
- **A copy:** a copy of the chip gives the text of the code as the answer
  wrote it. Decision 3 settles the copy of the text around it.
- **No tree:** in an archived workspace, or while the tree loads or is
  unavailable, the code stays code. A chip shows when the tree loads.
- **Hidden text:** the closed line of a message in the work fold keeps a
  hidden copy of its text for screen readers, in
  `src/chat/components/MessageLine.tsx`. That copy shows no file chips,
  as it shows no workspace chips. Reason: a hidden chip would take the
  keyboard focus while nobody sees it. Added after the options check.
- **Cost of a draw:** only text with a backtick follows the file tree. So
  a change of the tree draws only the answer parts that can hold a chip.
  Added after the options check.
- **Link labels:** code in the label of a Markdown link stays code. This
  holds also after `plans/pressable-chat-links.md` lands, so that no chip
  sits inside a link. Added after the options check.
- **The repository folder:** the Worker sends the folder of the workspace
  repository to the browser, with the workspace view, from the folders
  that it stores for each workspace. The files handler already reads them
  in `worker/features/workspace.ts`. The shell gives the folder to the
  chat beside the file tree. The runner does not change. Reason: the
  folder then comes from trusted data, not from the sandbox, and it also
  works for trees of older runners. The first design had the runner
  report the folder, and the options check found the stored folders. A
  folder rule in the browser was rejected, because the Worker owns the
  rule and a workspace keeps the folders of its image.
- **The press:** a chip without a line target opens the file as a file
  chip does now. A chip with a line target opens the file tab in source
  mode, also for a Markdown file, because the rendered view has no line
  numbers.
- **The file tab at a line (decision 2 C):** the address of the file tab
  gets the query `line=N` or `line=N-M`. So a modifier click opens a new
  browser tab at the line. A `#L42` part, as on GitHub, was the first
  design. The options check found that the navigation of the app drops
  the `#` part, in `src/app/navigation.ts`. Each new address with a line
  scrolls again, also on the file that already shows. The tab scrolls the first line to the middle
  of the view and marks the lines with a background colour. A line past
  the end of the file shows the top and marks nothing. The line stays in
  the address of the browser tab only. The workspace view on the Worker
  keeps the file tab without the line. Reason: the view follows the member
  across browser tabs, and another tab must not jump.
- **Mentions in answers (decision 1):** a `@` mention in an answer reads
  as in a message of a member. It gives a chip when it names an entry of
  the tree, and it stays text otherwise. A mention in code stays code, so
  `` `@src/app.ts` `` is code. A mention is always a path inside the
  repository. The first design also read an absolute path after `@`. It
  was dropped while building, because the mention reader of the composer
  refuses absolute paths, and the instructions ask for repository paths.
- **Bold around a mention:** where `**` marks bold, a mention ends before
  the next `**`, as a bare link does. Found while building: otherwise
  `**@src/app.ts**` shows its marks as text.
- **Mentions with a line target:** a mention can end with a line target,
  such as `@src/app.ts:42`. This holds also in the messages of members,
  because one reader serves both. Today such a mention names no entry and
  stays text, so no chip of today changes.
- **End marks:** agents end sentences after a mention, as in "See
  @src/app.ts." When the mention names no entry, the reader drops one
  `.`, `,`, `;`, `:`, `!`, `?`, or `)` at its end and tries again. The
  mark stays text after the chip.
- **The instructions line:** "Name a file or a folder of the repository in
  your chat replies as `@` and its path from the repository folder, such
  as @src/app.ts, @src/app.ts:42, or @docs/. Put a path with a space in
  double quotes. It shows as a file chip. In commits, pull requests,
  issues, and files, write paths in backticks." Reason for the last
  sentence: GitHub reads `@src/app.ts` as a mention of a user or a team,
  and notifies them. The exact words can change in Milestone 6.
- **Inline code in members' messages:** it stays code, as the protocol
  says today.

- **After the mockups:** these calls of 13 November 2026 follow the
  problems that the mockups showed.
  - A long chip name loses the end of its name first, and the line target
    always stays in view. Reason: the lines are what the answer points at.
  - A chip of a file that no mockup page draws, such as a picture in
    `.context/`, opens nothing in the mockups. The app opens the file.
  - A short file that fits the view opens at its top. The view never
    scrolls past the top of the file.
  - The closed line of a message in the work fold shows file chips, as it
    shows workspace chips. Only its hidden copy drops them.
  - A folder chip from inline code opens All files with the folder open,
    as a folder chip of a member message does.
  - The sample tree of the mockups and the tests lists `.context/`, as
    [The context folder](../docs/protocol/repository-folders.md#the-context-folder)
    says.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chips page of `app/file-mentions` holds five screens, so the answer
chips get a new child page. The file tab at a line is a new screen of
`app/files/code`, or a child page when that page is full.

- [x] Add the child page `app/file-mentions/answers`: an answer with a
      chip for a `@` mention, a chip for an absolute path in code, a chip
      for a relative path with a line target, a path in another repository that stays code, and a code
      block that stays code. Give the desktop and the phone variants.
- [x] Add the file tab at a line to `app/files/code`: a source file with
      a range of lines in view and marked, on desktop and on a phone.
- [x] Add a user flow `user-flows/open-a-file-from-an-answer`: an answer
      with a chip, then the file tab at the line. Use the screens above.
- [x] Link the new pages from their parents and from
      `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Screenshots are in
      `.context/answer-file-chips/mockups/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/file-mentions.md`: replace "The answers of the agents
      keep their text" with the rules of the design above, and cite answer
      chip decisions 1 and 2.
- [x] `docs/protocol/workspace-tools.md`: the file tab at a line, its
      address, and the mark.
- [x] `docs/protocol/chat-markdown.md` and `docs/protocol/chat-tables.md`:
      inline code of an answer can show as a file chip.
- [x] `docs/protocol/file-mentions.md`, "Chips of attached files": fix
      the sentence that All files does not list the copy of an attached
      file. [The context folder](../docs/protocol/repository-folders.md#the-context-folder)
      says that All files lists every file of `.context/`. The options
      check found this.
- [x] `docs/protocol/agent-instructions.md` gives the new line of the
      instructions about `@` mentions.
- [x] When decision 3 is B: the copy rule of `docs/protocol/file-mentions.md`
      says that the browser's own copy runs, with the source of each chip.
- [x] Read both legal pages and every public guide in full. Update each
      sentence that restates a changed fact. The guide
      `src/marketing/docs/sessions-and-chat.md` and
      `src/marketing/docs/files-and-changes.md` are the likely ones.
- [x] Check the row `mentions` of the comparison page in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`. Update its
      status or note when this change ships a listed feature.

## Milestone 3: The repository folder for the browser

Depends on: 2

- [x] The Worker adds the folder of the workspace repository to the reply
      of the workspace view, from `workspaceRepositoryLocations`. Add the
      field to `WorkspaceViewResponse` in `src/shared/workspace-view.ts`.
- [x] The browser reader of the reply keeps the folder. A reply without
      it, or with a folder that is not an absolute path, gives no folder.
      Then only relative paths match.
- [x] Update the fake Worker of the development pages and the tests.
- [x] Tests for the Worker reply and the browser reader, with and without
      the folder.

## Milestone 4: File chips in answers

Tags: ui

Depends on: 3, 5, and the answer to decision 3 for the copy TODO

- [x] Add a reader of an answer path: it takes the text of inline code,
      the tree, and the repository folder. It gives the entry and the line
      target, or nothing. Give it its own file and its own tests.
- [x] `chatParts` gives a `file` part, with its line target, for inline
      code of an answer whose text the reader matches. Each other code
      stays a `code` part.
- [x] `chatParts` reads `@` mentions in answers with the same lookup as
      in the messages of members. A mention reads a line target and
      drops an end mark of a sentence, as the design says.
- [x] `AgentText` and `MessageLine` read answers with the tree. Only
      text with a backtick follows the tree. The messages of members keep
      their reading.
- [x] The hidden copy of the closed line in `MessageLine` shows no file
      chips.
- [x] Code in the label of a Markdown link stays code.
- [x] The file chip shows the line target in its name and its title.
- [x] A copy of the chip gives the code text, in the way that decision 3
      chooses.
- [x] A press on a chip with a line target opens the file tab in source
      mode at the line. A modifier click opens the address with the line.
- [x] Tests: the matches and the misses of the design, one word, bold
      around the chip, a table cell, a link label, the hidden copy, a
      copy, and a press.
- [x] Update `src/chat/README.md` and `src/chat/agent-text.md`.

## Milestone 5: The file tab at a line

Tags: ui

Depends on: 2

Milestone 4 needs this milestone for the press on a chip with a line
target, so this milestone can run before Milestone 4.

- [x] `filesPlace` and `filesHref` read and write the query `line=N` and
      `line=N-M` on the address of a file tab. The workspace view keeps
      the tab without the line.
- [x] A new address with a line scrolls again, also on the file that
      already shows.
- [x] `CodeView` scrolls the first line to the middle of the view and
      marks the lines. A line past the end marks nothing.
- [x] Tests for the address, the scroll, and the mark.
- [x] Update `src/files/README.md`.

## Milestone 6: The agent instructions

Depends on: 2

Run this milestone after Milestone 4 lands, or in the same pull request,
so that no agent writes mentions that the chat cannot show.

- [x] Add the line about `@` mentions to the workspace text of both
      agents in `runner/src/instructions.ts`, beside the line about
      workspace links.
- [x] Update the test of the instructions.

## Milestone 7: The browser's own copy

Tags: ui

Depends on: 4, and decision 3 B

This milestone runs only when the user chooses decision 3 B. It does
option D of `plans/follow-ups/chat-copy-through-native-copy.md`, and the
pull request deletes that item.

- [x] Give each file chip, of members and of answers, a hidden text with
      its source. During a copy, the page shows that text and hides the
      chip until the next frame. Move a selection edge inside a chip to
      the edge of the chip.
- [x] Delete the walker of `src/chat/links/mention-copy.ts`.
- [x] Dropped by my call of 13 November 2026: a real-browser spec of a
      copy, as `desktop/tests/command-literal.spec.ts` does. That suite
      runs only in the Mac app jobs, and the user asked for a check in
      Chrome only. The Chrome check below is a script outside the gate.
- [x] Check a copy and a rich paste in Chrome, Firefox, and Safari. Only
      Chrome, as decision 3 says. The script and its result are in
      `.context/answer-file-chips/chrome-copy/`.
- [x] Delete `plans/follow-ups/chat-copy-through-native-copy.md`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Check the chips and the file tab in a browser with `npm run dev`,
      on desktop and at phone width.
- [ ] Commit with Conventional Commits and push the branch.
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
