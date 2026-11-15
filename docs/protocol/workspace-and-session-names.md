# Workspace and session names

This page belongs to [Agents and sessions](agents-and-sessions.md). It
holds the requirements and the decisions in force for the names of
workspaces and sessions. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

- On this page, a name is the name of a workspace or the title of a
  session.
- A new workspace has no name (decision 182). Each new session has no name
  either (decision 185).
- The app shows "Untitled" in place of a missing name.
- In the workspace record, a missing name is null in `name`. In the session
  record, a missing name is null in `title`.
- An automatic name is a name that the app gives on its own. These names
  are automatic:
  - the title of a workspace, as [Messages](messages-and-attachments.md#messages) says
  - a workspace name that the agent runner reports, as
    [Lost workspace updates](agent-runner.md#lost-workspace-updates) says
  - the title that a session takes, as
    [Sessions](agents-and-sessions.md#sessions) says
- The app gives an automatic name only to a workspace or a session that has
  no name (decision 182). So no automatic name replaces a name that a
  member or the app gave.
- A member names a workspace with Rename in the
  [menu of its row](workspace-menu.md#rename), or with a double click on
  its row in the sidebar.
- The app gives no automatic name in an archived workspace, or in a
  workspace of a deleted org.
- Reason: a missing name shows that no one named the workspace or the
  session yet. A text comparison with "New session" or the city name of
  the branch was rejected. A member can type the same text and then lose
  that name.
- Reason: an archived workspace shows its chat read-only (decision 16).

## The title of a new workspace

- [Messages](messages-and-attachments.md#messages) holds how a small model
  of Workers AI names a new workspace from its first message
  (decision 184).
