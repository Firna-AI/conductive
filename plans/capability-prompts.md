# Capability prompts

Status: Active. [PR #660](https://github.com/Firna-AI/conductive/pull/660) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

A workspace can start with capabilities: secrets that its sessions use with
no approval. Members choose them in New workspace or in the Capabilities
control of the workspace. The owner of an automation chooses the secrets of
each run workspace. Today no text tells the agent about them. It learns of
a grant only from `list_secrets` or a run result. So agents ask members for
keys that they already have. The agent instructions also omit `list_secrets`
and `run_with_secrets`, although
[Agent instructions](../docs/protocol/agent-instructions.md#what-the-instructions-hold)
says that they name them.

The change gives each new session its capabilities in its instructions,
only when it has some. A later change of the capabilities of a workspace
reaches each session that exists: as a steer in a running turn, or before
the next message of an idle session. The chat of each session shows the
change as a note. The change does not cover changes for the whole org,
such as a new mark for all agents in the Secrets tab.

## Decisions

All four decisions are from Cal on 2026-11-20, after a brainstorm. The
brainstorm report is in `.context/capability-prompts/approaches.md`.

1. **How the agent learns its capabilities: A.** The instructions of a new
   session name its capabilities, only when it has some. A change reaches
   each session as a steer or a line of the app. Rejected: a capability
   line in each message, which costs tokens in each message. New
   instructions after each change, which make each session read its whole
   conversation again. Start facts plus a line in each message while they
   differ, which adds runner state. Facts in the tool descriptions, which
   cost a cache reload on each change and a Worker call at each turn.
2. **The secret tools in the instructions: A.** The instructions name
   `list_secrets` and `run_with_secrets`, and say to call `list_secrets`
   before the agent asks a member for a credential. Rejected for now: a
   test that the instructions name each tool. It is a test for a class.
3. **A change in an idle session: A.** The change waits, and the agent
   gets it in the turn that the next message of that session starts. No
   turn starts for it. Rejected: a turn for each change, as a late answer
   starts one, because each open session would wake, use tokens, and act
   for the member who changed the control. Only running turns, because an
   idle session would never learn of the change.
4. **The chat shows the change: B.** Each session shows the change as a
   note, such as "Cal pre-approved `STRIPE_KEY`." Rejected:
   a line that only the agent sees, because members then cannot see what
   the agent was told, or who made the change.

## Design

The options check of these decisions and of this design is in
`.context/capability-prompts/options-check.md`. Its fixes are merged
below. Decision 1 is Large, not Medium, because the change lines need a
new runner command, a waiting store, and a chat note.

- **The facts.** The facts of a session are the secrets that it can use
  with no approval. The secrets come from each secret for all agents, each
  pre-approval, each session approval of that session, and each value for
  this workspace. A value for 15 minutes is not a capability, because it
  ends by itself. The facts name secrets only, never a value or a
  description. Names are unique and sorted. Mac access is not a fact, as
  the design call of 2026-11-23 below says.
- **The wire.** A new type `RunnerCapabilities` in
  `crates/cnd-runner-interface/src/runner_commands.rs` holds `secrets`.
  The optional field `capabilities` goes on `RunnerTurn` only,
  because the runner builds the instructions only from a turn. Older
  runners drop the field. An older Worker sends none, and the runner then
  adds no capability text.
- **The instructions.** At the first turn of a session, the runner adds one
  paragraph after the tool paragraph when the session has secrets. It
  names at most 10 secrets as JSON, then "and N more". It says that
  `run_with_secrets` uses them with no request. It ends with this: members
  can change the capabilities, and the app then tells the agent in a line
  of the app.
- **A change.** A change is a difference in the facts of a session. The
  Worker takes the facts of each session before and after a write, and
  sends each session only its own difference. So a removed pre-approval
  sends nothing to a session that a mark for all agents still covers. The
  writes are an edit in the Capabilities control, through
  `worker/app-api/capabilities.ts`, the Remove of a value for this
  workspace, through `worker/secrets/routes.ts`, and an answer that gives a
  value for this workspace. A session that its own request already told
  gets no line for the answer: the session that asked, and each session
  with a covered request that the same answer settles. Its call or its
  late-answer line tells it. The writes report what they changed with
  `RETURNING`, so two edits at the same time each name their own member.
- **The words.** One shared function in `src/shared/` writes the words for
  the chat and for the agent from the member and the structured changes,
  as the late-answer line does. The chat writes "You" for the viewer. The
  shared UI holds the words in
  [capabilityChangeCopy.ts](../src/ui/components/chat/capabilityChangeCopy.ts),
  as pieces of text and names of secrets, with no fixtures.
- **The waiting store.** The chat Durable Object keeps the waiting lines of
  each session in order, also of a closed session, because a closed session
  can reopen. A session that has not started a turn gets no line, because
  its instructions give the facts that hold at its first turn. The Worker
  reads the facts and the waiting lines in the same step that prepares the
  first turn command, so no change falls between the two.
- **The notice command.** A new runner command `notice` carries the session,
  the turn, and the lines. It is not a member message, so it has no sender.
  The sdk-helper gives the lines to the agent under an app header in place
  of a `Sender:` line, as
  [The sender line](../docs/protocol/message-lines.md#the-sender-line)
  says for a line of the app.
  - While a turn runs, the Worker sends the command at once, and the lines
    join the turn as a steer.
  - In an idle session, the lines wait. The Worker sends them with the next
    turn command of that session. The agent reads them in the same prompt
    as the member's message, after its sender lines.
  - A line that the runner did not take before its turn ended goes back to
    the waiting store, in order. It never starts a turn and never moves
    into a member's turn as a message.
- **Older runners.** A new runner announces `capabilityNotices: true` in its
  hello, as it announces `fileServer`. The Worker sends `notice` only to such
  a runner. For an older runner, the lines stay in the waiting store and in
  the chat. The agent does not get them until the runner updates. This
  fails safe, because the Worker checks each grant at run time.
- **The chat.** A new note `capabilities.changed` in the transcript of each
  session holds the member and the structured changes, as
  `workspace.continued` does. The chat places it by its time, not by a
  turn. So it does not fold with the work of a turn that it falls in. The
  session copy and `read_session` show it too. An older tab and
  an older copy of the Mac app skip the unknown event and keep the cursor.
  `CapabilityChangeLine` in `src/ui/components/chat/` draws it,
  as [app/capabilities/changed](../docs/mockups/catalogue-secrets.md)
  shows.
- **Failures.** The capability write is in D1, and the line goes to the
  chat Durable Object after it. When the Durable Object call fails, the
  route still returns the saved capabilities and logs a warning.

Design calls, by Claude on 2026-11-20:

- A workspace without capabilities gets no capability text. Reason: the
  user asked for the text only when it has some.
- Secrets for all agents count as capabilities, with the limit of 10
  names. Reason: an admin marks them so that each agent uses them with no
  request. The limit keeps a large org from filling the instructions.
- An answer that a member gives to the request of an agent sends no line
  to a session that its own request already told: the session that asked,
  and each session with a covered request that the same answer settles. A
  value for this workspace sends a line to each other session. Reason:
  decision 1 sends each change, and only those sessions learn of the
  answer by themselves. So one answer tells each session once, as the
  late-answer rule of one line for each session says. The covered
  sessions joined this call on 2026-11-20, after the Milestone 2 report
  found that the late-answer rule already tells them.
- A mark for all agents that an admin adds or removes, a new secret with
  that mark, and a deleted secret send no line. Reason: they change each
  workspace of the org at once. New sessions get the facts, and the Worker
  checks each run, so a stale fact fails safe.
- Sessions that exist before the deploy get no start facts. They get the
  tool text below and each later line. Reason: their instructions stay as
  saved, as
  [Agent instructions](../docs/protocol/agent-instructions.md) says. A
  one-time line with the start facts was left out as more work than the
  gap is worth.
- The descriptions of `list_secrets`, `run_with_secrets`, and
  `run_mac_command`, and the CLI help, say when to use each call. The Mac
  call says that it needs Mac access. Reason: this was a design call of the
  brainstorm report, and it reaches sessions that exist and Claude
  subagents. It costs one prompt cache reload for each open session, once.
- A change line is a line of the app with no sender. Reason:
  [The sender line](../docs/protocol/message-lines.md#the-sender-line)
  already says that a line of the app has no sender line. The late-answer
  line does not meet this today, which the follow-up item
  `plans/follow-ups/late-answer-sender-line.md` records.

Design calls from the mockups, by Claude on 2026-11-20:

- The note is a centred, muted line with the Capabilities icon, as the note
  of Continue. Reason: the icon ties the note to the control that made the
  change, and the chat draws each note of the app in that way.
- The note does not fold with the work of a turn. Reason: it belongs to no
  turn, and members still see what the agent was told after the turn ends.
- One note gives the changes of one write in one sentence, in a fixed
  order: pre-approvals added, pre-approvals removed, session approvals
  removed, values given, values removed, then Mac access. Mac access on
  adds its rules after the sentence. Names and changes form lists with
  "and". Reason: one sentence keeps the note short, and the rules follow
  the change that they explain.
- Each write gives its own note, also when a member makes several writes
  in a row. The control saves each click, so three clicks give three
  notes. Reason: a merge needs a time window and a rule for a click that
  undoes an earlier one, and three short notes stay readable.
- The states of `app/capabilities/changed` are child pages, and the two
  saved states of `app/capabilities` moved into their own folders with the
  same paths. Reason: a catalogue page shows at most five screens, and a
  folder with child folders shows only its canonical screen, as
  [the catalogue](../docs/mockups/catalogue.md) says.

Design calls from the docs, by Claude on 2026-11-20:

- "What agents learn" is its own page,
  [Capabilities: what agents learn](../docs/protocol/capabilities-agents.md),
  with a short section of that name in `capabilities.md`. "The same text
  for the life of a session" and "The parent and the depth" moved to
  [Agent instructions: facts that change](../docs/protocol/agent-instructions-changes.md),
  beside the capability text of the instructions. Short sections with the
  old headings keep the old anchors. Reason: the `documentation` skill
  targets about 250 lines for a protocol doc. `capabilities.md` would reach
  280 lines, and `agent-instructions.md` would pass 300. The split also
  does the work of the follow-up item `agent-instructions-doc-length.md`,
  so this branch deletes that item. The item also asked to move the short
  "The branch line" section. It stays, because the doc is under the target
  without that move, and the section only links to `message-lines.md`.
- A session that has not started a turn, and a session that its own
  request already told of an answer, get no change note in their chat
  either. Reason: the design keeps one line for the waiting store and the
  chat, and the chat shows what the agent was told, as decision 4 B wants.
- The docs record a risk: an agent chooses the name of a value for this
  workspace, and the instructions and the change notes of the other
  sessions then name it. Reason: the member sees the name before giving
  the value, the instructions quote each name as JSON, and `read_session`
  already gives such names to other agents. A name rule for such values
  was left out, because it is a new validation, and only the user adds one.

Design calls from the app, by Claude on 2026-11-21:

- A note with a change of an unknown kind is skipped as a whole, and its
  event number still moves the cursor. Reason: a part of a note would
  misstate what the agent got.
- The reader accepts what the type allows, also an empty list of names.
  Reason: a stricter check is a new validation, and the Worker never sends
  an empty list.
- "You" comes from the same rule as the notes of Continue and of a
  repository change. Reason: the app keeps one rule for "You".
- The dev fake seeds the notes with the address option `?capabilities=`,
  in the pattern of `?secrets=`. It does not compute notes on each write.
  Reason: a copy of the Worker's difference in the fake could drift.

Design call from the merge of `main`, by Claude on 2026-11-21:

- The notes of a turn come after the sender lines of the member's
  message, in the same prompt, not before the message. Reason: `main`
  now puts the member's text first, so that a skill at the start of the
  text starts the prompt (#358). Notes first would stop a Claude skill.
  The agent still reads the notes before it acts.

Design call from the merge of `main` with Mac access decision 7, by Claude
on 2026-11-23:

- Mac access is not a fact of a session, and a change of Mac access gives
  no change note. The capabilities of a session are its secrets only.
  Reason: Mac access decision 7 of 21 November 2026, which merged to
  `main` with #614, makes the stored Mac access value gate no request.
  Agents can always ask, and the switch of the Mac app acts only on the
  Mac of the member who uses it. A fact or a note that Mac access is off
  would tell the agent wrongly that it cannot ask.
- This call replaces the Mac parts of the design calls of 2026-11-20
  above. The text of the Mac command call no longer says that the call
  needs Mac access, and a note no longer ends with Mac access and its
  rules. The tool text keeps whose Mac gets the request, and when the Mac
  app asks first. The mockup page `app/capabilities/changed/mac` is gone.
  The `several` page has a removed pre-approval of `FIGMA_TOKEN` as its
  third change.

Contract owners:

- [Capabilities: what agents learn](../docs/protocol/capabilities-agents.md),
  linked from [Capabilities](../docs/protocol/capabilities.md).
- [Agent instructions](../docs/protocol/agent-instructions.md) and
  [Agent instructions: facts that change](../docs/protocol/agent-instructions-changes.md).
- [Message lines](../docs/protocol/message-lines.md), for the app header of
  a change note.
- [Late answers](../docs/protocol/secret-late-answers.md), for the shared
  shape of a line of the app.
- The [mockup catalogue of secrets](../docs/mockups/catalogue-secrets.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat of a session shows the change note, in a running turn and in an
idle session.

- [x] Add a `CapabilityChangeLine` component in
      `docs/mockups/src/components/chat/`, beside `LateAnswerLine.tsx`. It
      takes the member, the structured changes, and no fixtures, so the app
      can use it.
- [x] Add `app/capabilities/changed`, with the note in a running turn, and
      the next step of the agent that uses the pre-approved secret.
- [x] Add the variants: `idle`, with the note at the time of the change and
      the next message after it. `mac`, with Mac access turned on.
      `removed`, with a removed pre-approval and a removed value for this
      workspace. `several`, with one edit of three changes. `you`, as the
      member who made the change sees it. They are child pages with these
      paths, because a page shows at most five screens.
- [x] Describe the pages in `docs/mockups/catalogue-secrets.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add a section "What agents learn" to `docs/protocol/capabilities.md`
      with the facts, a change, the change note, where it goes, and older
      runners. Record decisions 1, 3, and 4 with their rejected options.
      Record the cost of decision 1: a summary can drop a change line.
- [x] Update `docs/protocol/agent-instructions.md`: add the capabilities to
      the facts, add the guidance for `list_secrets`, and add the
      capabilities to the facts that can change during a session.
- [x] Update `docs/protocol/message-lines.md` for the app header of a line of
      the app, and `docs/protocol/secret-late-answers.md` where it rejects a
      notice that waits, so that the two rules read clearly side by side.
- [x] Update `docs/protocol/automation-runs.md` where it says that the run
      text names no chosen secret, with the new reason.
- [x] Update `docs/protocol/secret-requests.md` for the new tool text.
- [x] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      public guide in full. Update each sentence that the change makes
      wrong. Check `security.md`, `cloud-computer.md`, and `mac-app.md` in
      `src/marketing/docs/` first.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: Runner instructions and tool text

Depends on: 2

- [x] Add `RunnerCapabilities` and the optional `capabilities` field on
      `RunnerTurn` in `crates/cnd-runner-interface/src/runner_commands.rs`,
      with a wire test. Regenerate the TypeScript with the command in
      `CLAUDE.md`.
- [x] In `crates/cnd-runner/src/engine/instructions.rs`, add the capability
      paragraph when the facts are not empty. Pass the facts from
      `crates/cnd-runner/src/engine/input.rs`.
- [x] Name `list_secrets` and `run_with_secrets` in the tool paragraph, and
      add the sentence on when to call `list_secrets`.
- [x] Update the descriptions in `crates/cnd-tools/src/mcp-tools.json`, the
      CLI help in `crates/cnd-tools/src/help.txt`, and `tools/README.md`.
- [x] Add tests in `crates/cnd-runner/src/engine/_tests_/`: no facts, only
      secrets, only Mac access, both, more than 10 names, and an old command
      with no field.
- [x] Run the Rust checks of `CLAUDE.md`.

## Milestone 4: Worker facts

Depends on: 3

- [x] Add a `readCapabilities` seam to `worker/chat/dependencies.ts`. Read
      the facts of one session from the grant data in `worker/secrets/` and
      from `workspaceMacAccess`. Never read a value or a ciphertext.
- [x] Send the facts with each turn command in
      `worker/chat/runner-command-preparation.ts`.
- [x] Add Worker tests: the field on a turn command, the empty facts, a
      session approval, a value for 15 minutes left out, and no value in the
      field.

## Milestone 5: Runner notice command

Depends on: 3

- [x] Add the `notice` command and the `capabilityNotices` hello flag in
      `crates/cnd-runner-interface/`, and regenerate the TypeScript.
- [x] In the runner and the sdk-helper, give the lines of a `notice` to the
      agent under an app header, as a steer in a running turn, or before
      the message of the turn that it comes with.
- [x] Report which lines the agent took, so that the Worker keeps the rest.
- [x] Add runner and sdk-helper tests for both agents, and for a notice
      that comes after its turn ended.

## Milestone 6: Worker change lines

Depends on: 4, 5

- [x] Add the shared words function in `src/shared/`, with its tests.
      Build it on the words of
      `docs/mockups/src/components/chat/capabilityChangeCopy.ts`, as the
      app reads `secretRunCopy.ts`, so that the chat, the agent, and the
      mockups keep one text.
- [x] Add the `capabilities.changed` note to the shared chat event types
      and the transcript, beside `workspace.continued`.
- [x] Make the writes in `worker/secrets/capabilities-writes.ts` and the
      Remove of a value report what they changed. Compute the difference
      of the facts of each session.
- [x] Keep the waiting lines of each session in the chat Durable Object.
      Send them as a `notice` to a running turn, or before the next turn
      command. Put each line that the runner did not take back in order.
- [x] Gate the `notice` command on the hello flag.
- [x] Return the saved capabilities and log a warning when the Durable
      Object call fails.
- [x] Add Worker tests: a running turn, an idle session and its next turn,
      a session that has not started, an edit with no change, a removal
      that another grant covers, several sessions, a closed session, an
      older runner, a value for this workspace from an answer, and a
      covered request in another session that the same answer settles.

## Milestone 7: App note

Tags: ui

Depends on: 1, 6

- [x] Read the `capabilities.changed` note in `src/chat/api/` and keep it in
      the chat state.
- [x] Show it with the mockup component in the chat of its session, at its
      time. Show it in the session copy and in `read_session` too.
- [x] Add app tests, and check the note in a browser against the mockup.
      Save a screenshot under `.context/capability-prompts/`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

- [ ] Run the targeted tests, `npm run check`, and the Rust checks and the
      Rust release build of `CLAUDE.md`. The targeted tests, the Rust checks,
      and the release build passed on 2026-11-21. On this cloud computer,
      the strict mockup build runs out of memory, and the full test suite
      times out under load, also on `main`. CI must run the complete gate.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
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

- [ ] In the deployed app, create a workspace with a pre-approved secret.
      Check that the agent uses it with no request and no reminder. Then
      pre-approve another secret during a turn, and check the line and the
      steer.
