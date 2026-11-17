# Move workspaces between parents

Status: Active. On branch `calummoore/conductive-mcp-nested-agents-iet3`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today only a create call sets the parent of a workspace, and no call
changes it later. `move_workspace` moves a top-level tree to the top of a
section, and it moves nothing on a nested row. Agents cannot take a
workspace out of its tree, or put an existing workspace under a parent.
This change lets `move_workspace` change the parent of a workspace. The
moved workspace takes the whole tree under it. The app gets no new control
in this change.

The brainstorm report is in `.context/reparent-workspaces/brainstorm.md`
of the workspace. It holds the left-out approaches, each with its reason,
and the sources for each fact about the current code.

## Decisions

The user, Cal, answered each decision on 2026-11-17. A parent-move
decision number, such as parent-move decision 1, names one of these
records.

1. **How an agent changes the parent of a workspace: A.** `move_workspace`
   gets an optional target. MCP `parentId` and CLI `--parent ID` nest the
   workspace under that parent. MCP `topLevel: true` and CLI `--top-level`
   take it out of its tree. A call with only `sectionId` keeps its current
   rules, also the no-op and the notice on a nested row.
   - Rejected B: a section move of a nested row ends its parent link.
     Reason: a request body that older tools already send gets a new
     result, and an agent that moves its own workspace leaves its tree by
     accident.
   - Rejected C: a new tool, `set_workspace_parent`. Reason: two verbs then
     move a workspace, and a parent change and a section move need two
     calls.
2. **How a running agent learns its new place: A, tools only.** New agent
   instructions say that a move can change the parent and the depth, and
   that `get_workspace` gives the current ones. The tree facts of the
   instructions stay as they are.
   - Rejected B: a tree line in each message, as the branch line of
     decision 227. Reason: the user chose the smallest change.
   - Rejected C: no tree facts in the instructions.
   - Accepted cost: a running session keeps the old facts. A new session
     gets the facts of the last start of the cloud computer, because the
     runner reads them from env vars at its start.
3. **A target that makes a loop, a tree past depth 3, or two targets: A,
   refuse and change nothing.**
   - A target inside the moved tree, or the workspace itself, gets HTTP 409
     with the new error code `nesting_cycle`.
   - A target that puts a workspace of the moved tree past depth 3 gets
     HTTP 409 `nesting_limit`. Its message names the deepest workspace of
     the moved tree and the deepest depth that the parent can have.
   - A call with `parentId` and `topLevel: true` gets HTTP 400
     `invalid_input`.
   - Rejected B: a no-op with a notice. Rejected C: nest under the deepest
     ancestor where the tree fits.
4. **Members in the app: A, agents only in this change.** The app gets no
   control to change a parent. A follow-up item holds the app design.
   - Rejected B: "Move under" and "Move to top level" in the row menu.
   - Rejected C: a drag onto a row.

## Design calls

These are my calls, made on 2026-11-17 under the answers above.

- **The moved tree:** the workspace moves with each workspace under it,
  live or archived. Reason: a tree move does the same, and the tree stays
  whole.
- **Who may move:** every member, through the sender of the turn, with the
  checks of a section move. Reason: a tool write follows the app rule of
  its action.
- **The section of a nested tree:** the shown section of the new parent,
  for each workspace of the moved tree. A call that also names another
  section gets a notice, as a create does. Reason: a create and a tree
  move follow the parent in the same way.
- **The place of a tree that leaves its parent:** the top of the named
  section, or of the section where its row showed. Reason: a section move
  and a new workspace go to the top.
- **The place among new siblings:** oldest first, by creation time, as
  each nested row. Reason: sub-workspace decision 4 rejected a second
  order under a parent.
- **A target equal to the current place:** the call changes nothing, and
  the row keeps its place. Reason: a move to the current section does the
  same.
- **Archived workspaces:** an archived moved workspace keeps the 409
  `workspace_archived` of a move. An archived target parent is allowed.
  Reason: a create accepts an archived parent.
- **An unknown parent, or a parent of another org:** HTTP 404
  `workspace_not_found`, as a create does.
- **The depth check:** it counts links to archived workspaces, above the
  target and under the moved workspace. Reason: a Restore then never shows
  a row past depth 3.
- **Crossing writes:** each check and the write run in one D1 batch, from
  the current rows. So two crossing moves cannot make a loop.
- **A create in flight:** the insert of a create checks the depth of its
  parent again. A move also counts the creates in flight under the moved
  tree. Reason: a create checks the depth before its insert, so a move
  between them could pass depth 3.
- **A bad row:** each tree reader stops at a workspace that it saw before.
  Reason: a loop must never hang a read.
- **The input:** `sectionId` becomes optional only when the call gives a
  target. A call with no field keeps its current input error. Reason: older
  tools always send `sectionId`, so each body that they send keeps its
  result.
- **The reply:** the same shape, the workspace with its new `parent` and
  `depth`, and an optional `notice`. Reason: older tools then accept the
  reply.
- **The notice of a nested section move:** its text stays. The tool
  description and the CLI help teach the new target. Reason: older tools
  cannot send the new fields.
- **Open tabs:** the write publishes each changed workspace. The published
  record already holds `parentId`, and the list places each row from it.
- **The creator record:** a move changes only `parent_workspace_id`.
  `created_by_workspace_id` keeps the creator.
- **Input edge cases:** `topLevel: false` is no target. `parentId: null`
  gets 400 `invalid_input`, under the general wrong-form rule. A create
  that fails its second depth check gets `nesting_limit`, as a create
  does today. Reason: each follows an existing rule.
- **The new protocol page:** the parent change rules live in
  `docs/protocol/parent-changes.md`. Reason: `sub-workspaces.md` would
  pass 300 lines with them.

Contract owners:

- [Sub-workspaces](../docs/protocol/sub-workspaces.md) and
  [Parent changes](../docs/protocol/parent-changes.md).
- [Workspace calls](../docs/protocol/workspace-calls.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- The [agent workspace tools README](../worker/tools/README.md) and its
  [workspace calls](../worker/tools/workspaces.md).
- The [tools README](../tools/README.md) and [tool calls](../tools/calls.md).
- The [cnd-tools README](../crates/cnd-tools/README.md).

## Milestone 1: Documentation and protocol

Depends on: none

The docs state the parent change, its refusals, and the agent context
rule. No mockup changes, because the app gets no new control.

- [x] `docs/protocol/sub-workspaces.md`: replace "The parent link never
      changes after the create" with the parent change of parent-move
      decision 1. Add the refusals of parent-move decision 3, the depth
      check over the moved tree, and the new reason for counting archived
      links. Keep the no-op of a section move on a nested row. Say that the
      app offers no way to change a parent.
- [x] `docs/protocol/workspace-calls.md`: give the new fields of "Move a
      workspace", the CLI flags, the errors, and the notices.
- [x] `docs/protocol/agent-instructions.md`: replace "they never change"
      with parent-move decision 2. The instructions say that a move can
      change the parent and the depth, and that `get_workspace` gives the
      current ones. Keep the rejection of a tree line, with its new reason.
- [x] `docs/architecture.md`: change the term "Sub-workspace", which says
      "that an agent created under".
- [x] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, such as the moves in
      `src/marketing/docs/workspaces.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2: Worker parent change

Depends on: 1

The Worker route accepts the target, checks it, and writes the new parent
in one D1 batch.

- [ ] Accept `parentId` and `topLevel` in the move route of
      `worker/tools/workspace-routes.ts`, through `ToolWorkspaceWrite` and
      `worker/tools/workspace-write-composition.ts`.
- [ ] Add the parent write in a new file beside
      `worker/app-api/feature-workspaces-data.ts`, which is near the
      300-line limit. Reuse `workspaceTreeSql` for the moved tree and the
      section write.
- [ ] Check in the same batch: the loop, the depth of the target and of
      the moved tree with the creates in flight, and the archived moved
      workspace. Map each failure to its error.
- [ ] Check the depth of the parent again in the insert of a create.
- [ ] Make each tree reader stop at a workspace that it saw before:
      `placeWorkspaces`, `readWorkspaceMove`, `workspaceParent`,
      `toolWorkspaceDetail`, and the recursive SQL.
- [ ] Add `nesting_cycle` to the error codes and to
      `worker/warning-values.ts` when it needs the code.
- [ ] Tests: a nest, a take-out, the moved tree and its sections, the
      places, a no-op target, each refusal, an archived target, a create in
      flight, the publish of each changed workspace, and a bad row.
- [ ] Update `worker/tools/README.md`, `worker/tools/workspaces.md`, and
      `worker/app-api/README.md`.

## Milestone 3: Tool input and description

Depends on: 2

The MCP tool and the CLI send the target.

- [ ] Make `section_id` optional and add `parent_id` and `top_level` in
      `AgentMoveWorkspaceRequest` of
      `crates/cnd-runner-interface/src/tools/workspaces.rs`. Regenerate
      `src/shared/generated/` with the bindings command.
- [ ] Update `move_workspace` in `crates/cnd-tools/src/mcp-tools.json`:
      the new fields and a description of the parent change.
- [ ] Parse the fields in `crates/cnd-tools/src/input/parse.rs`. Add
      `--parent` and the value-less `--top-level` to
      `crates/cnd-tools/src/cli_parse.rs` and to the CLI help.
- [ ] Tests for the parse, the CLI flags, and the request body.
- [ ] Update `tools/calls.md`, `tools/README.md`, and
      `crates/cnd-tools/README.md`.

## Milestone 4: Agent instructions

Depends on: 1

New agent instructions say that a move can change the parent and the
depth.

- [ ] Add the sentence of parent-move decision 2 to
      `crates/cnd-runner/src/engine/instructions.rs`. Name `move_workspace`
      for a parent change.
- [ ] Update the instruction tests and any snapshot of the text.
- [ ] Check the overlap with workspace W-279, "when nested workspaces
      used", which may change the same instruction text.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Add the follow-up item of parent-move decision 4 under
      `plans/follow-ups/`: the app design to change a parent.
- [ ] Run the targeted tests, the Rust checks, and the complete gate named
      in `AGENTS.md`.
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

- [ ] In production, ask an agent to nest a workspace under another
      workspace, and to take it out again. Check the sidebar in an open
      tab.
