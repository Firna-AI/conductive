# Say when to nest a workspace

Status: Active. On branch `calummoore/when-nested-workspaces-used-96i7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An agent can create a sub-workspace: a workspace nested under a parent
workspace, with its own cloud computer, branch, sessions, and pull
request. Only agents nest workspaces, through `parentId` of
`create_workspace` or `--parent` of `conductive workspaces create`. The
agent instructions, the tool text, and the public guide say how to nest a
workspace. They do not say when to nest one. The only hint is "Agents
usually pass their own workspace ID", and the guide sentence "for a task
that needs its own files and branch", which every workspace meets.

This change adds the same short list of cases to the agent instructions
of each new session, to the create text of the MCP tools and the CLI
help, to the tools doc, and to the public guide. It changes no API, no
stored data, and no runner message. It does not add a way to nest a
workspace in the app.

Contract owners:

- [Sub-workspaces](../docs/protocol/sub-workspaces.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Workspace calls](../docs/protocol/workspace-calls.md).
- The [runner README](../crates/cnd-runner/README.md).
- The [workspace tools README](../crates/cnd-tools/README.md) and
  [Workspace tool calls](../tools/calls.md).
- The public guide [Workspaces](../src/marketing/docs/workspaces.md).

## Decisions

### 1. When an agent nests a new workspace

Answered by the user on 17 November 2026.

- **Root question:** How does an agent know when to put a new workspace
  under the current one, and when to make a top-level workspace?
- **Choice:** The instructions, the tool text, and the guide give a list
  of cases. An agent nests a new workspace under the current workspace
  when the work belongs to the current task:
  - A part of a large task that can run in parallel.
  - Follow-up work that the current task starts.
  - Work in another repository for the same task.
  - Any change that needs its own pull request.
  - An agent makes a top-level workspace for unrelated work.
- The agent first proposed the places and three of the cases. The user
  agreed and added the cases for other repositories and for a separate
  pull request.

## Design calls

- My call, 17 November 2026: a member's explicit choice of a place wins
  over the list. Reason: the list is guidance, and a member can ask for a
  top-level workspace or a given parent.
- My call, 17 November 2026: the instructions also say that a workspace
  has one branch, so each separate pull request needs its own workspace.
  Reason: this fact makes the pull request case clear, and the
  instructions already state it in their first line.
- My call, 17 November 2026: the instructions and the tool text give the
  same cases in the same words. Reason: the agent reads the instructions
  when it splits work, and the tool text when it calls create. One wording
  keeps them from drifting.
- My call, 17 November 2026: keep "Agents usually pass their own
  workspace ID" in the `parentId` text. Reason: it agrees with the list,
  because related work nests under the calling workspace.
- My call, 17 November 2026: the instructions give the cases only when
  they give the other sub-workspace guidance, so not for an older or
  manual runner start without the workspace depth. Reason: such a start
  already leaves out all sub-workspace guidance.
- My call, 17 November 2026: saved sessions keep their pinned
  instructions. Only new sessions get the cases. Reason: the runner pins
  the instructions of a session for its life, so no migration is needed.

## Milestone 1: Documentation and protocol

Depends on: none

State the cases as a requirement of the agent instructions and the tool
text.

- [x] Add a section "When to nest" to `docs/protocol/sub-workspaces.md`
      with the cases, the member's choice, and the decision record.
- [x] Add the cases to the guidance list of
      `docs/protocol/agent-instructions.md`.
- [x] Say in `docs/protocol/workspace-calls.md` that the create text gives
      the cases.
- [x] Read both legal pages, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`, in full. Update each sentence that
      restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Note each
      sentence that restates a changed fact for Milestone 3. No legal
      page restates a changed fact. The notes are in
      `.context/when-to-nest-workspaces/guide-read.md`.

## Milestone 2: Agent text

Depends on: 1

Give the cases to agents.

- [x] Add the cases to `crates/cnd-runner/src/engine/instructions.rs`,
      before the depth line.
- [x] Update the exact texts in
      `crates/cnd-runner/src/engine/_tests_/instructions_tests.rs`.
- [x] Add the cases to the `create_workspace` description in
      `crates/cnd-tools/src/mcp-tools.json`.
- [x] Add the cases to the create help in `crates/cnd-tools/src/help.txt`.
- [x] Update `tools/calls.md`, the runner README, and the workspace tools
      README.
- [x] Run `cargo fmt --all -- --check`,
      `cargo clippy --workspace --all-targets -- -D warnings`, and
      `cargo test -p cnd-runner -p cnd-tools`.

## Milestone 3: Public guide

Depends on: 1

Tell members when to ask for a sub-workspace.

- [x] Replace the sentence "Ask an agent to create a sub-workspace for a
      task that needs its own files and branch." in
      `src/marketing/docs/workspaces.md` with the cases, under the rules
      of [Website docs](../docs/protocol/website-docs.md).
- [x] Update each other guide sentence that Milestone 1 noted: the
      delegation sentence in `src/marketing/docs/sessions-and-chat.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `cargo test --workspace` and the complete gate named in
      `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add this branch and the new create text to the follow-up item
      `plans/follow-ups/full-image-build-for-agent-tools.md`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In a new session of a deployed workspace, check that the
      instructions and the `create_workspace` text give the cases. The
      follow-up item `plans/follow-ups/full-image-build-for-agent-tools.md`
      holds this check.
