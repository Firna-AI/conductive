# Routines and runs

This area stores saved prompts and their triggers in D1.
The routes use the common app gate before they read or change an org's records.
Run now creates a workspace for the routine's saved prompt.

Every org member can read routines.
The creator owns a new routine.
Only its owner can edit it or turn it on.
Its owner and the org admins can turn it off or delete it.
Each write also checks current access inside SQL.

`GET` and `POST` of `routinesPath` list and create routines.
`GET`, `PATCH`, and `DELETE` of `routinePath` read, update, and delete one routine.
An update can send only the fields that changed.
A disable-only update sends `{ "active": false }` and needs no GitHub read.
The list includes each routine's latest run with its current state, or null.

`POST` of `routinePaths.runNow` takes a `RunRoutineRequest` with the page's request ID.
Only the owner can use it, also while the routine is off.
A routine whose triggers are all pull request triggers refuses Run now.
A routine without triggers permits it.
A repeat of the same request ID returns the same run and one workspace.
The response holds `RoutineRunResponse` after workspace admission, before the start ends.

`GET` of `routinePaths.runs` returns `RoutineRunsResponse` with the newest 50 runs.
Its `nextCursor` is the last returned run ID when older runs exist.
Pass that ID as `before` to read the next page.
The cursor belongs to the same org and routine.
Equal creation times sort by ID descending.
The run state comes from its stored outcome, its workspace, and its creation attempt.
A removed failed-start workspace has no public workspace link.
A failed first turn keeps its workspace link and its failure cause.

`recordRoutineRun` stores a unique run key and a stable first-message ID.
It checks the current owner membership, the owner and org suspension, and org deletion inside SQL.
Scheduled and pull request runs also need an active routine.
`startRoutineRun` checks access again and skips a queued run that cannot start.
It checks the owner's agent login and fresh GitHub access before the create.
The first session uses the owner's own login, independent of its share setting.
It calls the existing workspace create and first-message admission paths.
It does not wait for cloud computer startup.
The minute schedule scan calls this starter.
Webhook callers can reuse it but are not connected yet.

Failed checks, starts, and first turns update the run and the consecutive failure count in one D1 batch.
Each terminal outcome counts once.
Outcomes count in the order their batches commit.
A finished first turn resets the count.
Queued, skipped, and stopped turns do not change it.
At three failures, the routine turns off with `failed_runs` and no next scheduled time.
Owner activation resets the count.
An edit preserves failures and automatic turn-off committed after its earlier read.

Schedules keep both their preset fields and a normalized cron expression.
Each save, Active change, and time zone change computes the earliest next time of all schedules in the routine's time zone.
An inactive routine or one without schedules has no next time.
The `* * * * *` Cron Trigger scans at most 50 due routines each minute.
It reads current org deletion, org and owner suspension, and owner membership before each claim.
One D1 batch stores the run and advances the claimed time to the next time after the scan's clock.
The batch checks the old due time, owner, time zone, and trigger list again.
Repeated scans share one run key for that routine and due time.
Missed times give one run, also after an org Restore.
The scan selects the oldest due times first, with the routine ID as a tie-breaker.
It processes independent due routines in parallel.
The scan also retries at most 50 queued runs older than one minute, oldest first.
It reuses their stored run and first-message IDs.
The starter skips a queued run whose current owner, org, or routine cannot start it.
One failed claim or retry logs a safe warning and leaves the other scan items available.

Author-filter requests hold logins.
Replies and stored triggers hold GitHub account IDs and canonical logins.
Each save resolves those logins again with the owner's GitHub user token.
An empty `is` list means every org member.
The `members` flag includes org members beside the named accounts of a nonempty `is` list.

## Development

Run `npm run test -- worker/routines` from the repository root with Node 24.
The route tests use the production Worker handler with local D1 and fake GitHub.
The schedule tests use fixed dates around changes of summer time.

### Key code

- [route.ts](route.ts) dispatches the record routes and enforces ownership.
- [prepare-routine.ts](prepare-routine.ts) validates a save and prepares its stored record.
- [routine-data.ts](routine-data.ts) reads routines and checks their repository and section.
- [routine-write-data.ts](routine-write-data.ts) guards mutations with current membership and ownership.
- [schedules.ts](schedules.ts) validates schedules and computes their next time through `croner`.
- [schedule-scan.ts](schedule-scan.ts) starts due schedules and retries old queued runs through the shared starter.
- [schedule-scan-data.ts](schedule-scan-data.ts) reads bounded scan batches and claims due times with their run rows atomically.
- [triggers.ts](triggers.ts) parses trigger inputs and expands presets to cron expressions.
- [author-filters.ts](author-filters.ts) resolves filter logins through GitHub.
- [stored-triggers.ts](stored-triggers.ts) reads stored account filters and prepares logins for a later save.
- [latest-run-data.ts](latest-run-data.ts) reads the newest stored run of each routine.
- [run-route.ts](run-route.ts) serves Run now and the runs list.
- [run-runtime.ts](run-runtime.ts) connects the starter to the real workspace object.
- [run-starter.ts](run-starter.ts) starts or skips a stored queued run.
- [run-record-data.ts](run-record-data.ts) stores run keys, message IDs, owner snapshots, and workspace links.
- [run-admission-data.ts](run-admission-data.ts) checks current access and finds existing creation attempts.
- [run-text.ts](run-text.ts) formats the prompt and trigger facts without pull request titles or bodies.
- [run-outcome-data.ts](run-outcome-data.ts) records terminal outcomes and updates the failure count once.
- [run-list-data.ts](run-list-data.ts) reads the latest 50 runs and older pages.
- [run-projection.ts](run-projection.ts) shares state projection between run history, Run now, and routine lists.
- [stored-run.ts](stored-run.ts) parses saved trigger facts.
- [workspace-routine-data.ts](workspace-routine-data.ts) joins a workspace to its routine name.

### Related docs

- [Routines protocol](../../docs/protocol/routines.md)
- [Shared contracts](../../src/shared/routines.ts)
- [App API](../app-api/README.md)
- [Migrations](../../migrations/README.md)
