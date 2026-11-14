# Workspace calls

This doc holds the requirements and the decisions in force for the calls
of the workspace tools that create, list, and change the workspaces of the
org. It also covers the lists of repositories, sections, and models that a
create call takes. It belongs to [Agent tools](agent-tools.md).
[Agent tool access](agent-tool-access.md) states what each call reaches,
which calls need an active turn, and the rights of the sender. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## The calls

| Call | MCP tool | CLI command | Route | Needs |
| --- | --- | --- | --- | --- |
| Create a workspace | `create_workspace` | `conductive workspaces create` | `POST /v1/tools/workspaces` | An active turn |
| List the workspaces | `list_workspaces` | `conductive workspaces list` | `GET /v1/tools/workspaces` | The workspace token |
| Get a workspace | `get_workspace` | `conductive workspaces get` | `GET /v1/tools/workspaces/{workspaceId}` | The workspace token |
| Rename a workspace | `rename_workspace` | `conductive workspaces rename` | `POST /v1/tools/workspaces/{workspaceId}/rename` | An active turn |
| Move a workspace | `move_workspace` | `conductive workspaces move` | `POST /v1/tools/workspaces/{workspaceId}/move` | An active turn |
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
- The new workspace gets the org and the workspace owner of the calling
  workspace.
- Without a choice in the call, the new workspace gets the default section
  and the default model of its workspace owner.
- The agent of the new workspace starts on the first message at once.
- The sender of the calling turn sends the first message. So the GitHub
  token of the first turn belongs to that member.
- The first message ends with a `Sent by:` line, as
  [The `Sent by:` line](session-calls.md#the-sent-by-line) says
  (decision 259).
- The new workspace starts with no pre-approved secret, as
  [Grants](secrets.md#grants) says. Its Mac access is on, also when the
  calling workspace has Mac access off (secrets decision 9 A).
  [Mac access](secrets.md#mac-access) states the risk.
- A create call takes no pre-approval and no choice of Mac access.
  Reason: the task gives the pre-approval to a person who creates a
  workspace, and Mac access starts on in each workspace.
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
- A create call names no base branch. The new workspace gets the default
  branch of its repository as its base branch, as
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  says.
- A base branch for a create call was left to the later change that lets
  a create start from another branch (decision 281). So one rule gives the
  target branch of each such create.
- The reply to a create call gives the new workspace with its number and
  its link, and the first session with its link.

## List the workspaces

- A workspace list call returns every workspace of the org, with its
  number, its link, its name, its branch, its state, and its owner.
  Reason: every member of the org already sees these workspaces.
- The owner of an entry has the member ID, the GitHub login, and the
  display name of the workspace owner, and no avatar (decision 283). A
  member without a display name has only the ID and the login. Reason: an
  agent can then find the ID of an owner whom a message names in words.
- The list holds the archived workspaces too. It gives the workspaces in
  the order of their creation, the oldest first.
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
- The latest activity of a workspace is the time whose age the workspace
  list of the app shows.
- A list with more than one filter gives the workspaces that match each
  of them. A filter that matches no workspace gives an empty list. A
  workspace without a name matches no text. A blank text counts as no
  filter.
- Reason: Conductor's `workspace list` filters in the same way.
- The owner filter takes only a member ID (decision 283). The sender line
  of each message gives the member ID of its sender, as
  [The sender line](agent-instructions.md#the-sender-line) says. So an
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
  name, not by member ID.
- The list can also take a limit of 1 to 100, and an offset. The offset
  counts the workspaces before the first one of the reply, from 0.
- A reply with a limit says whether more workspaces follow.
- Without a filter, a limit, or an offset, the list gives every workspace.
  Reason: existing callers keep working.
- A filter, a limit, or an offset of the wrong form gets HTTP 400 with the
  error code `invalid_input`. A limit outside 1 to 100 and an offset below
  0 have the wrong form.

## Get a workspace

- `get_workspace` takes a workspace.
- The reply gives the facts of an entry of the workspace list, with its
  owner. It also gives the repository, the base branch, the section, the
  time of its creation, and the time of its latest activity.
- For an archived workspace, the reply also gives the time of the archive.
  While the app keeps its cloud computer, the reply also gives the end of
  Restore.
- Reason: Conductor's `workspace get` and `workspace status` give one
  workspace.
- The base branch is the branch that
  [The base branch of a workspace](base-branches.md#the-base-branch-of-a-workspace)
  gives.

## Rename a workspace

- `rename_workspace` takes a workspace and a name.
- The Worker cleans the name, and treats a blank name, as
  [Names from the workspace tools](tool-names.md) says.
- No automatic name replaces the stored name, as after Rename in the
  [menu of a workspace row](workspace-menu.md#rename).
- The rename keeps the branch.
- An archived workspace refuses the rename with HTTP 409 and the error
  code `workspace_archived`, as the app does.
- The reply gives the workspace with its stored name.

## Move a workspace

- `move_workspace` takes a workspace and a section of the org.
- The call moves the workspace to the top of that section, as
  [Move to section](workspace-menu.md#move-to-section) does. A move to
  the section of the workspace changes nothing.
- An unknown section gets HTTP 404 with the error code
  `section_not_found`.
- An archived workspace refuses the move with HTTP 409 and the error code
  `workspace_archived`, as the app does.
- The reply gives the workspace with its section.

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

## Repository, section, and model lists

Three list calls give the repositories, the sections, and the models that
a create call takes, with their IDs.

| List | MCP tool | CLI command | Route |
| --- | --- | --- | --- |
| Repositories | `list_repositories` | `conductive repositories list` | `GET /v1/tools/repositories` |
| Sections | `list_sections` | `conductive sections list` | `GET /v1/tools/sections` |
| Models | `list_models` | `conductive models list` | `GET /v1/tools/models` |

- One call that returns all three lists was rejected, because most create
  calls need only the repository.
- Each list call needs only the workspace token, as the workspace list
  does. It needs no active turn.
- Reason: the calls read data that every member of the org already sees,
  and they start no work.

### Repositories

- The repository list returns exactly the repositories that a create call
  accepts at that time. These are the repositories of the newest good org
  image of the org of the calling workspace.
- A list of the repositories that the org chose was rejected, because a
  chosen repository that no image holds yet fails the create.
- Each entry gives the repository ID that a create call takes, the GitHub
  name, such as `acme/web`, and the default branch.
- Each entry also says whether it is the repository of the calling
  workspace.
- The list is in the order of the GitHub names.
- When the org has no good image, the call fails with HTTP 409
  `image_required`, the same error as a create.
- Reason: an empty list would hide why no create can work.

### Sections

- The section list returns every section of the org of the calling
  workspace, in the order of the sidebar.
- Each entry gives the section ID and the name.
- Each entry also says whether it is the default section, the section that
  a create uses when it names none.
- [Sections](section-and-preview-calls.md#sections) states the calls that
  create and delete a section.

### Models

- The model list returns the models that the app offers, in the order of
  the app's model setting. The model picker of the app offers the same
  models.
- Each entry gives the agent, the model ID, the label, and the efforts of
  the model.
- The answer also gives the default choice. A create uses it for the model
  or the effort that the call does not name.
- The default choice is the saved default of the owner of the calling
  workspace. Without a saved default, it is the default choice of the app.
- The default choice is `null` when the owner has no saved default and the
  app has no valid default choice.
- When the app has no valid model list, the call fails with HTTP 503
  `models_unavailable`, as the app's own model route does.
