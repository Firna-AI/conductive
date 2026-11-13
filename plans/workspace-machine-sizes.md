# Workspace machine sizes

Status: Active. On branch `calummoore/porto-2i7l`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Every cloud computer has one size today: Boat `default`, with 4 vCPU and
8 GB. Heavy jobs, such as the complete gate of this repository, are slow
on it. This change lets an agent choose a bigger size when it creates a
workspace. The `create_workspace` call gets an optional size: standard,
large, or extra large. The cloud computer keeps that size for its whole
life. The header of the workspace gets a popup on its state, which shows
the size of the cloud computer.

Cal chose the approach in a brainstorm on 13 November 2026: size decision
1 E. Cal chose size decisions 2 A, 3 A, 4 A, and 5 A on the same day, and
proposed the popup on the state in the header. The options check of the
plan added options to each decision, kept each chosen option, and raised
size decision 6, which is open. The brainstorm notes, the options check,
and the saved Boat docs are in `.context/workspace-machine-sizes/`.

This change does not cover a resize of a running workspace, a fork that
runs one command on a bigger machine, or a size choice in the app's create
view.

On the same day, main removed the pricing page, the cloud hours, and
billing (#343), because Cal chose not to release Conductive commercially.
So size decision 2 no longer applies, and the operator pays for every
size.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md#the-provider).
- [Workspace calls](../docs/protocol/workspace-calls.md#create-a-workspace).
- [Life of a workspace](../docs/protocol/workspace-life.md#workspace-states).
- [Orgs and members](../docs/protocol/orgs-and-members.md), which says that use is free.
- The [sandbox README](../worker/sandbox/README.md).
- The [lifecycle README](../worker/lifecycle/README.md).
- The [workspace tools README](../tools/README.md) and [calls](../tools/calls.md).
- The [mockup catalogue](../docs/mockups/catalogue.md), at the new `app/workspace-machine` page.

## Decisions

This plan names its decisions after the change, as size decision 1, as
[Decision numbers](../docs/architecture.md#decision-numbers) says.

### 1. Which way gives heavy jobs more CPU

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `worker/sandbox/boat.ts:138`, `docs/protocol/workspaces-and-sandboxes.md:49`.
- **Terms:**
  - **Fork:** a new Boat sandbox made from the newest snapshot of the disk of another sandbox.
  - **Hydration:** the background download of the files after a Boat fork or resume. The first read of each file waits for it.
- **Background:**
  - Every sandbox is Boat `default`: 4 vCPU and 8 GB, at $0.036 an hour.
  - Boat also has `large` (8 vCPU, $0.072) and `xlarge` (16 vCPU, $0.200). No size is bigger.
  - Boat can create, fork, or resume a sandbox on each size. A running sandbox cannot change size.
  - `SandboxProvider.fork` exists, but no production code calls it.
- **Problem:** Heavy jobs are slow on 4 vCPU. A bigger machine for every hour of every workspace costs 2 to 5.5 times more.
- **Impact if no action:** Agents keep waiting on slow test runs, or depend on CI.
- **Root question:** How does an agent get more CPU for a heavy job without paying for a big machine all the time?
- **Options:**
  - **A.** Make every sandbox `large`. It costs 2 times more for every hour. Effort: Small.
  - **D.** Change nothing. Agents push, and CI runs the heavy tests. Each run waits on a push. Effort: Small.
  - **B.** Add a Resize action that stops the sandbox and resumes it on a new size. It ends the running turn. Effort: Medium.
  - **C.** Add a tool call that runs one command on an `xlarge` fork, then deletes the fork. It pays only for the minutes of the job. A fork of a running sandbox can miss the edits of the last minute, hydration can use up the gain, and each run uses a start of the shared limit. Effort: Large.
  - **E.** Add an optional size to `create_workspace`. The cloud computer keeps the size for its whole life. It pays the bigger rate also while the agent waits for the model, and a running workspace cannot grow. Effort: Medium.
  - **F.** Let the next start of a stopped workspace choose the size, with the size of a Boat resume. A move to a smaller size fails when the files do not fit its disk. A running workspace still cannot grow. Effort: Medium. Added by the options check.
  - **G.** Run one command on a new `xlarge` sandbox from the org image, with the changed files copied in, then delete it. It has no stale edits. An install runs when the branch changed the dependencies, and each run uses a start. Effort: Large. Added by the options check.
- **Left out:**
  - A new empty sandbox for each run, because it installs every dependency at each run and so fails the goal.
  - One builder machine for all workspaces of an org, because decision 4 gives each workspace its own sandbox.
  - A second provider with more than 16 vCPU, because decision 2 keeps Boat as the provider.
- **Wider fix:** None. This is a design choice.
- **Previous examples:** Decision 223 rejected a fork for Continue, because its sessions start new and it needs one more start.
- **Recommendation:** E. It is the smallest change that gives real speed, and it uses only a normal Boat create. The options check kept E, and named F as the natural next step.
- **Chosen:** E, by Cal on 13 November 2026, as Cal proposed.

### 2. How cloud hours count for bigger sizes

- **Chosen:** A, count by size, by Cal on 13 November 2026.
- **Withdrawn:** On the same day, main removed the cloud hours, the
  pricing page, and billing (#343). No count of hours exists, so this
  decision has nothing to apply. The plan keeps its number so that the
  other numbers stay the same. The options check had added option D,
  big sizes counted outside the pool, and kept A.

### 3. Who can choose the size

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/app/new-workspace-model.ts`, `docs/protocol/workspace-calls.md:36`.
- **Background:** Members create workspaces in the app's create view. Agents create them with `create_workspace`.
- **Problem:** If only the call takes a size, a member must ask an agent to create a big workspace.
- **Impact if no action:** The create view and the tool give different choices.
- **Root question:** Where can a person or an agent choose the size of a new workspace? The options check proposed a wider question: how does a new workspace that needs a big machine get one, whichever way it is created? Routine runs and pull request runs also create workspaces.
- **Options:**
  - **A.** Only the `create_workspace` call takes a size. Effort: Small.
  - **B.** The call, and a size choice in the create view, with a mockup first. Effort: Medium.
  - **C.** An admin sets a default size for each repository, or for the org, in the org settings. Every create of that repository uses it, and a call can still name a size. Effort: Medium. Added by the options check.
  - **D.** Give each routine a size, beside its model and effort. It covers only routine runs and pull request runs. Effort: Medium. Added by the options check.
- **Left out:** None.
- **Wider fix:** C, because one default reaches every way to create a workspace.
- **Previous examples:** None found.
- **Recommendation:** A now. The options check kept A, and advised C before B in a later change.
- **Chosen:** A, by Cal on 13 November 2026.

### 4. What happens when a size is not available

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/start-allocation.ts`, `worker/lifecycle/start-machine.ts:81`.
- **Background:** Boat refuses a size that the app's Boat plan does not include. The refusal comes in the start steps, after the create call replied.
- **Problem:** Without a rule, the refusal fails the whole start. A refused create makes no sandbox, and the first message never runs.
- **Impact if no action:** An agent that asks for extra large on a lower Boat plan gets a failed workspace and no work.
- **Root question:** What does a member or an agent get when the chosen size cannot start?
- **Options:**
  - **A.** Start on a smaller size, and say so in the start steps, the header popup, and the workspace reply of the tools. Effort: Small.
  - **B.** Fail the start with an error that names the size. Effort: Small.
  - **C.** Read Boat's allowed sizes, and offer only those in the call. Keep A as a backup. `GET /limits` needs the `account.read` action, which the app's key does not have, so C also needs a new key and a new fixed route. Effort: Medium.
  - **D.** A Worker setting names the largest size on offer, to match the Boat plan. Keep A as a backup. The setting can go out of date after a change of the Boat plan. Effort: Small. Added by the options check. Size decision 6 asks about it.
  - **E.** Move the app's Boat account to the $100 plan or higher before the sizes ship. Keep A for a rare refusal. Only the user can change the Boat plan. Effort: Small. Added by the options check. Size decision 6 asks about it.
- **Left out:** None.
- **Wider fix:** C, because it reads the live sizes of the Boat plan.
- **Previous examples:** None found.
- **Recommendation:** A. The always-on rules say to warn and continue when input can be recovered. The options check kept A, but found that the app's Boat plan is not recorded. On the $20 plan, every extra large create steps down. Size decision 6 asks about that.
- **Chosen:** A, by Cal on 13 November 2026.

### 5. Limit who creates big workspaces

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/workspace-calls.md:36`.
- **Background:** Every member, and every agent that acts for a member, can create workspaces. All orgs share the app's Boat account and its limit on sandboxes at once. Use is free, and the app has no limits of its own on workspaces, hours, or members, as [Orgs and members](../docs/protocol/orgs-and-members.md) says. The operator pays for every size.
- **Problem:** With no limit, any member or agent can create many extra large workspaces.
- **Impact if no action:** Boat costs can grow up to 5.5 times for each workspace.
- **Root question:** Who may run big workspaces? The options check proposed a wider question: how does the app keep the cost of big workspaces in bounds?
- **Options:**
  - **A.** No limit, as for workspaces and hours. Effort: Small.
  - **B.** Only org admins can choose large or extra large. Effort: Small.
  - **C.** An admin sets the largest allowed size for each org. Effort: Medium.
  - **D.** One Worker setting names the largest size on offer for the whole app. It is the same setting as option D of size decision 4. Effort: Small. Added by the options check.
  - **E.** The app keeps a largest size for each org, which the operator sets. Effort: Medium. Added by the options check.
  - **F.** Cap the big workspaces that run at once, for each org or for the app. It is a limit of the app on workspaces, which the free-use rule rejects. Effort: Medium. Added by the options check.
- **Left out:** A shorter idle stop for big sizes, because a running turn keeps the sandbox running, so it fails the goal.
- **Wider fix:** E, because the operator, who pays, holds it. The options check moved the wider fix from C, because an org admin pays nothing.
- **Previous examples:** #343 removed every limit of the app on workspaces, hours, and members.
- **Recommendation:** A. It matches the free-use rule, and the waitlist decides who gets in. The options check kept A. It advised D here too, if size decision 6 takes the Worker setting. The billing reason of the first recommendation was dropped after #343.
- **Chosen:** A, by Cal on 13 November 2026.

### 6. Which sizes can the app's Boat plan start

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `plans/follow-ups/launch-capacity-boat-limits.md`, `worker/lifecycle/start-machine.ts:81`.
- **Background:**
  - Every sandbox of every org runs in the app's one Boat account.
  - Boat's `large` needs a paid plan. `xlarge` needs the $100 plan or higher.
  - The repository does not record the current plan. The records of 5 November 2026 named the $20 plan.
  - The options check of this plan found the gap.
- **Problem:** On a plan below $100, every extra large create gets a refusal from Boat, and size decision 4 steps it down to large.
- **Impact if no action:** The tools offer extra large, but no workspace gets it. Each extra large create also waits for one refused Boat call.
- **Root question:** How does the offer of sizes match what the app's Boat account can start?
- **Options:**
  - **A.** Change nothing. Size decision 4 steps each refused size down. Effort: Small.
  - **B.** Add a Worker setting with the largest size on offer. A create above it starts at that size at once, with the note of size decision 4. The operator changes it with a deploy. Effort: Small.
  - **C.** Move the app's Boat account to the $100 plan or higher before the sizes ship. The operator pays for it. Effort: Small, for the user.
  - **D.** Read the allowed sizes from Boat's `GET /limits`. This needs a new key with `account.read` and a new fixed route. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D, because it follows the live plan.
- **Previous examples:** `plans/follow-ups/launch-capacity-boat-limits.md` asks the user to size the same plan for the launch.
- **Related:** Size decision 4 gives the fallback. B is also option D of size decision 5.
- **Recommendation:** B, and C when the plan is below $100 and the cost is worth it. B keeps every offer true, and also gives the operator one control of the cost.
- **Open:** This decision waits for the user. It blocks no milestone before Milestone 3. The mockups can show extra large.

## Design

### Terms

- **Size:** the machine size that a cloud computer has: `standard`, `large`, or `xlarge` in the code and the calls. The words are standard, large, and extra large.
- **Requested size:** the size that the create call asked for. It differs from the size only after a fallback.

| Size | Boat type | vCPU | Memory | Disk | Boat price per hour |
| - | - | - | - | - | - |
| Standard | `default` | 4 | 8 GB | 51 GB | $0.036 |
| Large | `large` | 8 | 16 GB | 111 GB | $0.072 |
| Extra large | `xlarge` | 16 | 32 GB | 251 GB | $0.200 |

### Mechanics

- `SandboxStart` gets a required `size`. The Boat client maps it to the
  Boat `type`, in the one place that names Boat's types. Org image builds
  and every other create pass `standard`.
- D1 `workspaces` gets `requested_machine_size`, `NOT NULL DEFAULT
  'standard'`, and `machine_size`, which stays null until a sandbox
  starts. A migration sets `machine_size` to standard for each row with a
  sandbox. While `machine_size` is null, the popup and the replies give the
  requested size as starting, with no fallback note.
- `workspace_creation_plans` also gets the requested size, because the
  start job is rebuilt from that table.
- `create_workspace` takes an optional `size`. The Worker checks it
  against the three values. An unknown value is an error of the call, as
  an unknown effort is today. Without a size, the workspace is standard.
- The creation claim keeps the requested size, so a replay with the same
  request ID gives the same workspace and size.
- The start job builds the pinned create request with the requested size.
  An older pinned request without a size reads as standard.
- When Boat refuses the size, the start steps down one size at a time:
  extra large, then large, then standard. Each step replaces the pinned
  create request with a new one, with a new idempotency key that names the
  size. It replaces the pin before any replay can send the refused
  request again. The replays are in `start-failure.ts`,
  `start-allocation-cleanup.ts`, and `archive-state.ts`.
- A refusal creates no sandbox. So the step also closes the open
  allocation that `allocateWorkspace` records for a pinned request in the
  computer ledger. A refusal of standard fails the start as today.
- Only the size refusal codes step down, not every `403`. Boat also
  answers `403 org_suspended`.
- The Worker writes the size of the sandbox that started into
  `machine_size`. A start step tells the chat when the size is smaller
  than the requested size.
- Stop, resume, disk retention, Continue, and Restore keep the sandbox,
  so they keep its size. They pass no size to Boat.
- Browser creates, routine runs, and pull request runs create standard
  workspaces.

### Design calls

All calls are mine, on 13 November 2026.

- The words are standard, large, and extra large, and the call values are
  `standard`, `large`, and `xlarge`. The Worker maps them to Boat's
  types. Reason: user-facing text must not name Boat, and Boat's word
  `default` says nothing to a user. `xlarge` matches the effort value
  `xhigh` of the same calls, as the options check advised.
- Small, Boat's 2 vCPU size, is not offered. Reason: the goal is more CPU.
- A refusal steps down one size at a time, not straight to standard.
  Reason: a paid Boat plan below $100 allows large but not extra large.
- Only a size refusal steps down. `out_of_capacity` keeps the retries of
  today, which end after 10 minutes. Reason: it passes in minutes, and the
  agent asked for the bigger machine. `no_ready_machine` cannot happen,
  because the Worker sends no `failFast`.
- The workspace keeps both the requested size and the size. Reason: the
  popup and the tools can then say that a smaller size started.
- `get_workspace` and `list_workspaces` give `size` and `requestedSize`.
  Reason: an agent can check the size it got.
- The description of `size` in the MCP tool and the CLI help says to
  choose a bigger size only for heavy builds and tests, and that a bigger
  size costs the operator more. Reason: the agent chooses the size, so it
  must see the cost.
- The popup opens from the state of the workspace header, as Cal proposed.
  It shows the size with its vCPU, memory, and disk. It also shows the
  requested size when it differs. It shows no price, because use is free. A phone shows it
  as a sheet, as the owner picker of the header does.
- The popup shows the size of each workspace, also of a standard one.
  Reason: a member can then see what every cloud computer has.
- The browser read of a workspace gives `size` and `requestedSize`, as the
  tools do.

### Open questions for the implementation

- Boat documents `403 trial_machine_class_not_allowed` for a size that the
  free trial refuses. Boat does not document the code for `xlarge` below
  the $100 plan. Milestone 3 confirms it with `GET /limits` and one create
  on the app's account, or with Boat support. Until then, the step-down
  rule treats only `trial_machine_class_not_allowed` and the confirmed
  code as a refusal.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The header of the workspace screen gets the popup on its state.

- [ ] Make the state of `WorkspaceHeader` in
      `docs/mockups/src/components/workspace/` a button that opens the
      machine popup on desktop, and a sheet on a phone.
- [ ] Add the popup content: the size, its vCPU, memory, and disk, its
      and the note when the requested size differs.
- [ ] Add a catalogue page, `app/workspace-machine`, with these states: standard and ready,
      extra large and working, a stopped workspace, and the fallback note
      from extra large to large. Give each on desktop and on a phone.
- [ ] Update `docs/mockups/catalogue.md` for the new states.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the sizes, the call, the fallback, and the popup.

- [ ] Update `docs/protocol/workspaces-and-sandboxes.md`: the three
      sizes, size decision 1, standard as the default, the size kept for
      the life of the sandbox, the step-down rule of size decision 4, and
      size decision 5.
- [ ] Update `docs/protocol/workspace-calls.md`: the optional size of a
      create call, size decision 3, and `size` and `requestedSize` in the
      replies of the get and list calls.
- [ ] Update `docs/protocol/workspace-life.md`: the popup on the state of
      the header, and the start step that names a smaller size.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates the one size.
- [ ] Update `worker/sandbox/README.md`, `worker/lifecycle/README.md`,
      `tools/README.md`, and `tools/calls.md`.

## Milestone 3: Sizes in the provider and the start

Depends on: 2

The Worker creates each sandbox on its size, keeps the size in D1, and
steps down on a refusal.

- [ ] Confirm the Boat code of a size refusal, as "Open questions for the
      implementation" says. Record the answer in this plan.
- [ ] Add `size` to `SandboxStart`, and map it to the Boat type in
      `worker/sandbox/boat.ts` for create and fork. Pass `standard` from
      the image builds and every other create.
- [ ] Add a migration with `requested_machine_size` and `machine_size` on
      `workspaces`, and the requested size on `workspace_creation_plans`.
- [ ] Carry the requested size through `createWorkspace`, the creation
      claim, and the pinned create request. Read an older pinned request
      as standard.
- [ ] Add the step-down rule to the allocation, with a new pinned request
      and idempotency key for each size. Replace the pin before each
      replay path can send it, and close the open allocation of the
      refused request. Write `machine_size`, and add the start step that
      names a smaller size.
- [ ] Apply the answer of size decision 6. With its option B, add the
      Worker setting with the largest size on offer.
- [ ] Add tests with `FakeBoat`: each size reaches Boat, a refusal steps
      down to the next size, `org_suspended` does not step down, a refusal
      of standard fails as today, a replay after a step-down sends the new
      request, a replay keeps the size, and a resume sends no size.

## Milestone 4: Size in the workspace calls

Depends on: 3

The agent can choose and read the size.

- [ ] Add the optional `size` to `AgentCreateWorkspaceRequest`, the MCP
      schema in `tools/workspace-mcp-tools.ts`, and the CLI in
      `tools/workspace-cli.ts`, with the description of the design calls.
- [ ] Check the value in `worker/tools/create.ts`, and pass it to
      `createWorkspace`.
- [ ] Give `size` and `requestedSize` in the get and list replies of the
      tools and in the browser read of a workspace.
- [ ] Add tests for the MCP tool, the CLI, the handler, and the replies.
      A call without a size still makes a standard workspace.

## Milestone 5: The machine popup in the app

Tags: ui

Depends on: 1, 4

The header of the app shows the popup of the mockup.

- [ ] Make the state of `src/shell/workspace/WorkspaceHeader.tsx` open
      the machine popup, and a sheet on a phone, as the mockup shows.
- [ ] Add DOM tests for each state of the mockup, and for keyboard and
      screen reader access.
- [ ] Compare the app with the mockup in a browser, on desktop and on a
      phone width.

## Milestone 6: Public pages

Depends on: 2

The comparison page and the guides tell visitors and members about the sizes.

- [ ] Update the note of the `base-image` row in
      `src/marketing/from-conductor/areas/cloud.ts`, which gives the one
      size. Keep its status.
- [ ] Read each guide in `src/marketing/docs/` in full. Update each
      sentence that restates the one size, the header, or the create
      call. `workspaces.md` describes the header.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] On the test deployment, create one extra large workspace with an
      agent, and compare the time of `npm run check` with a standard one.
