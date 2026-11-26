# Create PR or Add to merge queue on the first step

Status: Active. On branch `calummoore/pr-creation-or-merge-queue-selection-ifin`, no pull request yet. First step decisions 2, 5, and 6 are open. The pull request that completes the work deletes this plan, as the `plans` skill says.

The pull request bar shows Create PR while a branch has no pull request.
Add to merge queue shows only after a pull request is open, because the
queue needs one for each entry. Cal asked on 26 November 2026 for a split
button on the first step. Its face is Create PR or Add to merge queue,
whichever the member used last. Its menu offers the other one.

Add to merge queue on the first step sends a fixed prompt. The agent opens
the pull request, then calls a new workspace tool that adds the calling
workspace to the merge queue as the member who sent the turn. A first
step decision number is the item number of the brainstorm in this
workspace. The change does not add remove or re-order tools for agents, a pending join in the
Worker, or a queue entry without a pull request.

Contract owners:

- [GitHub banner](../docs/protocol/github-banner.md) and
  [GitHub banner layouts](../docs/protocol/github-banner-layouts.md).
- [Merge queue](../docs/protocol/merge-queue.md) and
  [Merge queue in the app](../docs/protocol/merge-queue-in-the-app.md).
- [Agent tools](../docs/protocol/agent-tools.md),
  [Agent instructions](../docs/protocol/agent-instructions.md), and
  [Command palette actions](../docs/protocol/command-palette-actions.md).
- The [GitHub banner UI README](../src/github/README.md), the
  [Worker tools README](../worker/tools/README.md), the
  [merge queue README](../worker/merge-queue/README.md), and the
  [Rust tools README](../crates/cnd-tools/README.md).

## Terms

- **First step:** the bar state of a branch with no pull request and with
  commits or local work. Today its one action is Create PR.
- **Split button:** one button with a face that runs the main choice and an
  arrow that opens a menu with the other choice.
- **Queue prompt:** the fixed prompt of Add to merge queue on the first
  step.
- **Queue tool:** the new workspace tool `add_to_merge_queue`, and the CLI
  command `conductive merge-queue add`.

## Decisions

[The decisions file](create-pr-or-merge-queue-decisions.md) gives each
first step decision with its date, its options, and its reason. In short:

- First step decision 1 D, chosen: the queue prompt asks the agent to
  open the pull request, then call the queue tool.
- First step decision 2, open: where the app remembers the last choice.
  It blocks Milestone 4.
- First step decision 3 lapsed with option B of decision 1.
- First step decision 4 B, chosen: a tool that adds the calling workspace
  as the sender of the turn.
- First step decision 5, open: where the first step offers Add. It blocks
  Milestones 2 and 5.
- First step decision 6, open: the queuer when the prompt joins another
  member's turn. It blocks Milestone 2.

## Design calls

These are my calls of 26 November 2026, under the decision test.

- The split button shows on the first step only to a member with
  confirmed write access whose workspace can join before its pull request
  exists. Otherwise the bar shows plain Create PR. Reason: a choice that is
  sure to fail helps nobody, as for Add to merge queue today.
- The check before a pull request uses the facts of the current join
  check with the bar's base branch in place of the pull request base: no
  fork, write access, no GitHub merge queue rule, no queue of another org,
  and a base that is the default branch or the branch of a lower open pull
  request whose unit can join. Unknown facts give plain Create PR.
- The face runs its choice. The arrow opens a menu with the other choice.
  A press of that row runs it and makes it the face. Reason: the request
  says that the menu offers the alternative.
- ⇧⌘P stays on Create PR, also when Add is the face. Add to merge queue
  keeps no default key. A press of the key counts as a use.
- The first step check is its own function. Reason: a wider `joinCheck`
  would offer the direct add in the menus, the palette, and the drag on a
  branch without a pull request, and the Worker would refuse it.
- The outline Add to merge queue of an open pull request does not count as
  a use. Reason: it is a separate control, not the first step.
- The default face is Create PR.
- The queue prompt keeps the words of the Create PR prompt, then asks for
  the queue tool. It says what to do when `gh` fails, when no pull request
  opened, and when the queue tool is missing or refuses. Reason: older
  sandbox software has no queue tool, and the member can still use the bar.
- The queue tool takes no input. It adds the calling workspace, at the top
  of the stack, with the same Worker add as the bar. On an upper layer of a
  member stack, it also adds the lower pull requests, as the bar does. The
  tool text says so. Reason: first step decision 4 B
  names the calling workspace.
- The queue tool needs an active calling turn and a current member sender
  with write access. An automation turn uses the member that sent it.
- The bar shows no pending state during the turn. The queue line shows
  when the add lands, as today.
- The narrow bar keeps the face's words, and the branch names cut first.
  On a phone, the split button tops the Checks tab, at least 40 px high.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the split button of the first step in `app/banner`, on desktop and on
a phone.

- [ ] Add `app/banner` variants: the face Create PR, the face Add to merge
      queue, the menu open, and plain Create PR when the workspace cannot
      join.
- [ ] Add the phone top of the Checks tab with the split button under the
      branch and its base.
- [ ] Add the queue prompt as a sent message in `app/banner/sent`.
- [ ] Update `docs/mockups/catalogue-bar.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages, and save
      screenshots in `.context/create-pr-or-merge-queue/`.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the split button, the queue prompt, and the queue tool as
requirements.

- [ ] `docs/protocol/github-banner.md`: the first step row of the actions
      table, the split button, and its change of decision 220.
- [ ] `docs/protocol/merge-queue.md`: replace "agent tools do not add" with
      the queue tool rule of first step decision 4. Keep remove and re-order closed.
- [ ] `docs/protocol/merge-queue-in-the-app.md`: Add to merge queue on the
      first step, the scope of decision 317, and the palette row.
- [ ] `docs/protocol/github-banner-layouts.md`: the narrow bar and the
      phone.
- [ ] `docs/protocol/agent-tools.md` and the linked call page: the queue
      tool, its route, its refusals, and old tools.
- [ ] `docs/protocol/agent-tool-access.md`: the new write call.
- [ ] `docs/protocol/automation-risks.md`: text that steers a run can now
      queue its pull request.
- [ ] `docs/protocol/keyboard-shortcuts-keys.md`: ⇧⌘P runs Create PR also
      when it is a menu row.
- [ ] `docs/protocol/agent-instructions.md`: the tool line names the queue
      add.
- [ ] `docs/protocol/command-palette-actions.md`: the palette row on the
      first step.
- [ ] Read the Terms and Privacy pages in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      `pull-requests.md` and each other sentence that restates a changed
      fact.
- [ ] Delete `plans/follow-ups/merge-queue-agent-tools.md`, because
      first step decision 4 settles it.

## Milestone 3: The queue tool

Depends on: 2

Add the agent call that adds the calling workspace to the merge queue.

- [ ] Worker: a fixed route under `/v1/tools/` that checks the calling
      turn, reads the workspace with the sender's access, and runs the
      queue add of `worker/app-api/merge-queue.ts`. Map each queue refusal
      to its safe code and message.
- [ ] Worker tests: an add as the sender, no calling turn, no write
      access, no open pull request, a fork, and a queued workspace.
- [ ] Rust `crates/cnd-tools/`: the MCP tool `add_to_merge_queue`, the CLI
      command `conductive merge-queue add`, `mcp-tools.json`, the help text,
      and their tests.
- [ ] Shared types: run the generator when a runner interface type
      changes.
- [ ] Update the Worker tools, merge queue, and Rust tools READMEs.

## Milestone 4: The last choice store

Depends on: 2, and first step decision 2

Keep the member's last first step choice where first step decision 2 says.

- [ ] Build the store of the chosen option, with a migration that the
      previous Worker can run beside, when the option needs one.
- [ ] Add the read and the write, and their tests. For C, return the
      choice in the member's capability reply, which is already for each
      member and repository.

## Milestone 5: The split button

Tags: ui

Depends on: 1, 3, 4

Show the split button on the first step and send the queue prompt.

- [ ] `barModel.ts` and `barCopy.ts`: the first step gives both choices,
      the face, and the queue prompt.
- [ ] A split button part, from the pattern of
      `src/chat/device/CommandChoices.tsx`, moved to `src/ui/` when shared.
- [ ] The first step join check, as its own function in
      `src/app/merge-queue-join.ts`. Keep `joinCheck` as it is.
- [ ] The palette row, the key, and the write of the last choice.
- [ ] The phone layout of the Checks tab.
- [ ] Unit and component tests for each state, access, and refusal.
- [ ] Check the bar in a browser on desktop and on a phone. Save
      screenshots in `.context/create-pr-or-merge-queue/`.
- [ ] Update `src/github/README.md` and `src/github/actions.md`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the Rust checks, and the complete gate
      named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan and its decisions file when the `plans` skill
      says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After deploy, press Add to merge queue on a first step in a real
      workspace with updated sandbox software. Check that the pull request
      opens and joins the queue.
