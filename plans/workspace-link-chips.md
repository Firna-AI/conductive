# Workspace link chips

Status: Active. On branch `calummoore/workspace-link-widget-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 8 November 2026 the user asked whether Conductive can do what
Conductor does with a workspace link, and sent two screenshots. In
Conductor, the header of a workspace shows a short ID, such as `W-395`.
A press on it copies the link of the workspace. A pasted link becomes a
chip in the message box, with the ID and the name of the workspace. The
brainstorm found that Conductive has no short ID, no Copy link, and no
links in chat text. Its notes are in `.context/workspace-links/notes.md`.

This change gives each workspace a number in its org, shown as `W-395`.
The header shows the number as a Copy link button. The message boxes of
the chat and of New workspace turn a pasted workspace link into a chip.
Sent messages and agent answers show the same chips. A message keeps the
plain link, which holds the workspace ID. So the agent reads the link,
and the shown label can change later. The search of the command palette
also finds a workspace by its number. The user chose this on
9 November 2026, in decisions 150 and 151.

The change does not cover these things:

- an agent tool that reads the chat of another workspace, or sends a
  message to it
- a picker that finds a workspace while the person types, option F of
  decision 150
- a line for the agent about each linked workspace, option G of
  decision 150
- chips for typed numbers, such as `W-395`, and for links to another org
- links of other kinds in chat text, which stay plain text

The decision numbers continue after 149, the highest decision number on
any branch on 9 November 2026. The brainstorm asked them as items 1 and 2.
The options check of 9 November 2026 added options to both decisions. Its
report is in `.context/workspace-link-chips/options-check.md`. After the
check, the user chose option D for decision 151: the number, and a search
of the command palette that finds it.

Related work on other branches:

- `calummoore/command-palette-mockups` adds a command palette with a
  workspace search, in [PR #77](https://github.com/Firna-AI/remote-code/pull/77)
  and the Conductor workspace "Command Palette Mockups". Decision 151 adds
  the number to that search. This branch can merge without that part, as
  the user said on 9 November 2026. When this branch is ready, the agent
  checks whether the palette is on `main`. When it is, this branch adds
  the number search. When it is not, this branch merges without it, and
  after the merge a message asks the palette workspace to add it. Both
  branches change `src/app/screens.md` and `src/chat/README.md`, so the
  later merge resolves those files.
- `calummoore/private-workspace-support` lets an owner hide a workspace
  from the other members. The chips and the agent tools then follow the
  list that each reader may see, as the design says.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md). Milestone 2
  adds the chips.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
  Milestone 2 adds the number and Copy link.
- [Agent tools](../docs/protocol/agent-tools.md). Milestone 2 adds the
  number and the link to the create and list calls.
- The [chat README](../src/chat/README.md), the
  [workspace screen README](../src/shell/workspace/README.md), the
  [Screens](../src/app/screens.md) page, the
  [workspace tools README](../tools/README.md), and the
  [mockup catalogue](../docs/mockups/catalogue.md).

## Design

Each line that starts with "Agent call" is a design call of the agent,
made on 9 November 2026. The user can change it before the plan is
approved.

### The number

- The number of a workspace counts up from 1 in its org, in the order of
  creation (decision 151). Workspaces that exist before the change get
  numbers in the order of their creation times.
- Agent call: the app never gives a number twice in one org. The
  workspace of a failed first start keeps its number used. A restored org
  keeps its count. Reason: a person who said `W-12` must not find another
  workspace there later.
- Agent call: the label is `W-` and the number, in every org. It is only
  a label. Links, stored messages, and the agent tools name a workspace by
  its ID (decision 151). Reason: the user asked that the label can change
  later.
- Agent call: the number shows in the workspace header and in each chip.
  The rows of the workspace list keep their layout. Reason: a person
  copies and reads a reference in those two places, and a row has no room
  for more.
- The search of the command palette also finds a workspace by its number,
  such as `395` or `W-395` (decision 151).
- Agent call: the palette searches the label as one more field of each
  workspace, with the same rules as the name. Reason: one rule serves
  every field.
- Agent call: a workspace row of the palette shows the label when the
  query matches it. Reason: a person can then tell apart the workspaces
  that match a part of a number, such as `39`.
- Agent call, from the updated mockups: matching palette rows show the
  label before the name, so the numbers line up in one column.
- Agent call: the rule of the palette search goes into the protocol doc
  of the palette, in the change that builds it. Reason: a protocol doc
  states only behaviour that the code has, and the palette is not on
  `main` yet.

### Copy link

- Agent call: the `W-395` label in the header is the Copy link button, on
  desktop and on a phone, as in Conductor. A press copies the web address
  of the workspace and confirms the copy. The mockups place the button
  and word the confirmation.
- Agent call: the Worker gives the web address of each workspace in its
  record, as `link`, such as
  `https://app.conductive.build/orgs/<org>/workspaces/<id>`. Copy link,
  the chips, and the agent tools use this one value. Reason: the page of
  the Mac app runs on its own origin, and a sandbox does not know the app
  origin.
- Agent call: Copy link copies the address without a tab path, such as
  an open file. Reason: the link names the workspace.
- Agent call, from the mockups: on desktop, the button sits right after
  the name, before the repository. On a phone, it leads the line under
  the name, before the repository and the branch, and its touch area is
  44 px high. The label has no link icon and shows a hover effect, as the
  user requested on 9 November 2026. Reason: the number joins the
  other names of the workspace, in the same order on both sizes. On the
  right of a phone header, it left the name only 50 to 80 px.
- Agent call, from the mockups: the accessible name is "Copy link to
  W-395". After a press, a note
  under the button says "Link copied" for a moment. A failed copy says
  "The link didn't copy. Try again." in the danger colour, as the file
  page says "The text didn't copy. Try again." The note is a status for
  screen readers, and it lies over the content, so nothing moves.
  Reason: "Copied" alone could mean that only the number was copied.
- Agent call, from the user's icon change: the copied state also keeps
  the number alone. The status note confirms the copy without moving the
  repository or branch.
- Agent call, from the mockups: on desktop, the repository and the
  branch share one group in place of the spacer. The group takes only the
  room that the other parts leave, so the name is cut short only when
  that group has no room left. Reason: the label needs room, and the
  name is the most important part. A larger shrink factor still cut
  the name by less than a pixel, which shows an ellipsis.

### Chips

- Agent call: a chip shows the state mark, the label, and the current
  name of its workspace. It changes when the name or the state changes.
  Reason: the mark gives the live state, which matters when one workspace
  waits for another.
- Agent call: the app reads each link in a text with the URL parser and
  the router of the app. A link becomes a chip only when it has the
  origin of the workspace links, and the router finds a page of a
  workspace in the list of the org. The page is the workspace or one of
  its tabs. The chip keeps the whole link, and a press opens the page
  that the router found. Reason: people also copy the address bar, which
  can hold a tab path. A link with `..` or other odd parts must not show
  one workspace and open another page.
- Agent call: after a change of the app domain, older links stay plain
  text. Reason: no such change is planned, and a plain link still works
  where the old domain forwards to the new one.
- Agent call: the chat finds each workspace in the list of the org that
  the app of the reader loads, with the archived workspaces. The chat
  keeps that list current while it shows, also on a phone, where no list
  is on the screen. A link to another org, to an unknown or removed
  workspace, or to a workspace that the reader cannot see stays plain
  text. Reason: a person sees only the workspaces of an org that they are
  a member of, as
  [Orgs and workspaces](../docs/protocol/access-and-security.md#orgs-and-workspaces)
  says. This rule still holds when private workspaces hide more. The
  agent also acts only in its own org.
- Agent call: sent messages and agent answers show chips. A Markdown link
  whose target is a workspace link, such as `[W-395](<link>)`, shows as
  the chip alone. A link inside `code` or a code block stays code. Reason:
  an agent often writes links in Markdown, and code shows exact text.
- Agent call: a press on a chip in the chat opens its page in the same
  window, as the other links of the app do. The Mac app opens it in its
  window, as [Navigation](../docs/protocol/desktop-app.md#navigation)
  says.
- Agent call, from the mockups: a chip is 2 px shorter than its line of
  text, so the line keeps its height. It is at most 22 em wide, and a
  long name is cut short, with the whole name as its title. Its corners
  have the 4 px radius of the file chips, not the full pill of Conductor.
  Reason: the design uses small radii.
- Agent call, from the mockups: a long word in a message or an answer,
  such as a long link that stays plain text, breaks to fit the line.
  Reason: long links went past the edge of a phone. The app reuses this
  style, so its chat gets the same rule.

### The message box

- The message boxes of the chat and of New workspace turn each pasted
  workspace link into a chip at once (decision 150).
- Agent call: the box reads a paste from the paste event, not from the
  clipboard API. Reason: the Mac app denies clipboard reads, as
  [Permissions](../docs/protocol/desktop-app.md#permissions) says.
- Agent call: the box keeps plain text. A paste of formatted text keeps
  only its text, as the text field does today.
- Agent call: a chip in the box is one unit of the text. Backspace and
  Delete remove it whole, and the arrow keys step over it. A press on it
  places the caret, as in other text.
- Agent call: the draft stays plain text, with the link of each chip. The
  box shows the chips again when a draft comes back, such as after a
  failed send or a draft move to a new session. Reason: the drafts, the
  sends, and the stored history then need no change.
- Agent call: Enter, Shift+Enter, the input methods of other languages,
  the touch keyboard, the placeholder, the limit of eight lines in the
  chat and page, and the focus keep their rules of today. The New
  workspace dialog keeps its seven-line minimum and fourteen-line
  maximum, as the current dialog does.
- Agent call: the box uses the [Lexical](https://lexical.dev) editor,
  with an inline node for the chip, in a local part. Reason: `@firna/ui`
  has no editor with inline chips, also in version 5.1.0. Lexical handles
  undo, input methods, and the caret around a chip, and it is built for
  React. The other choices, in order:
  - [Tiptap](https://tiptap.dev), which wraps ProseMirror for React, is
    the second choice. It adds more packages for a plain text box.
  - Option E of decision 150, a native text field with a layer that draws
    each chip, is the fallback. Its chip is styled text, not one unit,
    and it has no room for the state mark.
  - A field of our own is rejected, because input methods, undo, and
    phone keyboards are hard to get right.
  - A part in `@firna/ui` first is rejected, because the app still uses
    `@firna/ui` 4.0.0. Decision 119 keeps local copies until the library
    has a part.
- Agent call: Milestone 6 first proves Lexical in the DOM tests and in
  Chrome with a phone screen. When Lexical fails, the proof tries Tiptap.
  When both fail, the milestone stops, and the editor becomes a decision
  for the user, with option E of decision 150 as the fallback.

### The agent

- Agent call: the agent gets each chip as its plain link. The create and
  list calls of the agent tools give the number and the link of each
  workspace. Their descriptions say that a link in a message names the
  workspace with that link. They also say that a link in an answer shows
  as a chip. Reason: the agent can then match a link in a message, and
  point to a workspace that it created.
- Agent call: the agent tools get no call that reads or messages another
  workspace. Reason: such a call lets sandbox code reach more of the org,
  so it needs its own brainstorm. Conductor's CLI can do both.

## Replaced ways

The local inline-chip editor replaces the plain `InputFrame` used by the
message fields. Drafts and stored messages keep the same plain text.

- [ ] Move `src/chat/components/Composer.tsx` to the chip editor.
- [ ] Move `src/shell/new-workspace/Composer.tsx` to the chip editor.
- [ ] Move the field in `src/shell/new-workspace/NewWorkspaceDialog.tsx`
      to the same chip editor. Keep its seven-line minimum, fourteen-line
      maximum, and initial focus.
- [ ] Move Enter handling and the DOM input helpers to the editor's public
      interface. Preserve their existing behaviour checks.
- [ ] Remove the replaced field markup and any now-unused imports or
      styles. Keep no second editor path or format converter.

## Decisions

### 150. Chat cannot point at another workspace

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/chat/components/Composer.tsx`, `src/chat/components/AgentText.tsx`, `src/shell/workspace/WorkspaceHeader.tsx`
- **Terms:**
  - **Workspace link:** the web address of a workspace, `app.conductive.build/orgs/<org>/workspaces/<id>`. Its ID is a long random string.
  - **Chip:** a small rounded label in a line of text. It shows the state mark, the label, and the name of a workspace. A press opens the workspace.
  - **Message box:** the text field under the chat, with Send. Today it is a plain text field from `@firna/ui`.
  - **Agent tools:** the CLI and the MCP server in each sandbox. They create and list the workspaces of the org and ask for Mac commands, and nothing more.
- **Background:** User messages show only `code` formatting. Agent answers show a small set of Markdown with no links. The header has no Copy link, and the Mac app has no address bar. The app already loads every workspace of the org, also the archived ones, so a chip can find a name and a state with no new request. In Conductor, the agent can also read the linked workspace with its CLI. Here, the agent tools can only create and list workspaces.
- **Problem:** A person cannot point at another workspace in a form that readers recognize. A pasted link shows as a long address. An agent cannot link to a workspace that it created.
- **Impact if no action:** People keep pasting long addresses that nobody can read at a glance. In the Mac app, nobody can copy a workspace link.
- **Root question:** How do people and agents point at another workspace of the org in a chat, so that each reader and the agent know which one it is and can open it? The options check widened the question, because the problem also names the agent.
- **Options:**
  - **A.** Keep the box as it is. A pasted link shows as the full address until Send. Sent messages and agent answers show each workspace link as a chip. Cost: the user sees no chip before Send. Effort: Medium.
  - **B.** A pasted link, or a pick from a menu, adds a chip to the row of attached files. The message stores the workspaces as data. The agent gets a block that names each one. Cost: the chip is not in the sentence. The message, the Worker, and the runner each need a new field. Effort: Large.
  - **C.** A pasted link becomes the text `W-395` in the box. People can also type it. A line under the box names each workspace that the text points to. Sent messages and agent answers show each `W-395` and each link as a chip. Cost: it needs the short numbers of decision 151, and the box shows text, not a chip. [GitHub works this way](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls): it shows a pasted issue link as `#26`. Effort: Large, with decision 151.
  - **D.** A new message box holds chips inside the text, so a pasted link becomes a chip at once. The agent gets the plain link. Cost: the message boxes of the chat and of New workspace need a new editor. That editor has risks with phone keyboards, input methods, undo, and focus. It needs Lexical, ProseMirror, or a new `@firna/ui` part. Effort: Large.
  - **E.** Added by the options check. Keep the native text field, and draw each chip on a layer behind its text. A paste puts the label and the name in the field, and a map turns that text back into the link at Send. Cost: the chip is styled text, not one unit. Key handlers must delete it whole and move the caret past it. The layer must follow the font, the wrap, and the scroll of the field, and it has no room for the state mark. Input methods, undo, and phone keyboards stay native, and no editor package comes in. Effort: Large.
  - **F.** Added by the options check. D, and a picker in the box. A button in the bar, or a typed `#`, lists the workspaces of the org, and a choice adds the chip. Cost: a menu with keys and a phone layout inside the new editor. A typed `#` also opens the menu when a person means a plain `#`. A person in the Mac app or on a phone then needs no Copy link. Effort: Large. The picker alone is Medium.
  - **G.** Added by the options check. D, and the agent gets one line for each linked workspace, as it gets one for each attached file. The line gives the label, the name, the branch, and the state. Cost: a change in the runner or in the turn command, with tests and a protocol line. The line is a copy from the time of the send. Effort: Large. The line alone is Medium.
  - **H.** Added by the options check. C, but Send turns each `W-395` of the org into its link, so the message keeps the ID. Cost: the box shows text, not a chip. A `W-395` that a person meant as plain text becomes a link, unless it is in code. Effort: Large, with decision 151.
- **Left out:** No change, because a pasted link stays a long address, and agent answers show no links. An agent tool that reads a pasted link with no chip, because people still see a long address. Parent and child links between workspaces, because they cover only the workspaces that an agent created, not a workspace that a person names. A preview card under the message or the box, as Slack shows for links, because the long address stays in the text.
- **Wider fix:** None, because this is a new feature, not a class of defect.
- **Previous examples:** None found in the plans, the follow-ups, the git log, or the names of earlier workspaces. Similar parts are the linked-session line, `LinkedLine.tsx`, and the file chips, `AttachmentChips.tsx`.
- **Related:** Decision 151, work that waits. Options C and H need option B or C of decision 151. The other options can show a number in the chip when decision 151 adds one.
- **Recommendation:** D. The options check changed it from C. D shows the chip at once and keeps the ID in the message, as the note on decision 151 asks, and C stores the label. E is the fallback when the editor proof of Milestone 6 fails. F and G can follow as additions.
- **Action:** asked the user, because each option adds chat behaviour that no requirement covers. The options also trade the look of the box against the risk of a new editor.
- **Chosen:** D, by the user on 9 November 2026.

### 151. Workspaces have no short number

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `migrations/`, `worker/lifecycle/workspace-data.ts`, `src/shared/workspaces.ts`, `src/shared/agent-tools.ts`
- **Terms:**
  - **Short number:** a number for each workspace in its org, such as 395 in `W-395`. Conductive has none today.
- **Background:** A workspace has a long random ID, a name, and a branch such as `calummoore/lisbon-7k2q`. The agent renames a workspace after its first answer, and two workspaces can have the same name. Conductor shows a short ID such as `W-395` in its header.
- **Problem:** People cannot name a workspace in a few characters, when they speak or write. With B alone, a person who hears or reads a number has no place to look it up.
- **Impact if no action:** Option C of decision 150 cannot work. The chip and the header can show only the name. With B alone, people find a workspace by its name, not by its number.
- **Root question:** How can people name one workspace in a few characters, so that a person who hears or reads the name can find that workspace? The options check widened the question, because under B nobody can look a number up.
- **Options:**
  - **A.** Add no short number. The chip and the header show the name. Cost: workspaces with the same name look the same, and nobody can type a workspace from memory. Effort: Small.
  - **B.** Give each workspace the next number of its org, shown as `W-395`. The header shows it as the Copy link button. The list call gives it to the agent. Cost: a migration, a counter for each org, and a new field in the workspace record. Effort: Medium.
  - **C.** Put the org initials before the number, such as `AC-395`. This tells orgs apart in text outside the app, such as in Slack. Cost: the label changes when an admin changes the initials. Links still work, because they hold the ID. Effort: Medium. The options check lowered it from Large, because the app no longer reads typed labels.
  - **D.** Added by the options check. B, and the search of the command palette also finds `395` and `W-395`. Cost: it waits for the palette branch, `calummoore/command-palette-mockups`, and it changes the search rule in the protocol doc of that branch. Effort: Medium. The palette part alone is Small.
  - **E.** Added by the options check. B, and each row of the workspace list shows the number before the time. Cost: the rows get denser, and names lose room in the sidebar and on a phone. Effort: Medium.
- **Left out:** A part of the random ID, and the end of the branch name, such as `lisbon-7k2q`, because people cannot easily say them.
- **Wider fix:** None, because this is a new feature.
- **Previous examples:** None in this repository. Other tools: Conductor's `W-395`, GitHub's issue numbers, and Linear's issue keys such as `ENG-123`.
- **Related:** Decision 150, work that waits. Options C and H of decision 150 need option B or C here.
- **Recommendation:** D. The options check changed it from B. D lets a person find `W-395` where the app already searches, at a small cost. When the palette has not merged, E gives the same step in the rows.
- **Action:** asked the user, because a short number gives every workspace a new name that no requirement covers.
- **Chosen:** D, by the user on 9 November 2026, after the options check. The user first chose B, with this note: "the actual link should be the id though, not the display name, meaning we could technically update the display name". So links and messages hold the workspace ID, and `W-395` is only a label. With D, the user added: "we can merge without pallete, but lets see where we are upto when this is ready, if this is ready first, we can just send a message to the pallete workspace after this merges". So the palette part does not block the merge of this branch.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups draw the number in the header, the chip in both message
boxes, and the chips in sent messages and agent answers. A user flow
links one workspace from another. Each screen has a desktop and a phone
variant.

- [x] Add a number and a link to each workspace of the fixtures in
      `docs/mockups/src/fixtures/`.
- [x] Add the chip part to `docs/mockups/src/components/chat/`: the state
      mark, the label, and the name. Draw a long name, an archived
      workspace, and a chip inside a message box.
- [x] Add the `W-395` Copy link button to the workspace header, on
      desktop and on a phone, with its copied state.
- [x] Add the page `app/workspace-links`: the header with the button, the
      message box with a chip after a paste, a sent message and an agent
      answer with chips, and a link of another org as plain text. Split
      it into sub-pages when it passes five screens.
- [x] Draw a chip in the New workspace message box.
- [x] Add the user flow `user-flows/link-a-workspace`: copy the link in
      one workspace, paste it in another, send, read the agent answer,
      and press the chip.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`, `npm run lint`, and
      `npm run format:check`. Smoke-test the changed pages at phone and
      desktop sizes.
- [x] Draw the failed copy of the button. Make `app/workspace-links` a
      folder page with child pages, so that each page keeps five screens
      or fewer. Let the repository and the branch give up their room in
      the desktop header first.
- [x] Record the problems outside the scope as follow-up items:
      `plans/follow-ups/chat-links-not-pressable.md` and
      `plans/follow-ups/archived-group-closed-mockup.md`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The screenshots of this milestone are in
`.context/workspace-link-chips/mockups/`.

## Milestone 1a: Current screens and number search mockups

Tags: mockup

Depends on: 1

The command palette has merged into `main`. The current New workspace
screen is a dialog. The mockups keep those screens and add number search.
The user approved the plan and all milestones on 9 November 2026.

- [x] Resolve the mockup merge conflicts while preserving the current
      screens, controls, private workspace rules, and workspace chips.
- [x] Remove the link icon from the header number button. Add a hover
      effect, as the user requested on 9 November 2026.
- [x] Draw number search in the command palette. Show the workspace
      number when the query matches it, on desktop and on a phone.
- [x] Check the mockups and visually inspect the changed pages.
- [x] Update the design and later TODOs for any mockup gaps.

## Milestone 2: Documentation and protocol

Depends on: 1, 1a

The protocol docs state the number, Copy link, the chips, and the agent
tool fields, with decisions 150 and 151 and their rejected options.

- [ ] Add a section on workspace chips to
      `docs/protocol/chat-and-events.md`: the paste rule of the message
      boxes, the chips in sent messages and agent answers, the plain link
      that the message keeps, and the rules of a link that finds no
      workspace.
- [ ] Add a section on workspace numbers to
      `docs/protocol/workspaces-and-sandboxes.md`: the number, the label,
      no reuse, the button in the header, and the link with the workspace
      ID.
- [ ] Add the number and the link to the create and list calls in
      `docs/protocol/agent-tools.md`.
- [ ] Add number search to the command palette protocol. Search `395`
      and `W-395` with the same rules as workspace names. Show the label
      when the query matches it.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Numbers and links in the Worker

Depends on: 2

The Worker gives each workspace its number and its link, in the replies
of the app and of the agent tools.

- [ ] Reserve the prefix range `202611091200`–`202611091259` for this
      milestone in `migrations/README.md`.
- [ ] Read the `databases` skill. Add a D1 migration in that range, with
      a count for each org and a number for each workspace, unique in its
      org. Give the existing workspaces numbers in the order of their
      creation.
- [ ] Give each new workspace the next number of its org, in the same
      batch as its insert. A failed first start does not give its number
      back.
- [ ] Add `number` and `link` to the shared workspace record in
      `src/shared/workspaces.ts`, the Worker replies, the readers of the
      web app, the fake API, and the fixtures of `src/test-support/`.
- [ ] Build `link` from `APP_ORIGIN`, the app origin of the Worker, also
      for the routes of the agent tools.
- [ ] Add `number` and `link` to `AgentWorkspaceSummary` and to the reply
      of a create. Describe the link in the CLI help and in the MCP tool
      descriptions in `tools/`.
- [ ] Test the numbers of two creates, of a failed create, of the
      existing workspaces after the migration, and of a restored org. Test
      the link in the replies of the app and of the tools.
- [ ] Update `tools/README.md`, `worker/tools/README.md`, and
      `worker/lifecycle/README.md`.

## Milestone 4: Copy link in the header

Tags: ui

Depends on: 3

- [ ] Add the `W-395` button to `src/shell/workspace/WorkspaceHeader.tsx`,
      on desktop and on a phone, as the mockups draw it. Reuse the pure
      part `docs/mockups/src/components/workspace/CopyLinkButton.tsx`
      with its `onPress` and `result`, and the `.line` class of the header
      styles.
- [ ] Put the repository and the branch of the desktop header in the
      `.metas` group of the header styles, in place of the spacer, as the
      mockup header does.
- [ ] Copy `workspace.link` with `AppServices.copy`. Show "Link copied",
      or "The link didn't copy. Try again." when the copy fails. A failed
      copy keeps the number, and the note stays a status for screen
      readers.
- [ ] Run `npm run marketing:pictures`, because the pictures of the
      marketing site come from the mockups, whose header now shows the
      number. Commit the new pictures.
- [ ] Test the copy and the confirmation in happy-dom.
- [ ] Update `src/shell/workspace/README.md`.

## Milestone 5: Chips in the chat

Tags: ui

Depends on: 3

- [ ] Add a pure function that splits text into plain text, code, and
      workspace links, with the URL parser and `parseRoute`. Test a link
      with and without a tab path, a Markdown link, a link in code, a
      link with `..`, a link of another origin or org, an unknown link,
      and a link next to punctuation.
- [ ] Give the chat the workspace list of the org through `ChatSources`,
      and through its own read when it has no sources. Keep the list
      current while the chat shows, also on a phone, where no
      `OrgList` watches it. Give the development page a list too.
- [ ] Add the interactive chip over the pure mockup part
      `docs/mockups/src/components/chat/WorkspaceChip.tsx`, with its
      `opener` set to a link of the app. A press opens its page through a
      new callback of the chat, which the app connects to its navigation.
- [ ] Show chips in user messages and in agent answers.
- [ ] Test the chips with the current name and state, an archived
      workspace, plain text for the other links, and a rename that
      changes a chip.
- [ ] Update `src/chat/README.md`.

## Milestone 6: Chips in the message boxes

Tags: ui

Depends on: 5

- [ ] Prove the editor first. Add `lexical` and `@lexical/react` with
      `npm install`. Show that a DOM test can type, paste a link, and
      send. Show that Chrome with a phone screen can type around a chip
      and delete it. When Lexical fails, try Tiptap in the same way. When
      both fail, stop and report it as a decision, with option E of
      decision 150 as the fallback.
- [ ] Add the local chip text field: plain text with inline chips, the
      paste rule, Backspace, Delete, and the arrow keys, Enter and
      Shift+Enter, input methods, the placeholder, the limit of eight
      lines, the sizes of `useControlSizes`, and the label "Message".
      Reuse the styles of the mockup part
      `docs/mockups/src/components/chat/ChipTextField.tsx`, and put each
      chip in an element that the caret cannot enter.
- [ ] Use it in `src/chat/components/Composer.tsx` and in
      `src/shell/new-workspace/Composer.tsx`, and in the message field of
      `src/shell/new-workspace/NewWorkspaceDialog.tsx`. Keep the dialog's
      seven-line minimum, fourteen-line maximum, and initial focus. The
      draft stays plain text.
- [ ] Update the DOM tests that type into a message box, such as
      `FirstStart.dom.test.tsx` and `NewWorkspaceScreen.test.tsx`. Test a
      paste, a Backspace after a chip, a draft that comes back with
      chips, and Enter.
- [ ] Measure the growth of the app bundle. Save the numbers under
      `.context/workspace-link-chips/`.
- [ ] Add the chip text field to
      `plans/follow-ups/firna-ui-missing-parts.md`.
- [ ] Update `src/chat/README.md` and `src/app/screens.md`.

## Milestone 6a: Number search in the command palette

Tags: ui

Depends on: 3, 1a

- [ ] Search the workspace number label with the same rules as its name.
- [ ] Show the number in a palette result when the query matches it.
- [ ] Test number search and update the area README.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Check whether the command palette is on `main`. When it is, merge
      `main`. Then add a mockup milestone and a ui milestone before this
      one, for the number search and the label in a palette row, and run
      them. When it is not, keep the palette task of the post-merge
      follow-up below.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [x] Not needed: the palette is already on `main`. Only when the palette was not on `main` at the merge: send a
      message to the Conductor workspace "Command Palette Mockups",
      `8f4c4c29-c7d4-4042-9c41-ef4a0d159eb4`, on
      `calummoore/command-palette-mockups`. Ask it to merge `main` and to
      add the number search of decision 151. The palette search then
      finds `395` and `W-395`, with the same rules as the name. A
      workspace row shows the label when the query matches it. The
      protocol doc of the palette states the rule.

- [ ] On the deployed app, try the message box on an iPhone and on an
      Android phone: paste a link, type around the chip, delete it, and
      send. This needs real phones.
