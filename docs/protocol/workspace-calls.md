# Workspace calls

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that create, list, and change the workspaces of the
org. It belongs to [Agent tools](agent-tools.md). Linked pages cover
[the lists that a create call takes](create-call-lists.md), and
[the rename, the move, the target change, and the archive](workspace-management.md)
of one workspace.
[Sub-workspaces](sub-workspaces.md) states the rules of the parent of a
workspace. [Agent tool access](agent-tool-access.md) states what each
call reaches, which calls need an active turn, and the rights of the
sender. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A secrets decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## The calls

| Call | MCP tool | CLI command | Route | Needs |
| --- | --- | --- | --- | --- |
| Create a workspace | `create_workspace` | `conductive workspaces create` | `POST /v1/tools/workspaces` | An active turn |
| List the workspaces | `list_workspaces` | `conductive workspaces list` | `GET /v1/tools/workspaces` | The workspace token |
| Get a workspace | `get_workspace` | `conductive workspaces get` | `GET /v1/tools/workspaces/{workspaceId}` | The workspace token |
| Rename a workspace | `rename_workspace` | `conductive workspaces rename` | `POST /v1/tools/workspaces/{workspaceId}/rename` | An active turn |
| Move a workspace | `move_workspace` | `conductive workspaces move` | `POST /v1/tools/workspaces/{workspaceId}/move` | An active turn |
| Change the target branch | `retarget_workspace` | `conductive workspaces retarget` | `POST /v1/tools/workspaces/{workspaceId}/retarget` | An active turn |
| Archive a workspace | `archive_workspace` | `conductive workspaces archive` | `POST /v1/tools/workspaces/{workspaceId}/archive` | An active turn |

- A read uses GET, and a write uses POST.
- Each reply gives each workspace that it names with its number and its
  link, as
  [Workspace numbers and links](workspaces-and-sandboxes.md#workspace-numbers-and-links)
  says (decision 212).
- The help of the CLI and the descriptions of the MCP tools say that a
  workspace link in a message names the workspace with that link. They
  also say that a workspace link in an answer shows as a chip, as
  [Workspace links](workspace-links.md#messages-and-answers) says.
- Reason: the agent can then match a link in a message to its workspace,
  and point to a workspace that it created.

## Create a workspace

- A create call takes a repository of the same org and a first message
  (decision 52).
- A create call can also choose the model, and with it the agent. It can
  also choose the effort and the section.
- A create call can also turn on [fast mode](fast-mode.md) for a model
  that has it. Otherwise the first message runs at standard speed. The
  saved default of the owner gives the call no fast mode. Reason: that
  default belongs to the owner, but the first message runs on the default
  login of the sender of the calling turn.
- The new workspace gets the org and the workspace owner of the calling
  workspace.
- Without a choice in the call, the new workspace gets the default section
  and the default model of its workspace owner.
- A create call can also name a parent workspace: `parentId` in the MCP
  tool, and `--parent ID` in the CLI. The new workspace is then a
  sub-workspace of that parent.
- Reason for the names: the other ID fields are camel case, such as
  `workspaceId`. The other CLI options name the noun, such as `--section`.
- [The parent link](sub-workspaces.md#the-parent-link) and
  [The depth limit](sub-workspaces.md#the-depth-limit) give the parents
  that a create call accepts, and the errors for the other parents.
- A sub-workspace gets the section of its parent in place of any other
  section, as
  [The section of a new sub-workspace](sub-workspaces.md#the-section-of-a-new-sub-workspace)
  says.
- The help of the CLI and the description of `create_workspace` say when
  to name a parent, with the cases of
  [When to nest](sub-workspaces.md#when-to-nest). They also give the
  deepest depth, the sibling advice, and the section of a sub-workspace.
- The agent of the new workspace starts on the first message at once.
- The sender of the calling turn sends the first message. So the GitHub
  token of the first turn belongs to that member.
- The first message ends with a `Sent by:` line, as
  [The `Sent by:` line](session-calls.md#the-sent-by-line) says
  (decision 259).
- The new workspace starts with no pre-approved secret, as
  [Grants](secrets.md#grants) says. It starts with no grant on any Mac,
  also when a Mac holds a grant of the calling workspace, as
  [Mac access](mac-access.md) says.
- A create call takes no pre-approval and no choice of Mac access.
  Reason: the task gives the pre-approval to a person who creates a
  workspace, and only a member starts a grant, in the Mac app.
- A create call can also give the new workspace a name, and the title of
  its first session. The Worker cleans both with the rule of
  [Names from the workspace tools](tool-names.md).
- The first session keeps that title. Reason: Conductor's create command
  can name the first session.
- A create call takes an optional request ID, as the session writes do. A
  repeat with the same request ID gives the result of the first create. It
  makes no second workspace.
- The workspace, its first session, and its first message stay the same on
  a repeat. The workspace state describes the current request.
- Without a request ID, the tool makes one. Reason: a retry after a lost
  reply then makes no second workspace.
- A create call can also name a start branch and a base branch
  (decision 302). The new workspace branch starts from the start branch,
  and its work targets the base branch, as
  [Start from a branch](start-from-a-branch.md) says.
- The defaults apply to the branches that the call names:
  - With neither branch, both are the default branch of the repository.
  - With only a start branch, the base branch is that start branch.
  - With only a base branch, the start branch is that base branch.
- Reason: New workspace also targets the picked branch first, and the user
  asked for both branches.
- A call can name any pair of branches, also a pair that New workspace does
  not offer. Each named branch that is not the default branch gets the
  branch check of [The branch check](start-from-a-branch.md#the-branch-check).
- These ways were not offered, because each gives agents less than the
  user asked for (decision 302):
  - A start branch only.
  - A base branch only.
  - A start branch, with a target of that branch or of the default branch.
- The help of the CLI and the description of `create_workspace` say what
  each branch does, and its default.
- A repeat with the same request ID keeps the branches of the first create,
  whatever branches it names. It gets no branch check, as
  [The branch check](start-from-a-branch.md#the-branch-check) says.
- The reply to a create call gives the new workspace with its number and
  its link, and the first session with its link. It also gives the ID of
  the first turn, so that a
  [watch](session-watches.md#the-watched-turn) can name that turn.
- That turn ID is optional in the reply. So the tools also accept the
  reply of an earlier Worker without it.
- The new workspace in the reply gives its `parentId`, as an entry of the
  workspace list does. The reply can also give a `notice`, as
  [The section of a new sub-workspace](sub-workspaces.md#the-section-of-a-new-sub-workspace)
  says.

## List the workspaces

- A workspace list call returns the workspaces of the org, each with its
  number, its link, its name, its branch, its state, and its owner.
  Reason: every member of the org already sees these workspaces.
- The owner of an entry has the member ID, the GitHub login, and the
  display name of the workspace owner, and no avatar (decision 283). A
  member without a display name has only the ID and the login. Reason: an
  agent can then find the ID of an owner whom a message names in words.
- Each entry also gives its `parentId`: the ID of its parent workspace, or
  `null` for a top-level workspace.
- The list holds the archived workspaces too. It leaves out the
  [removed workspaces](workspace-life.md#removed-workspaces), unless the
  call asks for them (decision 519). It gives the workspaces in the order
  of their creation, the oldest first.
- Reason: the list of the app leaves them out, and the tools give what a
  member sees.
- The list can take these filters (decisions 277 and 282):
  - an owner: a member ID, for only the workspaces that this member owns
  - a state: only the workspaces whose entry gives that state
  - a repository ID, as the repository list gives it: only the workspaces
    of that repository
  - a text: only the workspaces whose name holds that text, in any letter
    case
  - a time: only the workspaces whose latest activity is at that time or
    later
  - archived or not archived: only the workspaces in that group
  - removed or not removed: only the workspaces in that group. Without
    this filter, the list gives only the workspaces that are not removed.
- The list can also take a parent: a workspace ID, as `parentId` in the
  MCP tool and `--parent ID` in the CLI. It then gives only the direct
  sub-workspaces of that workspace.
- The latest activity of a workspace is the time whose age the workspace
  list of the app shows.
- A list with more than one filter gives the workspaces that match each
  of them. So without the removed filter, the filter archived or the state
  archived gives only the archived workspaces that are not removed. The
  filters not archived and removed together give an empty list.
- A filter that matches no workspace gives an empty list. A workspace
  without a name matches no text. A blank text counts as no filter.
- Reason: Conductor's `workspace list` filters in the same way.
- The owner filter takes only a member ID (decision 283). The sender line
  of each message gives the member ID of its sender, as
  [The sender line](message-lines.md#the-sender-line) says. So an
  agent passes that ID for the workspaces of the member whose message it
  answers. It finds another owner in the entries, by GitHub login or
  display name, and passes the member ID of that entry.
- A filter by GitHub login was rejected (decision 283). Reason: a stored
  login can repeat after a GitHub rename, so a login can name two members.
  The filter has no login lookup, and so no refusal for a login that two
  members hold. A call that lists the members of the org was rejected too,
  because Conductor's CLI has no such command.
- A mine filter, for the sender of the calling turn or for the owner of
  the calling workspace, was rejected (decision 282). Reason: a read needs
  no active turn, so it can have no sender. The member who asks can also
  differ from that sender and from that owner.
- The help of the CLI and the description of `list_workspaces` say where
  an agent gets a member ID. They also say that a member ID is for the
  arguments of the tools, and that an answer to a member names a member by
  name, not by member ID. They say that the list leaves out the removed
  workspaces unless the call asks for them.
- The list can also take a limit of 1 to 100, and an offset. The offset
  counts the workspaces before the first one of the reply, from 0.
- A reply with a limit says whether more workspaces follow.
- Without a filter, a limit, or an offset, the list gives every workspace
  that is not removed. Reason: existing callers keep working. They get
  fewer rows, as decision 519 asks.
- A filter, a limit, or an offset of the wrong form gets HTTP 400 with the
  error code `invalid_input`. A limit outside 1 to 100 and an offset below
  0 have the wrong form.

## Get a workspace

- `get_workspace` takes a workspace, also a removed one (decision 519).
- The reply gives the facts of an entry of the workspace list, with its
  owner. It also gives the repository, the base branch, the section, the
  time of its creation, and the time of its latest activity.
- The reply also gives `parent`, the entry of the parent or `null`, and
  the `depth`. It gives `children` too: the entries of the direct
  sub-workspaces, oldest first, also the archived ones.
- For a live workspace, the section is the section where the list shows
  the workspace, as [The place of a row](sub-workspaces.md#the-place-of-a-row)
  says.
- For an archived workspace, the reply also gives the time of the archive.
  While the app keeps its cloud computer, the reply also gives the end of
  Restore. For a removed workspace, the reply also gives the time of the
  removal, and its state stays archived.
- Reason: Conductor's `workspace get` and `workspace status` give one
  workspace.
- The base branch is the branch that
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  gives.

## Rename a workspace

[Rename a workspace](workspace-management.md#rename-a-workspace) states
the rename call.

## Move a workspace

[Move a workspace](workspace-management.md#move-a-workspace) states the
move call, with its section and its target.

## Change the target branch

[Change the target branch](workspace-management.md#change-the-target-branch)
states the call that changes the base branch of a workspace.

## Archive a workspace

[Archive a workspace](workspace-management.md#archive-a-workspace) states
the archive call.

## Repository, section, and model lists

[Repository, section, and model lists](create-call-lists.md) states the
lists of the repositories, the sections, and the models that a create
call takes.
