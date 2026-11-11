# Transcript routes

This doc holds the requirements and the decisions in force for the routes
that give the text of a session transcript: the route of a copy in the
app, and the route of the reads by agents. It belongs to
[Session transcripts](session-transcripts.md), which states the copy items,
what each copy holds, and the text. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The route

- `GET /api/orgs/{orgId}/workspaces/{workspaceId}/sessions/{sessionId}/transcript`
  gives the text of one session.
- Its query names the kind of copy: `detail=concise` or `detail=full`. A
  request without one of these values gets HTTP 400 with the error code
  `invalid_input`, as other chat inputs do.
- The reply is JSON that holds the Markdown text. Reason: the API client
  of the app and its error replies stay the same.
- The route gives the text of each session of the workspace, also of a
  closed session.
- An unknown session, or a session of another workspace, gets HTTP 404
  with the error code `session_not_found`, as on the other session routes.
- The route has the access of the chat history. Only a member of the org
  of the workspace gets the text, as
  [Orgs and workspaces](isolation.md#orgs-and-workspaces) says. Each other
  request gets the refusal of the other chat routes, such as HTTP 404 with
  the error code `workspace_not_found`.
- An archived workspace and a workspace of a suspended org give the text
  too. Reason: a copy is a read, and such a workspace keeps its chat
  readable, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says.
- The route is on `app.conductive.build`, behind its gate, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
  The workspace token of a sandbox gets the same text from the route of
  [Reads by agents](#reads-by-agents).
- The text holds the session as it stood at one event of the workspace:
  each event up to that event, and none after it. Reason: the copy then
  shows one state of the chat, as a load of the history does.
- A copy of a long session does not hold up the workspace. Messages, Stop,
  and the events of the runner go on while the route reads the history.

## Reads by agents

[Transcript reads by agents](transcript-reads.md) states the workspace-token
route, its access, and the parts of a long text.
