# Lost workspace updates

This page belongs to [Agent runner](agent-runner.md). It states how the
workspace repairs a lost update of a report that belongs to no session.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

- The file tree, the changes list, the start steps, the workspace name,
  the list of listening ports, and the lists of skills belong to no
  session. A later full report of the same kind replaces each of them.
  But a report of the workspace name sets that name only while the
  workspace has no name, as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names) says.
- When the workspace refuses an update of one of these kinds, the update is
  lost. The workspace stores its marker. Then it asks the runner once for a
  fresh full report of that kind (decision 96).
- The browser shows nothing for that marker. A notice shows beside the
  affected data only when the repair fails. A newer complete report of that
  kind clears the notice.
- Reason: only the latest full report matters. A notice for each lost update
  was rejected.
- The request is a `report.refresh` command with a `commandId` and a `kind`.
  The kind is `files.snapshot`, `changes.updated`, `start.updated`,
  `workspace.title`, `ports.updated`, or `skills.updated`.
- The workspace asks for a full file tree after a refused tree delta. It asks
  for no report after a refused event of any other type.
- Each kind has at most one open request. After a further refusal of that
  kind, the workspace sends no second request.
- A stored complete report of that kind ends the repair, also a failed one.
  A report of the workspace name that comes when the workspace already has
  a name also ends the repair, because it can change nothing. It ends no
  repair of another kind. After the next refusal of that kind, the
  workspace asks for a new report, with a new command ID.
- A replacement is a later full report of the same kind.
  [Files and changes](workspace-tools.md#files-and-changes) says
  which file reports count as replacements.
- The repair fails when the workspace refuses a replacement too, for any
  reason. Only the marker of such a replacement carries `repairFailed: true`.
- Each new connection gets the open request again, with the same command ID.
  A repeated command ID is the same request, not a new one.
- After a failed repair, no new connection gets the request again.
- The workspace stores the marker and the open request together. A storage
  failure stores neither, and the update stays unconfirmed.
- When a refusal makes a new request, the workspace confirms the refused
  update only after the request goes out. Until then, no confirm and no
  welcome covers that update.
- The workspace sends a request after the `welcome`, also before
  `runner.ready` and during a running turn. A request needs no agent login.
- The runner answers each request with a full report of its kind, also
  during a running turn. When it cannot read the repository, it answers a
  request for a file tree or a changes list with `files.unavailable`, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
