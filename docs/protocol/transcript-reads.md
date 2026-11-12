# Transcript reads by agents

This page belongs to [Session transcripts](session-transcripts.md). It
states how an agent in a sandbox reads the text of a session, and how a
read gives the parts of a long text. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Reads by agents

- `GET /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/transcript`
  on `api.conductive.build` gives the text of one session to the workspace
  token of a sandbox (decision 258). The `read_session` call of the
  [session calls](session-calls.md) uses it.
- The route reaches each session of each workspace of the org of the
  sandbox, as [Reach](agent-tool-access.md#reach) says. It needs no active
  turn.
- The text is the text of a copy, from the same build. So
  [What each copy holds](session-transcripts.md#what-each-copy-holds) and
  [The text](session-transcripts.md#the-text) hold for it too. A read
  leaves out nothing that a copy holds.
- Reason: an agent then reads what a member would paste, and one build
  keeps the two texts the same.
- The query can name the kind of text, as on the route of a copy:
  `detail=concise` or `detail=full`. Without a kind, a read gives the
  concise text. Reason: the concise text is smaller.
- Each reply stays within a size limit. The limit follows the budgets and
  the guidance that both agents publish for the result of a tool. It is
  not a promise for each limit that the settings of an agent can change.
- A longer text comes in parts of whole lines. Without a start line, a
  read gives the newest lines that fit the limit. Reason: agent clients
  cut long tool results, and the newest answer matters most.
- A read can name a start line. It then gives the lines from that line on
  that fit the limit.
- A line that alone passes the limit comes in pieces that fit it. The
  reply of each piece says where the next piece starts, and a read can
  start there. No reply is empty, and no text is lost.
- The reply gives the numbers of the first and the last line of its part,
  and the number of lines of the whole text. The text starts at line 1.
- Each read builds the text again. So when the session changes between
  two reads, a line number can hold other text.
- A read also reaches a closed session, as the route of a copy does. An
  unknown session, or a session of another workspace, gets HTTP 404 with
  the error code `session_not_found`.
