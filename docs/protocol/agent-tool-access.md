# Agent tool access

This doc holds the requirements and the decisions in force for the access
of the workspace tools. It covers what each call reaches, which calls need
an active turn, and whose rights each change uses. It belongs to
[Agent tools](agent-tools.md), which lists the calls. The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Terms

- **Calling workspace:** the workspace whose sandbox makes a call.
- **Calling turn:** the agent turn that makes a call.
- **Sender:** the member whose message started the calling turn.
- **Read:** a call that changes nothing: a list, the read of a session, or
  the get of one workspace, session, or message.
- **Write:** each other call of the workspace tools, except a Mac command
  request.

## Reach

- Each call reaches each workspace of the org of the calling workspace,
  and no workspace of another org (decisions 257 and 277). This holds also
  for an archive and for a section delete.
- A call that takes a workspace names the calling workspace when it names
  no workspace.
- The Worker takes the target workspace from its own records, and only
  from that org. An unknown workspace, or a workspace of another org, gets
  HTTP 404 with the error code `workspace_not_found`.
- Reason: every member of the org can already read, send messages, and act
  in each of its workspaces. Conductor's CLI gives its agents the same
  reach.
- Smaller reaches were rejected, such as the calling workspace alone, with
  the workspaces that it created, or with the workspaces of one
  repository. A follow-up would then fail for each workspace outside the
  reach.
- A smaller reach for `archive_workspace`, the calling workspace and the
  workspaces that it created, was rejected (decision 277). Tools without
  `delete_section` were rejected too. Reason: all calls keep one reach.
- A smaller reach for the turns of routine runs was rejected. Its limit
  must pass to each workspace, session, and message that such a turn
  makes. A routine could then not follow up on its own work.
- An org setting that lets an admin make the reach smaller was rejected.
  It needs a stored setting, a settings control, a mockup, and a protocol
  section.
- [What the workspace tools reach](isolation.md#what-the-workspace-tools-reach)
  states the risks of this reach.

## Tokens and turns

- Each read needs only the workspace token. It needs no active turn
  (decision 257).
- Reason: a read gives data that every member of the org already sees, and
  it starts no work.
- Reads that also need an active turn were rejected, so that every read
  keeps the rule of the lists.
- A read that filters by a member names that member in the call. No read
  takes such a member from the calling turn or from the owner of the
  calling workspace (decision 282). Reason: a read can come without a
  turn, and the member who asks can differ from both.
- Each write needs an active turn. The request names its turn. The Worker
  accepts it only while that turn runs in the calling workspace.
- A write without such a turn gets HTTP 403 with the error code
  `calling_turn_required`. Reason: the Worker takes the sender of a write
  from its record of the calling turn.
- A Mac command request also names its turn, as
  [Who gets a request](agent-tools.md#who-gets-a-request) says.

## The sender

- Each write acts for the sender.
  [The sender](session-calls.md#the-sender) states what this means for a
  new session and for a tool message.
- The Worker takes the sender from its own record of the calling turn. It
  never takes a sender from the call, and it never uses the workspace
  owner in place of the sender.
- At each write, the Worker checks that the sender is still a member of
  the org and is not suspended. Otherwise the write gets HTTP 403 with the
  error code `membership_required`.
- Reason: a create call and a Mac command already follow that sender.
  Agent code runs in the sandbox, so a sender that the sandbox names can be
  false.
- A tool identity as the sender was rejected. The GitHub token and the Mac
  requests of a turn follow its sender, so they would then belong to no
  member.

## The rights of the sender

- Each write follows the rule of the app for its action, with the rights
  of the sender in the app (decision 277).
- So every member can rename and move a workspace, rename, close, and stop
  a session, create and delete sections, and open and close previews, as
  in the app.
- Only the workspace owner or an admin can archive a workspace
  (decision 42).
- A write that the sender may not make gets the refusal of the app, and
  nothing changes. An example is HTTP 403 with the error code
  `archive_forbidden`, for an archive by a member who is neither the owner
  nor an admin.
- Reason: the session calls act for the sender in the same way. So an
  agent can do only what the sender can do in the app.
- An approval by a member for each call that ends work was rejected
  (decision 277). The work would then wait for a person.
- One generic call that acts for the sender on each route of the app was
  rejected (decision 277). The workspace token would then allow more than
  the calls of the tools.
