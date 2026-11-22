# Workspace management

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that rename, move, and archive one workspace. It
belongs to [Workspace calls](workspace-calls.md), which lists each call
with its route. [Agent tool access](agent-tool-access.md) states what each
call reaches, which calls need an active turn, and the rights of the
sender. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A parent-move decision number names a decision of the change that
adds [parent changes](parent-changes.md), as that doc says.

## Rename a workspace

- `rename_workspace` takes a workspace and a name.
- The Worker cleans the name, and treats a blank name, as
  [Names from the workspace tools](tool-names.md) says.
- No automatic name replaces the stored name, as after Rename in the
  [menu of a workspace row](workspace-menu.md#rename).
- The rename changes the branch only before the start creates the branch
  in the sandbox, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says. After that, the rename keeps the branch.
- An archived workspace refuses the rename with HTTP 409 and the error
  code `workspace_archived`, as the app does.
- The reply gives the workspace with its stored name.

## Move a workspace

- `move_workspace` takes a workspace, and a section of the org, a target,
  or both. A target is a new parent or the top level, as
  [Parent changes](parent-changes.md) says (parent-move decision 1 A).
- The MCP tool takes a new parent as `parentId`, and the top level as
  `topLevel: true`. The CLI takes `--parent ID` and `--top-level`.
- Reason for the names: a create call and the list take a parent with
  the same names. "Top-level" is the term of the docs.
- The section is optional only when the call names a target. A call with
  no section and no target gets HTTP 400 with the error code
  `invalid_input`. Reason: older tools always send a section, so each
  request that they send keeps its result.
- A call with both `parentId` and `topLevel: true` gets HTTP 400 with the
  error code `invalid_input` (parent-move decision 3 A).
- Without a target, the call moves the workspace to the top of that
  section, as [Move to section](workspace-menu.md#move-to-section) does.
  A move to the section of the workspace changes nothing.
- A move of a workspace that the list shows as a top-level row also moves
  each workspace nested under it. Without a target, a workspace that the
  list shows as a nested row moves nothing, and the reply gives a
  `notice`. [Moves](sub-workspaces.md#moves) gives these rules.
- With a target, the call changes the parent of the workspace, and moves
  each workspace nested under it too.
  [Parent changes](parent-changes.md) gives the section and the place of
  the moved tree, and its `notice`. It also gives the errors of a target:
  `nesting_cycle` and `nesting_limit` with HTTP 409, and
  `workspace_not_found` with HTTP 404.
- An unknown section gets HTTP 404 with the error code
  `section_not_found`.
- An archived workspace refuses the move with HTTP 409 and the error code
  `workspace_archived`, as the app does.
- The reply gives the workspace with its section, its `parent`, and its
  `depth` after the move. It can also give a `notice`.
- The reply to a move with a target has the same form as the reply to a
  section move. Reason: older tools then accept the reply.
- The help of the CLI and the description of `move_workspace` say how to
  nest a workspace under a parent, and how to take it out of its tree.
  Reason: the notice of a nested row names no target, as
  [Moves](sub-workspaces.md#moves) says.

## Archive a workspace

- `archive_workspace` takes a workspace. It makes the same write as
  Archive in the app, with no question and no check, as
  [Archive](workspace-life.md#archive) says.
- Only the workspace owner or an admin can archive it (decision 42).
  Otherwise the call gets HTTP 403 with the error code
  `archive_forbidden`, and nothing changes.
- An agent can archive the calling workspace. That archive ends the
  calling turn, because Archive stops the cloud computer and revokes the
  workspace token. So the agent can miss the reply.
- Reason: Conductor's archive command takes the current workspace by
  default.
- A member can restore the workspace for 14 days, as
  [Restore](workspace-life.md#restore) says.
- An archive of an archived workspace changes nothing.
- The reply gives the workspace with the time of the archive and the end
  of Restore.
