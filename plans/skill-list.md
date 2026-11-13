# Skill list in the composer

Status: Active. On branch `calummoore/perth-lc63`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

`/` in the composer of a workspace chat opens a list of the skills that the
agent can use, as `@` opens the list of files today
(`src/chat/components/chip-field/mention-plugins.tsx`). A pick puts a skill
chip into the message. The runner reads the skill folders of the cloud
computer and reports the skills, with the name and the description of each,
to the Worker. The Worker keeps the latest list and sends it to the app.
When a message goes to an agent, the runner writes each skill of the message
in the form that this agent runs.

Today the app knows no skills. The file tree holds the path of each
committed `SKILL.md`, but not its text. The org skills repository
(`plans/org-skills-repository.md` on branch `calummoore/oslo-3u7a`) copies
skills outside the repository folder, so they never show in the file tree.
Claude's SDK gives its skills only from a running session
(`Query.supportedCommands()`), and the Codex app server has `skills/list`.

The change does not cover: built-in commands of the agents, such as
`/compact`, skills of plugins and MCP servers, the skills of the org skills
repository before that plan merges, an edit of skills from the app, and
argument hints of skills, and the commands of `.claude/commands/`.

Short name of this change in decision numbers: skill list decision.

Contract owners:

- `docs/protocol/skill-mentions.md`, a new protocol doc that Milestone 2
  writes.
- [File mentions](../docs/protocol/file-mentions.md), for the list
  behaviour that both lists share.
- [Agent runner](../docs/protocol/agent-runner.md), for the skills report.
- [Agent instructions](../docs/protocol/agent-instructions.md), for the text
  that the agent gets.
- The [runner README](../runner/README.md) and
  [agent input](../runner/agent-input.md).

## Decisions

### Skill list decision 1: Where the skill list comes from

Answered on 2026-11-13: **B**.

- Root question: how does the message box learn which skills the agent can
  use?
- **A.** Find the skill folders in the file tree of the app. Names only, no
  descriptions, and never the org skills.
- **B.** The runner reads the skill folders and the front matter of each
  `SKILL.md`, and reports the list. The Worker forwards it. Chosen.
- **C.** The runner asks Claude's SDK for its skills and commands for each
  session. Empty before the first message, and nothing for Codex.
- **D.** As B, but the Codex half comes from the `skills/list` answer of
  the Codex app server, not from a scan of folders. Added by the options
  check. It is a way to build B, so the choice stays B. The design uses it.
- Left out: a fixed list of built-in commands, because it shows no skills.
  A read of `SKILL.md` files from GitHub by the Worker, because it misses
  new skills, the skills of the Codex home, and the org skills. An idle
  Claude session only to call `supportedCommands()`, because it needs a
  process and a login for each start.
- Correction on 2026-11-13, from the spike of Milestone 3: Claude also
  reports 16 skills that come with its CLI, such as `dataviz`. A scan of
  the folders does not find them. The choice stays B. The list leaves
  these skills out, as a design call below says.
- Reason: the list has descriptions, works for both agents, and can take
  the org skills when that plan merges.

### Skill list decision 2: What a picked skill adds to the message

Answered on 2026-11-13: **B**.

- Root question: how does a picked skill reach the agent that runs the
  message, when each message to an agent starts with a sender line?
- **A.** The text `/name`. Claude runs it, Codex reads plain text.
- **B.** A skill chip. The runner writes the form of the agent that runs
  the message: `/name` for Claude, `$name` for Codex. Chosen.
- **C.** `/name` or `$name` as text, from the model chosen now. Wrong after
  a change of the model to the other agent.
- **D.** For Codex, a structured input item `{ type: "skill", name, path }`
  beside the text, which the app server of Codex 0.167 takes. Added by the
  options check. It is a way to build B. The design uses it in place of
  `$name`.
- **E.** For Claude, `/name` at the very start of the prompt, before the
  sender line. Added by the options check. Milestone 3 tests it.
- **F.** The runner puts the text of `SKILL.md` into the message. Added by
  the options check. It loses the supporting files and tools of the skill,
  so it is only the fallback when no other form runs the skill.
- Reason: it matches the file chips, and it stays right when the model
  changes before the send.

### Skill list decision 3: How Claude runs a manual-only skill

Open since 2026-11-13. Asked in the chat. It blocks only the Claude form
of a manual-only skill in Milestone 3.

- Background: a manual-only skill sets `disable-model-invocation: true` in
  its `SKILL.md`. In the spike of Milestone 3, Claude ran no such skill
  that the text named after the sender line (0 of 2). It ran each one
  when `/name` came before the sender line (2 of 2).
- Root question: how does Claude run a manual-only skill that a member
  picks?
- **A.** Leave manual-only skills out of the Claude list.
- **B.** Put `/name` of a manual-only skill before the sender line. One
  such skill for each message, and the sender line becomes the skill
  arguments.
- **C.** Add the text of the `SKILL.md` to the message. Skill settings such
  as `allowed-tools` and `$ARGUMENTS` then do nothing.
- **D.** Put `/name` before the sender line for every Claude skill.
- Left out: a separate `/name` message before the member's message,
  because the skill then runs before the agent sees the request.
- Recommendation: B. It is the only tested form that runs a manual-only
  skill with all its settings.

## Design

### Design calls

Each call below is my call, made on 2026-11-13.

- `/` opens the list at the start of the text, or after a space or a line
  break, as `@` does. A `/` inside a word or a path, such as `src/a`, opens
  nothing. Reason: the user asked for a list like the list of files.
- The arrow keys, Enter, Tab, and Esc work as in the list of files.
- When no skill matches the query, the list closes. When the list shows
  no row, Enter sends, also while a line such as "Loading skills…" shows.
  Reason: text such as `see /tmp` is common, and the list of files keeps
  Enter in that case. Esc is not needed to send it.
- Each row shows the skill name and its description on one line, with the
  description muted and cut with an ellipsis. Reason: the description tells
  the member what the skill does.
- The rows show the skills of the agent of the model chosen now in the
  composer. A skill that both agents have shows once. Reason: a skill of
  the other agent does nothing in this message.
- A query matches names first: names that start with the query, then
  names that hold it, then descriptions that hold it. Each group is in name
  order. At most 100 rows show.
- The stored text of a skill chip is `/` and the name, such as `/plans`,
  at the start of the text or after a space or a line break. Reason: the
  stored text, the titles, and the copies stay short, and Claude reads the
  same form. The text is the same when a member types it without the list.
- A sent message shows a skill chip for each such text that names a skill
  of the current list. Every other such text stays text. Text in inline
  code or a code block stays code.
- The runner makes the list of each agent at the start and after each
  change that the repository watcher sees:
  - Claude: a scan of `<repository>/.claude/skills/*/SKILL.md`, because the
    runner starts Claude with the project settings only
    (`runner/src/providers/claude.ts:146`).
  - Codex: the `skills/list` answer of the Codex app server for the
    repository folder, with the shared Codex home `~/.conductive/codex`.
    Reason: it follows the exact rules of Codex, and it gives the path that
    the structured input needs. A session with a gateway token has its own
    Codex home without a `skills` folder
    (`runner/src/providers/codex-credentials.ts`), so the list uses the
    shared home. When the app server gives no answer, the runner scans
    `<repository>/.agents/skills` and `<repository>/.codex/skills`, and it
    warns.
- The runner keeps every skill that the agent loads. It takes the name and
  the description as the agent does: from the front matter, else the
  folder name and, for Claude, the first line of text that is not empty,
  without a heading mark. Codex needs a description, so a Codex skill
  without one stays out. It leaves out a skill whose name holds white
  space, and it warns. Changed on 2026-11-13, after a read of the Claude
  program: the Claude list also leaves out a skill whose `user-invocable`
  is not true, because Claude hides it from the menu of its user. Reason: no stored text can hold
  such a name, as for a path with a line break in the list of files. A
  stricter rule on names was rejected, because the list then hides skills
  that the agent runs.
- The runner reports at most 200 skills, in name order. It never cuts a
  description. It sends a description of more than 4096 characters as
  empty text, and it warns. The Worker cuts each description to 300
  characters after its filter of secret values. Changed on 2026-11-13 from
  a cut in the runner, because a cut before that filter can split a secret
  value, as the rule for port labels says. It filters known credentials out of each
  description, as it does for port labels. Reason: the report has a size
  limit, and a description is repository text.
- The Worker keeps the latest list for each workspace, as it keeps the
  listening ports. So the list shows while the cloud computer sleeps.
  Before the first report, the list shows "Loading skills…". A workspace
  whose runner sent no skills report after its start shows "The list of
  skills is unavailable". An empty report shows "This repository has no
  skills".
- A chip of a skill that the agent of the send does not have, such as
  after a change of the model, stays a chip. That agent gets the text
  `/name` unchanged. Reason: the member sees the chip and can remove it.
- The skills that come with the Claude CLI, such as `dataviz`, stay out of
  the list. Reason: a scan of folders cannot find them, and decision 1
  chose a scan. A member can still name them in text.
- The spike of Milestone 3 found these forms, with evidence in
  `.context/skill-list/spike/`:
  - Claude runs a normal skill when the text names it as `/name` after the
    sender line. So the text of a Claude message stays as the member
    wrote it.
  - Codex adds the skill to the model input for the item
    `{ type: "skill", name, path }`, where `path` is the absolute path of
    the `SKILL.md` that `skills/list` gives. A wrong path is dropped
    without an error. Codex has no login on the test computer, so no model
    answer is proven.
- The agent input: Codex gets the structured skill item of option D, and
  the text keeps `/name`. Milestone 3 first checks how each agent runs a skill
  that a message names after the sender line, because each message to an
  agent starts with that line (`runner/agent-input.md`). The chosen form is
  the one that runs the skill in both checks. When neither the in-text
  form nor a line of its own runs the skill, Milestone 3 stops, and the
  plan asks the user.

#### Design calls from the mockups

Each call below is my call, made on 2026-11-13, from the mockups of
Milestone 1 (`app/skill-mentions` and `user-flows/use-a-skill`).

- The line "This repository has no skills" shows only for `/` alone. A
  query after `/` closes the list, as when no skill matches. Reason: the
  design said both that an empty report shows the line and that no match
  closes the list. With the line for each query, the line would show over
  the chat for each typed path, such as `see /tmp`.
- The lines "Loading skills…" and "The list of skills is unavailable" show
  for each query, because no list can say yet whether a skill matches.
  Enter still sends, as the design says for a list with no row.
- The skill chip shows the skill icon and the name without `/`, as a file
  chip shows its name without `@`. The icon is `SquareSlash` of the Lucide
  set, a `/` in a square, because `/` opens the list. The title of the chip
  is the description of the skill. Screen readers hear "Skill" before the
  name.
- A press on a skill chip in a sent message opens nothing. Reason: a skill
  of the Codex home or of the org skills repository has no file of the
  branch to open, and the title gives the description.
- The rows of the list show the skill icon before the name, as the rows of
  the list of files show an icon. `MentionList` takes an optional
  `description` for each row and an optional `label` for its listbox, which
  the list of skills sets to "Skills". Milestone 6 uses both, and the list
  of files stays as it is.

#### Design calls from the docs

Each call below is my call, made on 2026-11-13, while Milestone 2 wrote
`docs/protocol/skill-mentions.md`.

- The skills report holds the name and the description of each skill, and
  no path. The runner keeps the path of each Codex skill for the skill
  input. Reason: the app needs no path.
- Each list holds each name once. Of two skills with one name, the list
  keeps the one that the agent gives first.
- The runner sends the first skills report of each connect before
  `runner.ready`, as it does for the file reports and the port report. So
  a `runner.ready` with no skills report since the connect marks the list
  unavailable.
- The kind `skills.updated` joins the kinds of `report.refresh` in
  `docs/protocol/lost-workspace-updates.md`. When a repair of the report
  fails, the list shows "The list of skills is unavailable".
- The workspace hides secret values in the names and the descriptions, as
  for each runner event. A skill whose name holds a hidden value does not
  show, as for a file whose label hides a secret value.
- A sent message shows a skill chip for a skill text that names a skill of
  the current list of either agent. Reason: a chip of the composer stays a
  chip after a change of the model, so its sent message keeps it too.
- `docs/protocol/agent-instructions.md` passed 250 lines. Its sections on
  the life of the text and on how each agent gets it moved to
  `docs/protocol/session-instructions.md`.

#### Design calls from the Worker

Each call below is my call, made on 2026-11-13, in Milestone 5.

- The browser event is `SkillsUpdated` in `src/shared/skills.ts`:
  `{ type: 'skills.updated', skills: { claude, codex } | null }`. A
  workspace with no such event has had no report, so the list shows
  "Loading skills…". `skills: null` means unavailable. A list, also an
  empty one, is the list. Reason: one event type gives the app all three
  states, as `ports.updated` does for the servers.
- The Worker stores `skills: null` once when a runner sends `runner.ready`
  with no skills report since its connect. It stores it again only after
  a list came between. Reason: an older runner sends `runner.ready` at
  each connect, and a repeated event changes nothing.
- A refused skills report counts as the report of its connect. Reason:
  else `runner.ready` makes the list unavailable while the repair runs.
- A failed repair of the skills report stores `skills: null` after its
  refusal marker. Reason: the app then reads one event type, and does not
  also read refusal markers, as the list of servers does.
- The history keeps only the latest `skills.updated` event, as it keeps
  only the latest full file tree. Reason: the runner sends a report at
  each connect, of up to about 512 KiB, and each new tab reads the whole
  history.
- A list of more than 200 skills, or a description of more than 4096
  characters, is refused as too large. The Worker leaves out a skill whose
  name no skill text can hold, and the later skill of a repeated name, as
  the runner does, and does not refuse the report. Reason: the limits are
  size limits, and one bad name must not hide the whole list.
- The cut to 300 characters adds no ellipsis. Reason: the row ends with an
  ellipsis on screen, and the doc says "cuts".
- The lost-data label of a refused skills report is "An update from the
  cloud computer". Reason: no session line shows a marker of a report
  that belongs to no session, and a new label needs a change of the
  mockup copy in `docs/mockups/src/components/chat/lostCopy.ts`.

#### Design calls from the app

Each call below is my call, made on 2026-11-13, in Milestone 6.

- A paste, a draft that comes back, and a list that loads later make a
  skill chip of each skill text that a list of either agent names. Typed
  text stays text. Reason: a chip of the composer stays a chip after a
  change of the model, so its draft must give it back, and the sent
  message uses the same rule.
- Each other skill text of a paste or a draft waits as text, as a mention
  does, so a list that loads later makes its chip. Typing that continues
  it makes it plain text.
- The title of a chip in the field is the description of the skill of the
  agent of the composer, else of the other agent. A sent chip takes the
  Claude description first.
- The query of `/` runs to the caret with no space, as the name of a skill
  text does. The field reads no code in a paste or a draft, as for
  mentions. A sent message reads code, as the runner does.
- A skills report that the app cannot read keeps the last lists, as a
  report of the listening ports does.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The skill list in the composer, the skill chip in the field and in a sent
message, and the flow of a pick.

- [x] Add `app/skill-mentions` to the catalogue, beside
      `app/file-mentions`. Draw the list with rows of a name and a muted
      description, the highlighted row, and the lines for loading, for an
      unavailable list, and for a repository without skills. Reuse
      `docs/mockups/src/components/chat/MentionList` and `FileChip`.
- [x] Draw the skill chip in the message field and in a sent message, with
      its icon cell and its ×, as
      [Remove a chip of the composer](../docs/protocol/file-mentions.md#remove-a-chip-of-the-composer)
      says.
- [x] Add the flow `user-flows/use-a-skill`: type `/pl`, pick `plans`, and
      send.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at
      `http://127.0.0.1:4173`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Write `docs/protocol/skill-mentions.md`: the list, the rows, the
      sources of the skills, the chip, the stored text, the sent chips, and
      the text that each agent gets. Link it from
      `docs/protocol/README.md`.
- [x] Add the skills report to
      [Agent runner](../docs/protocol/agent-runner.md): the folders, the
      limits, the filter of credentials, and the refresh.
- [x] Add the skill form of each agent to
      [Agent instructions](../docs/protocol/agent-instructions.md).
- [x] Update [File mentions](../docs/protocol/file-mentions.md) where it
      states a rule of the list that the skill list shares.
- [x] Read both legal pages and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.
- [x] Set the `slash-commands` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts` to
      `in-progress`, with a note that the list shows skills.

## Milestone 3: Agent input of skills

Depends on: 2

The runner writes each skill text of a message in the form of its agent.

- [x] Check, with one real session of each agent on this cloud computer,
      how the agent runs a picked skill. For Claude, test `/name` in the
      text after the sender line, `/name` at the very start of the prompt,
      and a line of its own after the branch line. For Codex, test the
      structured skill item and `$name` in the text. Save the transcripts
      under `.context/skill-list/`.
- [x] Write the chosen form in `providerMessage`
      (`runner/src/providers/message.ts`) and the Codex input. Only a skill
      text that names a skill of the list of that agent changes. Keep every
      other `/` text unchanged.
      The text of both agents stays the stored text. Codex gets one skill
      input for each listed skill of the text
      (`runner/src/providers/skill-input.ts`), also during a turn. The
      parser is `src/shared/skill-text.ts`, for Milestone 6 too. Open: the
      Claude form of a manual-only skill waits for skill list decision 3.
      A comment in `send` of `runner/src/providers/claude.ts` marks its
      place.
- [x] Tests in `runner/src/providers/instructions.test.ts` or a new test
      file: a skill at the start, after a space, in a code block, an
      unknown name, and both agents.
      The parser cases are in `src/shared/skill-text.test.ts`, and the
      agent cases in `runner/src/providers/skill-input.test.ts`.
- [x] Update `runner/agent-input.md`.

## Milestone 4: Runner skills report

Depends on: 2

- [x] Add `src/skills.ts`: scan the Claude folder, parse the front
      matter with the fallbacks of the design, send each description
      whole (empty over 4096 characters), filter credentials, and sort.
      One unreadable file warns and skips that skill.
- [x] Add the Codex list from `skills/list`, with the scan of the Codex
      folders as its fallback.
- [x] Add the event `skills.updated` with the list of each agent. Send it
      after each connect, after a watcher scan that changes it, and for a
      `report.refresh` of that kind, as `ports.updated` does
      (`runner/src/ports.ts`, `runner/src/runner.ts`,
      `runner/src/commands.ts`, `runner/src/stored-events.ts`).
      The runner sends it and its tests pass. The six files of the app and
      the Worker that the new members of `RunnerEvent` and
      `RunnerReportKind` broke got their real behaviour in Milestone 5, and
      `npm run typecheck` passes.
- [x] Tests: each folder, a name with white space, no front matter, a
      long description, a credential in a description, more than 200
      skills, a change of a `SKILL.md`, a refresh, and a Codex app server
      without an answer.
- [x] Update `runner/README.md` and `runner/reports.md`.

## Milestone 5: Worker skills state

Depends on: 4

- [x] Accept `skills.updated` in the fixed list of runner events, with its
      size limit (`worker/chat/runner-event-identity.ts`,
      `worker/chat/runner-event-limits.ts`, `worker/chat/runner-input.ts`,
      `worker/chat/repair-refusal.ts`).
- [x] Keep the latest list for each workspace and send it to each tab, as
      `worker/chat/port-reports.ts` does for ports. Add the shared type in
      `src/shared/skills.ts`.
- [x] Mark the list unavailable when a runner starts and sends no skills
      report, so that an older runner shows the unavailable line.
- [x] Tests in `worker/` for the store, the forward to a tab, a reconnect,
      an older runner, and a refusal of a list over the limit.

## Milestone 6: Skill list and chips in the app

Tags: ui

Depends on: 1, 5

- [x] Give the composer the skills through a store, beside the files of
      `src/chat/mentions/MentionsContext.tsx`.
      `ChatMentions.skills` is the store. The shell gives
      `WorkspaceSkills` (`src/shell/workspace/workspace-skills.ts`).
- [x] Share the keyboard and the open state of `MentionPlugin` between the
      list of files and the list of skills. Keep each file under 300 lines.
      `MentionListPlugin` in
      `src/chat/components/chip-field/mention-list-plugin.tsx`.
- [x] Add the skill chip node, its paste and copy, and its return in a
      draft (`src/chat/components/chip-field/`).
- [x] Show a skill chip in a sent message (`src/chat/links/`).
- [x] DOM tests beside `MentionList.dom.test.tsx`: open, filter, pick,
      Esc, Enter with no match, the model of the other agent, and a sent
      chip.
- [x] Check the list and the chip in a browser on the local app, against
      the mockups of Milestone 1.
      On the chat development page in headless Chrome, with screenshots in
      `.context/skill-list/m6/`. Headless Chrome reports no hover, so the
      × in the icon cell under a pointer was not seen. The chip uses the
      shared `ChipIconCell` of the file chips.
- [x] Update the READMEs of `src/chat/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Set the `slash-commands` row to `available`, with a note that the
      list shows the skills of the repository.
- [x] Set the effective date of the Privacy page to the merge day, as
      earlier changes of that page did.
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
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Add the folder of the org skills repository to the skills report
      when `plans/org-skills-repository.md` merges.
- [ ] Smoke-test the list on `conductive.build` in a workspace whose
      repository has skills.
