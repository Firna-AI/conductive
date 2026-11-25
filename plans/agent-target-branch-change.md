# Agent target branch change

Status: Active. On branch `calummoore/change-base-branch-e2ho`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace stores one target branch. Changes, the diffs, the pull
request bar, Create PR, and `gh` use it. Today only Continue, a repository
change, and the automatic moves of a deleted or renamed base change it. An
agent cannot change it, and a new base of the pull request on GitHub is not
followed. This change adds the workspace tool call `retarget_workspace`,
and makes the target follow the base of the open pull request. It builds
the target work of the paused plan: its Milestones 5 and 6, and its
decision 218.

The change adds no control in the app, and the call does not merge or
rebase the branch. Cal got the questions below on 24 November 2026, and
answered decisions 1 to 4 on 25 November 2026. Decisions 5 and 6 are
open. Decision 5 blocks only Milestones 1, 7, and 8. Decision 6 blocks only
the outage rule in Milestones 2 and 5.

Contract owners:

- [Base branches](../docs/protocol/base-branches.md) and [GitHub tokens](../docs/protocol/github-tokens.md).
- [Workspace management](../docs/protocol/workspace-management.md), [Workspace calls](../docs/protocol/workspace-calls.md), [Agent tools](../docs/protocol/agent-tools.md), and [Agent tool access](../docs/protocol/agent-tool-access.md).
- [The workspace token](../docs/protocol/tokens-and-secrets.md#the-workspace-token) and [Isolation](../docs/protocol/isolation.md).
- [Agent instructions](../docs/protocol/agent-instructions.md) and [Session instructions](../docs/protocol/session-instructions.md).
- [What the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows), for decision 5.
- The [Moved bases](../worker/lifecycle/moved-bases.md) guide, the [GitHub README](../worker/github/README.md), the [agent tools README](../worker/tools/README.md), and the [cnd-tools README](../crates/cnd-tools/README.md).
- The [Terms](../src/marketing/terms.ts) and [Privacy](../src/marketing/privacy.ts) pages, and the guides in `src/marketing/docs/`.

## Terms

- **Target:** the base branch of a workspace, as [Base branches](../docs/protocol/base-branches.md) defines it.
- **The call:** the new write of the workspace tools that changes the target.
- **Record:** the row of the workspace in D1. It stores the target in `workspaces.base_branch`, as null for the default branch.
- **Follow rule:** while the workspace branch has an open pull request, the target is the base of that pull request on GitHub.
- **Saved move:** the one saved retry job of a workspace, `baseChange:job`. It fetches a new target into the cloud computer, then targets it (decisions 307 and 308).
- **Sender:** the member whose message started the calling turn.
- **Paused plan:** `plans/start-from-github.md` on `origin/calummoore/new-chat-start-from-brainstorm`, last changed on 10 November 2026. Its numbers 213 to 220 clash with `main`, so this plan cites them as "decision 216 of the paused plan".

## Decisions

The decisions of this change carry the short name retarget, as
[Decision numbers](../docs/architecture.md#decision-numbers) says for a
later change. Their numbers are those of the questions of 24 November 2026.
Each protocol doc that cites one defines the name. The brainstorm notes are
in `.context/base-branch-change/`.

### Retarget decision 1: how an agent changes the target

Chosen by Cal on 25 November 2026: C, both ways. The call sets the target.
While the workspace branch has an open pull request, its base on GitHub
leads under the follow rule.

- Rejected: A, the follow rule only, where the agent runs `gh pr edit --base`. It gives no way to change the target before a pull request opens.
- Rejected: B, the call only. A later new base on GitHub is then not followed: an edit by the agent or a member, or GitHub's own retarget of a stack.
- Reason: only C keeps the bar, Changes, and the cloud computer on the real target in every case.
- It changes decisions 301 and 304 on 25 November 2026. Both left a target that follows the pull request out for now. Decision 304 now moves a deleted target only while no pull request is open. The target choice of New workspace stays.
- It matches decision 216 D of the paused plan, "follow the live base", and its agent tool, chosen on 10 November 2026.

### Retarget decision 2: a call while a pull request is open

Chosen by Cal on 25 November 2026: C. The Worker changes the base of the
open pull request on GitHub with the GitHub token of the sender, as Merge
does. The stored target then follows.

- Rejected: A, the call changes nothing and tells the agent to run `gh pr edit --base`.
- Rejected: B, the CLI runs `gh pr edit --base` in the cloud computer, and the workspace follows the webhook.
- Rejected: D, no Worker route. The cloud computer sets a Git setting or runs `gh pr edit`, and the runner reports it.
- Reason: one call works in every state. The Worker already writes to GitHub as the member for Merge and Ready for review. Decision 218 of the paused plan recommended B before these writes existed.

### Retarget decision 3: who may change the target

Chosen by Cal on 25 November 2026: A, every member of the org, as for
Continue (decision 224) and a rename.

- Rejected: B, only the workspace owner and the admins, as for Archive (decision 42).
- Reason: the change deletes no work, and a later call undoes it. GitHub still checks the rights of the sender at each write on GitHub.

### Retarget decision 4: the refusals of the call

Chosen by Cal on 25 November 2026: A, copy the existing refusals.

- A branch that GitHub does not have gets the branch check of a create (decision 303). It gives HTTP 404 `branch_not_found`, HTTP 400 `invalid_input`, or HTTP 403 `github_access_required`.
- An archived workspace gets HTTP 409 `workspace_archived`.
- A running Continue, repository change, or Restart gets HTTP 409 `workspace_continuing`, `workspace_repository_changing`, or `workspace_restarting`.
- Rejected: B, refuse only a missing branch, and queue the call after a running Continue or repository change.
- Reason: Continue, a repository change, and Restart already refuse each other. A queue needs a saved request and a reply that waits.

### Retarget decision 5: what members see when the target changes

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/continue-publication.ts` and `src/ui/components/chat/ContinuedLine.tsx`, the note of Continue.
- **Background:** After Continue and after a repository change, each session shows one note at its place. The note names the member and the new branch, and it reaches no agent. After the move of a deleted target, a message under the bar says that the base moved, until a pull request opens. Decisions 1 and 2 add two sources of a new target: the call, and the base of the open pull request on GitHub.
- **Problem:** No rule says what members see when the call or the follow rule changes the target.
- **Impact if no action:** Only the name in the bar changes. A member in another session does not learn why Changes and Create PR use another branch.
- **Root question:** How do members learn that the target of a workspace changed, and what changed it?
- **Options:**
  - **A.** Nothing new. The bar names the new target, and the branch line tells each agent. Cost: members get no word on the change or its source. Effort: Small.
  - **B.** A note in each session for each change, as after Continue. A note of a call names the sender and the session of the agent, as a wake line does. A note of a change on GitHub names the pull request. Both name the new target. The note comes when the record changes. Cost: a chat event, a note, a mockup, and the Terms text on notes. At the deploy, each workspace that follows its pull request gets one note. Effort: Medium.
  - **C.** As B for a call. A change on GitHub shows a message under the bar, as a moved base does. Cost: that message shows only while no pull request is open, so it needs a new rule for when it hides. Effort: Medium.
  - **D.** As B for a call only. A change on GitHub shows nothing new. Cost: GitHub's own retarget of a stack changes Changes with no word in the app. An agent's own `gh pr edit --base` also shows nothing. Effort: Medium.
  - **E.** A message under the bar for each new target from a call or from GitHub, as for a moved base. It names the new target and its source. The stored GitHub state keeps the source, so a repeated read cannot show it twice. Cost: the chat keeps no record of the change, the message needs a rule for when it hides, and `github-banner.md` needs a split. Effort: Medium.
  - **F.** As B, and the move of a deleted base also adds the note, beside its message under the bar. Each new target except a renamed default then gets the same note. Cost: two messages for one move, and a change to what decision 304 shows. Effort: Medium.
- **Left out:** A toast, because a reload loses it and an automation run has no open tab. A note only in the session of the call, because the members of other sessions then miss the change. A line at the top of Changes, because a member can press Create PR without opening Changes. A macOS notification, because a member in a browser gets none.
- **Wider fix:** B. One note with a source field covers each new source of a target, so a later source adds no new surface. F applies it also to the move of a deleted base.
- **Previous examples:** The notes of Continue and of a repository change in [What the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows). The message of a moved base in [Banner states](../docs/protocol/github-banner.md#banner-states).
- **Recommendation:** B. Members in every session learn of each new target and its source where Continue already reports a new branch. It needs no rule for when it hides. The record of 24 November 2026 also left open a message under the bar for a change on GitHub, and option C holds that question. The options check of 25 November 2026 added E and F and kept B.
- **Action:** ask the user, because the options change what members see, and no rule picks the session note or the bar message.

This decision blocks Milestones 1, 7, and 8. The other milestones do not wait for it.

### Retarget decision 6: a call when GitHub cannot answer

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/github/transport.ts`, which maps each failed GitHub request to HTTP 502 `github_unavailable`, and the branch check in `create-branches.ts`.
- **Background:** The call reads GitHub three times: the branch check, the read of an open pull request, and the write of decision 2. A create goes on when its branch check cannot reach GitHub. Continue, Merge, and Ready for review fail with `github_unavailable` and change nothing. A scheduled GitHub read tries again 30 seconds after that failure, in `worker/features/github.ts:256-267`.
- **Problem:** Decision 4 lists no refusal for a GitHub outage, and the rules ask the user before each new refusal.
- **Impact if no action:** The call has no rule for an outage of GitHub.
- **Root question:** What does a target change do, and what does its reply say, when GitHub does not answer a read or the write that the change needs?
- **Options:**
  - **A.** Refuse with HTTP 502 `github_unavailable` and change nothing, as Continue, Merge, and Ready for review do. The agent can try again. Effort: Small.
  - **B.** Store the target and save the move without a write on GitHub. Cost: when a pull request is open, the follow rule later leads the target back. This breaks decision 2. Effort: Small.
  - **C.** Use the GitHub state of the last read. When it shows no open pull request, go on as a create does, with a `notice` that GitHub did not answer. Otherwise fail as in A. Cost: a pull request that opened after the last read leads the target back. A branch that GitHub does not have then moves to the default branch. Effort: Small.
  - **D.** Save the call and finish it when GitHub answers, with the sender's token. Cost: a write on GitHub as the sender after the turn ends, and a reply that cannot say what changed. Effort: Large.
- **Left out:** None.
- **Wider fix:** None. The shared transport already maps each failed GitHub request to one failure.
- **Previous examples:** Continue in `worker/lifecycle/continue.ts:183` and `continue-base.ts:16`. Merge in `worker/github/merges.md`.
- **Recommendation:** A. The other actions that write on GitHub already fail in this way, and B and C can report a change that a pull request undoes. The brainstorm notes of 24 November 2026 said that the call goes on, so A reverses a sentence that Cal read.
- **Action:** ask the user, because A adds a new refusal, and the rules keep that choice for the user.

This decision blocks only the outage TODO of Milestone 5 and its sentence in Milestone 2.

## Design calls

The agent's calls, made on 24 November 2026 with the questions:

- The call reaches each workspace of the org, as the other tool calls do (decisions 257 and 277).
- A new target that is the default branch is stored as null, so it follows a later rename (decision 312).
- The fetch of the new target uses the saved move with the owner's GitHub token, as each saved move does (decision 307).
- A new target replaces an unfinished saved move (decision 308).
- The call does not merge or rebase the branch, because Merge latest exists (decision 220).
- Agents learn the change through the branch line (decision 227). No runner change.
- No member control in the app for now, because Cal named the agent.
- The change is additive: one new route and no migration. Older runners and Mac apps keep working. The previous Worker handles a saved move with an explicit target safely.
- A call with the current target changes nothing.

My calls, made on 25 November 2026:

- Names: `retarget_workspace`, `conductive workspaces retarget --base-branch BRANCH [--workspace ID]`, and `POST /v1/tools/workspaces/{workspaceId}/retarget` with `baseBranch`. Reason: decision 278 gives a verb and a noun. Each workspace write uses one verb for the tool, the command, and the route. GitHub calls a new base of a pull request a retarget. The create call names the same branch `baseBranch`.
- The reply is `AgentWorkspaceResponse`, with the stored target in `baseBranch`. After a write on GitHub, its `notice` names the pull request and its new base. Reason: the other workspace writes give this reply, and older tools accept it.
- The order is the refusals, the GitHub reads, the write on GitHub, the record, then the saved move. A refused write on GitHub changes nothing. Reason: no partial change.
- GitHub can apply a write and then lose its reply. The call then fails, but the base of the pull request changed. The follow rule takes the new base at the next GitHub read. Reason: GitHub then holds the base that the call asked for.
- The branch check and the read of an open pull request use the GitHub token of the sender, as the write does. A sender who must sign in to GitHub again gets HTTP 401 `github_reconnect_required`, as for Merge. Reason: the call acts for the sender.
- Decision 6 gives the rule when GitHub cannot answer.
- When the record write fails after the write on GitHub, the reply gives the failure. The follow rule then repairs the record at the next GitHub read, which the webhook of the edit starts.
- The write on GitHub needs GitHub write access, as Merge and Ready for review do. GitHub refusals get HTTP 403 `github_retarget_forbidden` or HTTP 409 `github_retarget_refused`, as for Ready for review. No GitHub error text reaches the agent.
- The call and the GitHub reads of a workspace change its target one at a time. Reason: a read must not follow a pull request halfway through a call.
- The follow rule counts a draft as open. It compares the base with the stored target, and a null target with the live default branch of the same read. It stores a base on the default branch as null.
- The call takes any branch that GitHub has, also the workspace branch itself. Reason: decision 4 A adds no other refusal, and a create takes any pair of branches.
- The help and the tool description say that the cloud computer targets the new branch after its fetch. Until then, `gh pr create` needs `--base`. Reason: a pull request into the earlier branch would lead the target back.
- New sessions name the call in the tool list of their agent instructions. Reason: that list names each workspace call. This narrows the call of 24 November 2026 on no runner change to how agents learn a new target.
- No mockup work outside decision 5. Reason: the bar already names any target, and the call shows as a tool line in the chat.
- Compatibility: an explicit target uses the one saved move and its alarm, with one new optional field. Its `change.from` names the earlier target. The Worker writes the record first, and saves the move only after that write succeeds. Reason: the previous Worker then finds a record that does not name the start of the move. So it drops the move and writes nothing. It runs a move to the default branch as its own move, with the same result. A second job key was rejected, because two saved moves could then wait in one workspace after a rollback.
- During a deploy, the previous Worker answers the route with HTTP 404, and its workspace objects lack the new method. Nothing changes, and the agent can try again.
- No runner message changes, and the schema stays, as [Keep the previous Worker working](../migrations/README.md#keep-the-previous-worker-working) asks. An older `conductive` lacks the call until its update.

## Interactions with other changes of the target

- A deleted target (decision 304): the move to the default branch happens only while no pull request is open. With an open pull request, the read follows its base, also after GitHub retargets a stack.
- A renamed default branch (decision 310): a null target stays null, because the read compares with its live default branch. The move of decision 310 moves the cloud computer.
- Continue (decision 300): Continue still takes the branch that the pull request merged into. This also replaces a target that a call set after the merge.
- A repository change still stores the new default as null. The call refuses while it runs.
- A merged or closed pull request does not count. The stored target stays until a call, Continue, or a move of decision 304.
- A base that a member changes on GitHub, and GitHub's own retarget of a stack: the next GitHub read follows. A `pull_request` webhook of the branch, such as `edited`, starts that read.
- At the deploy, each live workspace whose open pull request targets another branch follows at its next GitHub read.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Waits for decision 5. Under option A, this milestone has no work. The
TODOs are for option B, the recommendation. Change them to the chosen
option when Cal answers. Only Milestones 7 and 8 depend on this milestone.

- [ ] Add a child page under `app/banner`, beside `app/banner/continued`, for the note of a new target. Draw a note of a call and a note of a change on GitHub. Draw desktop and phone.
- [ ] Under option C, draw the message under the bar beside the `base-moved` variant of `app/new-workspace/start-branch/stacked`.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: none

State the requirements and the decisions in force for decisions 1 to 4
and the design calls. Milestone 7 states decision 5. This milestone does
not wait for the mockups, because they show only decision 5.

- [x] In `docs/protocol/base-branches.md`, define the retarget decision number. State the call and the follow rule of decision 1, with their rejected ways.
- [x] In the same doc, remove the sentence that left the follow rule out. Limit decision 304 to a branch with no open pull request.
- [x] In the same doc, state that each saved move fetches its new target first, and that a new target replaces an unfinished move.
- [x] In `docs/protocol/workspace-management.md`, add "Change the target branch". Give the call, the write of decision 2, the refusals of decision 4, the reply, and the rights of decision 3.
- [ ] In the same section, state the rule of decision 6 when GitHub cannot answer. Waits for decision 6.
- [x] Add the call to the table of `docs/protocol/workspace-calls.md`, with a section that links to it.
- [x] In `docs/protocol/agent-tools.md`, count 28 Worker calls and 10 workspace calls. Say that the call can change a pull request on GitHub.
- [x] State the rights of decision 3 in `agent-tool-access.md`. Add the call to the writes in `tokens-and-secrets.md`, and its risk to `isolation.md`.
- [x] In `docs/protocol/github-tokens.md`, add the write of the call beside Merge. State the owner's token for each saved move, with the reason of decision 307.
- [x] Add the call and the follow rule to the causes of a new target in `session-instructions.md`. Add the call to the tool list in `agent-instructions.md`.
- [x] Split each changed protocol doc that passes about 250 lines, and update each link to a moved heading. Today `agent-tools.md`, `github-tokens.md`, `isolation.md`, `agent-instructions.md`, and `tokens-and-secrets.md` pass it.
- [x] Update the Worker writes to GitHub in `docs/architecture/components.md`, the flows in `docs/architecture/flows.md`, and the doc lists in `docs/architecture/`.
- [x] Read the Terms and Privacy pages in full, with their parts. Update each sentence that restates a changed fact.
  - Examples: the tool writes in `terms-org.ts` and `privacy-recipients.ts`. The GitHub tokens in `terms-org.ts` and `privacy-uses.ts`. The moved base in `terms-work.ts`.
- [x] Set the effective date of each changed legal page to the date of the change. A Terms change gives a new `TERMS_VERSION`.
- [x] Read each guide in `src/marketing/docs/` in full, as [Website docs](../docs/protocol/website-docs.md) says. Update each sentence that restates a changed fact.
  - Examples: `pull-requests.md`, `files-and-changes.md`, `workspaces.md`, `security.md`, and `cloud-computer.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: A saved move to an explicit target

Depends on: 2

The saved move today can only move a workspace to its default branch. This
milestone adds an explicit target. No caller uses it yet.

- [ ] Give the saved move in `worker/lifecycle/base-change-job.ts` one optional field for an explicit target. Such a move writes no repository record.
- [ ] Keep the fetch with the owner's token, the isolated stage, the retry, and the resume for that kind.
- [ ] Add one record write of a new target, guarded by the earlier stored value. Store the default branch as null.
- [ ] Save the move only after that write succeeds. End the move when the record no longer names its target.
- [ ] Let a new move replace an unfinished move. A replaced move of a renamed default ends as a change of the record ends it today.
- [ ] Test beside `worker/features/base-moved.test.ts` and `worker/lifecycle/repository-default-race.test.ts`:
  - the fetch and the install of an explicit target, a retry, a resume, and a hibernation
  - a replaced move of a deleted base and of a renamed default, with its delivery receipts
  - a target that the record no longer names
- [ ] Test the previous Worker. A saved move of the new kind, read without its new field, writes no repository default and no target. A move to the default branch still completes.
- [ ] Update `worker/lifecycle/moved-bases.md` and `worker/lifecycle/README.md`.

## Milestone 4: The target follows the open pull request

Depends on: 3

- [ ] In the GitHub read in `worker/github/client.ts` and `refresh.ts`, take the base of an open pull request as the target.
- [ ] When that base differs from the target, write the record and save the move of Milestone 3, as the design calls say.
- [ ] While a pull request is open, make no move of decision 304. A merged or closed pull request keeps the stored target.
- [ ] Test with the fake GitHub server, beside `worker/github/base-moved.test.ts` and `webhook.test.ts`:
  - a `pull_request` `edited` webhook with a new base, and a draft
  - GitHub's retarget of a stack after it deletes the lower branch
  - a base on the default branch, and a renamed default branch
  - a merged and a closed pull request
  - an open pull request whose base differs at the first read after the deploy
- [ ] Update `worker/github/README.md`. Split it, because it passes 300 lines.

## Milestone 5: The call in the Worker

Depends on: 4

- [ ] Add `AgentRetargetWorkspaceRequest`, with `baseBranch`, to `crates/cnd-runner-interface/src/tools/workspaces.rs` and `examples/export_bindings.rs`.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings` and the Rust checks of `CLAUDE.md`. Commit the new files in `src/shared/generated/`.
- [ ] Add the `retarget` path to `src/shared/agent-workspaces.ts` and to the routes of `worker/tools/workspace-routes.ts`. Keep the turn and member checks of each write.
- [ ] Add a `retargetWorkspace` method to the workspace object. Call it as `workspace-write-composition.ts` calls Archive.
- [ ] In that method, apply the refusals of decision 4. Check the branch with the sender's token, as `create-branches.ts` does. Unlike a create, do not go on after `github_unavailable` or `github_reconnect_required`.
- [ ] With an open pull request, check the write access of the sender. Change the base as `worker/github/ready.ts` marks a draft ready.
- [ ] Then write the record, save the move, and refresh the GitHub state. Run the method in the queue of the GitHub reads.
- [ ] Reply with `AgentWorkspaceResponse` and the notice of the design calls.
- [ ] Add a change of the base to the fake GitHub server in `worker/github/fake-repository.ts`.
- [ ] Test beside `worker/tools/workspace-actions.test.ts` and `handler.management.test.ts`:
  - each refusal, a workspace of another org, and a sender without GitHub write access
  - a call with and without an open pull request, and the current target
  - the default branch stored as null
  - a refused write on GitHub, which changes nothing
  - a write whose reply is lost, which the follow rule then follows
- [ ] Apply the rule of decision 6 when GitHub cannot answer, and test it. Waits for decision 6.
- [ ] Update `worker/tools/README.md` and `worker/tools/workspaces.md`.

## Milestone 6: The call in the tools and the agent instructions

Depends on: 5

- [ ] Add the call to `crates/cnd-tools`: `call.rs`, `request.rs`, `cli_parse.rs`, `input/parse.rs`, `reply.rs`, `src/mcp-tools.json`, and `src/help.txt`.
- [ ] Write its description and help as the design calls say: the target, the write on GitHub, the active turn, the reach, and `--base`.
- [ ] Name `retarget_workspace` in the tool list of `crates/cnd-runner/src/engine/instructions.rs`.
- [ ] Test the CLI and MCP adapters as `move_workspace_tests.rs` and `mcp_tests.rs` do, with 33 tools. Test the instructions in `instructions_tests.rs`.
- [ ] Run the Rust checks of `CLAUDE.md`. Run the generator, and check that `src/shared/generated/` has no diff.
- [ ] Update the call counts and lists in `crates/cnd-tools/README.md`, `tools/calls.md`, `tools/README.md`, and `runner/agent-tools.md`. Split `tools/calls.md`, which passes 300 lines.

## Milestone 7: The note of a new target

Depends on: 1, 5

Waits for decision 5. Under option A, this milestone has no work. The
TODOs are for option B.

- [ ] Add a chat event for the note, as `workspace.continued` in `src/shared/chat-events.ts`. Emit it in each session for each change that the option covers.
- [ ] Commit the note of a change on GitHub in the same write as the GitHub state. Reason: the repeated copy to D1 in `worker/github/refresh.ts` must not lose or repeat a note.
- [ ] Mask secret values in the branch names of the note, as `worker/chat/workspace-event-labels.ts` does. Add the note to the session copy in `src/shared/transcript/session-events.ts`.
- [ ] Check that a tab of the previous app ignores the new event.
- [ ] State the note and the decision in [What the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows).
- [ ] Under option C, state the message in `github-banner.md`, and split that doc, which passes 300 lines.
- [ ] Update the Terms sentence on the notes in the chat history, the Privacy page, and the guides. Set the effective dates.
- [ ] Test the event after a call and after a change on GitHub.

## Milestone 8: The note in the chat

Tags: ui

Depends on: 1, 7

- [ ] Show the note in the chat as the mockup shows, beside `src/ui/components/chat/ContinuedLine.tsx`.
- [ ] Test the note. Compare it with its mockup on desktop and on a phone.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test the call from a workspace on the development page, with and without an open pull request. Save the result in `.context/agent-target-branch-change/`.
- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`. Run the Rust checks.
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
  - It says that no change breaks stored data, the Worker API, or the runner messages.
  - It says that this change builds Milestones 5 and 6 and decision 218 of the paused plan.

## Post-merge follow-up (non-blocking)

- [ ] On the deployment, change the target of a test workspace with and without an open pull request. Check the bar, Changes, and the pull request on GitHub.
- [ ] Change the base of a test pull request on GitHub. Check that the bar and Changes follow.
