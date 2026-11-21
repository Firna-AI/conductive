# Automations and runs

This area stores saved prompts and their triggers in D1.
The routes use the common app gate before they read or change an org's records.
Run now creates a workspace for the automation's saved prompt.

Every org member can read automations.
The creator owns a new automation.
Only its owner can edit it or turn it on.
Its owner and the org admins can turn it off or delete it.
Each write also checks current access inside SQL.

`GET` and `POST` of `automationsPath` list and create automations.
`GET`, `PATCH`, and `DELETE` of `automationPath` read, update, and delete one automation.
An update can send only the fields that changed.
A disable-only update sends `{ "active": false }` and needs no GitHub read.
The list includes each automation's latest run with its current state, or null.

Each detail, create, or update reply includes `AutomationResponse.runLogin`.
It names the owner's current default login for the saved agent, through `resolveDefaultLogin`.
It is null when no login serves that owner.
Every reader gets the same owner, independently of their own default login.
`publicLoginOwner` also serves empty-session metadata and returns only an owner type and ID.
The value has no credential, endpoint host, or full address.
The automation owner still supplies GitHub access.

Each automation in a reply has `capabilities`, an `AutomationCapabilities` with `preapprovedSecretIds`.
They are the chosen secrets that each run workspace starts with as pre-approvals.
Every org member reads them, and only the owner changes them.
`automation_secret_preapprovals` stores one row for each chosen secret.
It follows `workspace_secret_preapprovals`.
Its foreign keys to `automations` and `org_secrets` enforce the org of both and cascade on delete.
So a deleted secret leaves each list, and a deleted automation leaves no row.
A create and an update take an optional `capabilities` of the same shape.
A create without it stores an empty list.
An update without it keeps the stored list, so an older app tab keeps the choices.
A save drops each ID that names no secret of the org and stores the rest.
A `capabilities` value without a list of string IDs returns `invalid_input`, as other bad fields do.
The shape has no `macAccess`, because the Mac access switch acts only on the Mac of the member who uses it in the Mac app, and no person uses it for a run.
[Chosen secrets](../../docs/protocol/automations.md#chosen-secrets) gives the rules.

Each detail, create, or update reply also includes `AutomationResponse.chosenSecrets`.
It gives the ID and the name of each chosen secret, and never a value or a description.
`readAutomationChosenSecrets` reads them with a join of `automation_secret_preapprovals` and `org_secrets` on the org ID and the secret ID.
So each entry names a current secret of the same org.
The entries sort by name, then by ID, as the org secrets list does.
Every org member reads them, as every member reads the automation and the org secrets list.

`POST` of `automationPaths.runNow` takes a `RunAutomationRequest` with the page's request ID.
Only the owner can use it, also while the automation is off.
An automation whose triggers are all pull request triggers refuses Run now.
An automation without triggers permits it.
A repeat of the same request ID returns the same run and one workspace.
The response holds `AutomationRunResponse` after workspace admission, before the start ends.

`GET` of `automationPaths.runs` returns `AutomationRunsResponse` with the newest 50 runs.
Its `nextCursor` is the last returned run ID when older runs exist.
Pass that ID as `before` to read the next page.
The cursor belongs to the same org and automation.
Equal creation times sort by ID descending.
The run state comes from its stored outcome, its workspace, and its creation attempt.
Each run returns its recorded agent and its recorded owner as a person.
The starter saves the complete agent choice once, before the login check.
The check and workspace create use that same choice, including its model, effort, and fast mode.
Automation saves keep fast mode only for a marked model.
[Fast mode](../../docs/protocol/fast-mode.md#saved-defaults-new-workspaces-and-automations) gives the rules.
Runs without a saved choice return null for the agent.
Runs without a saved owner return null for the owner.
Neither value falls back to the automation's current settings.
An accepted failed first start keeps its workspace link and its failure cause.
Try again in that workspace replaces its failed sandbox.
Attempt failures retain their cause for recovery if the run outcome write stops.
A failure before workspace admission has no public workspace link.
A failed first turn keeps its workspace link and its failure cause.
For an author or sender skip, the pull request trigger includes `skipLogin`.
It is the account login from the event that caused the skip.
Older runs and skips without an account omit this field.

The workspace view's `automation` includes `pullRequest` with the run's number and URL.
Scheduled and Run now workspaces return null for `pullRequest`.
View writes cannot change these saved run facts.

`recordAutomationRun` stores a unique run key and a stable first-message ID.
It checks the current owner membership, the owner and org suspension, and org deletion inside SQL.
Scheduled and pull request runs also need an active automation.
`startAutomationRun` checks access again before a new create and skips a queued run that cannot start.
It checks the owner's default agent login and fresh GitHub access before the create.
The shared resolver chooses the usable personal or org login.
The org's preference switch controls their order.
The first session fixes that login at its first accepted message.
The personal share setting does not restrict the owner's own run.
The runner gets only a turn token for that login through the model gateway.
GitHub access and Mac commands still act as the owner.
It calls the existing workspace create and first-message admission paths.
Right before the create, it reads the chosen secrets of the automation and keeps only the IDs that name a secret of the org.
It passes them as `capabilities`, with `macAccess: false`.
The create stores them as normal workspace pre-approvals, with the owner as the approver.
When a secret goes between that read and the create, the create refuses it with `secret_not_found`.
The starter then reads the list again and creates once more.
The creation plan keeps the list for each retry of that create.
[The secrets of a run](../../docs/protocol/automation-runs.md#the-secrets-of-a-run) gives the rules.
It does not wait for cloud computer startup.
A repeat with a creation attempt uses its original sender and bypasses the automation access and login checks.
The create joins the existing workspace through the stored first-message ID.
A failed accept or workspace-link write leaves the run queued and logs only a fixed warning.
Only an error without a creation attempt, or a failed creation attempt, records a start failure.
The workspace's start and first-turn hooks record the actual outcome after admission.
The minute schedule scan calls this starter.
Signed pull request webhooks call the same starter in the request background.
The dispatch stores a queued run before the webhook reply.
The minute scan recovers it if the background task did not start it.
Opened and pushed runs pass the head branch and event commit to the internal create.
Merged runs pass the pull request base branch.
Both use the published org image of the org's provider account, through the shared create path.

Failed checks, starts, and first turns update the run and the consecutive failure count in one D1 batch.
Each terminal outcome counts once.
Outcomes count in the order their batches commit.
A finished first turn resets the count.
Queued, skipped, and stopped turns do not change it.
At three failures, the automation turns off with `failed_runs` and no next scheduled time.
Owner activation resets the count.
An edit preserves failures and automatic turn-off committed after its earlier read.

Schedules keep both their preset fields and a normalized cron expression.
Each save, Active change, and time zone change computes the earliest next time of all schedules in the automation's time zone.
An inactive automation or one without schedules has no next time.
The `* * * * *` Cron Trigger scans at most 50 due automations each minute.
It reads current org deletion, org and owner suspension, and owner membership before each claim.
One D1 batch stores the run and advances the claimed time to the next time after the scan's clock.
The batch checks the old due time, owner, time zone, and trigger list again.
Repeated scans share one run key for that automation and due time.
Missed times give one run, also after an org Restore.
The scan selects the oldest due times first, with the automation ID as a tie-breaker.
It processes independent due automations in parallel.
The scan also retries at most 50 queued runs older than one minute, oldest first.
It reuses their stored run and first-message IDs.
The starter skips a queued run without a creation attempt whose current owner, org, or automation cannot start it.
One failed claim or retry logs a safe warning and leaves the other scan items available.

Author-filter requests hold logins.
Replies and stored triggers hold GitHub account IDs and canonical logins.
Each save resolves those logins again with the owner's GitHub user token.
An unknown login returns `unknown_github_login` with `error.details`.
The details hold the refused `login`, its zero-based `triggerIndex`, and its author-filter `list`, `is` or `isNot`.
The index counts all triggers, including schedules.
The refused save leaves the stored automation unchanged.
An empty `is` list means every org member.
The `members` flag includes org members beside the named accounts of a nonempty `is` list.

Pull request dispatch matches the repository, installation, and trigger event.
It applies author filters before it checks the author and sender account IDs.
An excluded author adds no row.
An untrusted author or sender adds a skipped row atomically, without a start.
Named accounts in Author is can pass the trust check beside org members.
A matching event shares one delivery key across duplicate triggers.
Own run branches and owner events during a queued, starting, working, or input run do not create another run.
The insert checks both loop guards atomically, also across overlapping deliveries.
The guard finds an admitted workspace through its stable first-message ID before the run stores its workspace link.
The workspace's automation line uses the same identity while the link is pending.
The saved trigger facts supply the first message and remain available in run history.

## Development

Run `npm run test -- worker/automations` from the repository root with Node 24.
The route tests use the production Worker handler with local D1 and fake GitHub.
The schedule tests use fixed dates around changes of summer time.
`scanAutomationSchedules` accepts `dueAutomations` and `queuedRuns` limits, both 50 by default.
The batch-limit test passes 2 for each limit and checks the stored operation counts across two scans.

### Key code

- [route.ts](route.ts) dispatches the record routes and enforces ownership.
- [prepare-automation.ts](prepare-automation.ts) validates a save and prepares its stored record.
- [automation-data.ts](automation-data.ts) reads automations and checks their repository and section.
- [automation-capabilities-data.ts](automation-capabilities-data.ts) reads chosen secret IDs within their org.
  `readAutomationChosenSecrets` reads the IDs and names of the chosen secrets of one automation for its reply.
- [automation-capability-statements.ts](automation-capability-statements.ts) saves choices in the automation write batch, with the same access and reference checks.
- [automation-response.ts](automation-response.ts) adds the resolved public login owner and the chosen secret names to each record reply.
- [automation-write-data.ts](automation-write-data.ts) guards mutations with current membership and ownership.
  It uses `guardedStatement` and `guardedRun` from
  [shell-guard.ts](../app-api/shell-guard.ts) for the shared member check.
  Its numbered bindings also retain the ownership and reference checks.
- [schedules.ts](schedules.ts) validates schedules and computes their next time through `croner`.
- [schedule-scan.ts](schedule-scan.ts) starts due schedules and retries old queued runs through the shared starter.
- [schedule-scan-data.ts](schedule-scan-data.ts) reads bounded scan batches and claims due times with their run rows atomically.
- [triggers.ts](triggers.ts) parses trigger inputs and expands presets to cron expressions.
- [author-filters.ts](author-filters.ts) resolves filter logins through GitHub.
- [stored-triggers.ts](stored-triggers.ts) reads stored account filters and prepares logins for a later save.
- [latest-run-data.ts](latest-run-data.ts) reads the newest stored run of each automation.
- [run-route.ts](run-route.ts) serves Run now and the runs list.
- [run-runtime.ts](run-runtime.ts) connects the starter to the real workspace object.
- [pull-request-dispatch.ts](pull-request-dispatch.ts) filters events, stores runs, and schedules background starts.
- [pull-request-data.ts](pull-request-data.ts) reads matching automations, org accounts, and loop guards.
- [run-starter.ts](run-starter.ts) starts or skips a stored queued run, and passes the chosen secrets to the create.
- [run-record-data.ts](run-record-data.ts) stores run keys, message IDs, owner snapshots, and workspace links.
- [run-admission-data.ts](run-admission-data.ts) checks current access and finds existing creation attempts.
- [run-choice-data.ts](run-choice-data.ts) saves the first agent choice atomically for concurrent starters.
- [run-text.ts](run-text.ts) formats the prompt and trigger facts without pull request titles or bodies.
- [run-outcome-data.ts](run-outcome-data.ts) records terminal outcomes and updates the failure count once.
- [run-list-data.ts](run-list-data.ts) reads the latest 50 runs and older pages.
- [run-projection.ts](run-projection.ts) shares state projection between run history, Run now, and automation lists.
- [stored-run.ts](stored-run.ts) parses saved trigger facts.
- [workspace-automation-data.ts](workspace-automation-data.ts) joins a workspace to its automation name and saved pull request.

### Related docs

- [Automations protocol](../../docs/protocol/automations.md)
- [Automation runs](../../docs/protocol/automation-runs.md)
- [Automation risks](../../docs/protocol/automation-risks.md)
- [Shared contracts](../../src/shared/automations.ts)
- [Org secrets](../secrets/README.md)
- [App API](../app-api/README.md)
- [Migrations](../../migrations/README.md)
