# Migrations

D1 applies SQL files in filename order. Each filename starts with a full
date, hour, and minute: `YYYYMMDDHHMM_description.sql`.
Never change a migration that has merged or has been applied to a shared database.

## Keep the previous Worker working

Each migration keeps the previous Worker working on the new schema. The
previous Worker is the version that was live before the deploy.
[Migrations and the previous Worker](../docs/automatic-deploys.md#migrations-and-the-previous-worker)
says when and for how long it runs on the new schema.

- Do not rename or drop a table, a column, an index, or a trigger that the
  previous Worker uses.
- Do not add a check, a `NOT NULL` column without a default, or a unique
  rule that rejects a write of the previous Worker.
- Do not rewrite stored values into a form that the previous Worker cannot
  read.
- A rebuild of a table is safe when it keeps every name, every column,
  every default, every unique rule, and every value that the previous
  Worker reads or writes.

A rename or a drop takes two pull requests:

1. The first pull request keeps the old name working for the previous
   Worker. Its own Worker code does not read or write the old name, because
   that code is the previous Worker at the second deploy. It also adds a
   follow-up item of the kind Post-merge task under `plans/follow-ups/`.
   The item names the old name and each part of the compatibility path,
   and asks for their removal.
   - For a rename, the migration adds the new name and copies the rows.
     The old table or column stays a real table or column. Triggers copy
     each write from one name to the other, in both directions. So each
     Worker sees the rows that the other one writes. Guard each trigger, so
     that a copied write does not copy back or fail on the row that exists.
   - Do not replace the old table with a view. D1 counts no changed rows
     for a write through the triggers of a view. An upsert on a view fails
     with `cannot UPSERT a view`.
   - For a drop, the Worker code stops each use of the old name. When the
     schema rejects a write without the old column, the migration first
     makes the column accept a missing value, for example with a rebuild.
2. The second pull request does that follow-up item. It removes the
   compatibility path and drops the old name with a new migration. It
   merges only after the deploy of the first pull request has been live
   for at least one hour. The next deploy can apply its migrations about
   5 minutes after the first upload, while old Durable Objects still run
   the Worker from before the first pull request. Two merges close together
   can also deploy in one run, because GitHub keeps only the newest
   waiting deploy.

When a migration cannot keep the previous Worker working, ask the user
before it merges. Then name it in the pull request description and in
[When a deploy fails](../docs/automatic-deploys.md#when-a-deploy-fails).

## Reserved ranges

Each milestone owns the complete inclusive range below.
Use a free minute in that range for each new migration.
These reservations keep concurrent branches from choosing the same prefix.
UI and wiring milestones normally need no migration. Their ranges stay reserved.

| Milestone | Inclusive prefix range |
| --- | --- |
| 4a Contracts | `202611060100`–`202611060159` |
| 5 Lifecycle | `202611070000`–`202611070059` |
| 6 App shell | `202611070100`–`202611070159` |
| 7r Runner | `202611070200`–`202611070259` |
| 7 Chat backend | `202611070300`–`202611070359` |
| 8 Chat UI | `202611070400`–`202611070459` |
| 8i Chat wiring | `202611070500`–`202611070559` |
| 16a First deployment | `202611070600`–`202611070659` |
| 9 Files backend | `202611070700`–`202611070759` |
| 10 Files UI | `202611070800`–`202611070859` |
| 11 Tools backend | `202611070900`–`202611070959` |
| 12 Tools UI | `202611071000`–`202611071059` |
| 13 GitHub backend | `202611071100`–`202611071159` |
| 14 GitHub UI | `202611071200`–`202611071259` |
| 15 Agent tools | `202611071300`–`202611071359` |
| 15a Members backend | `202611071400`–`202611071459` |
| 15c Members UI | `202611071500`–`202611071559` |
| 15i Feature wiring | `202611071600`–`202611071659` |
| 15d Marketing | `202611071700`–`202611071759` |
| 15e Mac app | `202611072000`–`202611072059` |
| 15m Marketing and mockup fixes | `202611072200`–`202611072259` |
| 15o Org suspension | `202611080000`–`202611080059` |
| Agent tool lists and names | `202611081300`–`202611081359` |
| Workspace link chips | `202611091200`–`202611091259` |
| Chat attachment metadata | `202611081800`–`202611081859` |
| Preferences and New workspace dialog | `202611082300`–`202611082359` |
| Codex logins | `202611100000`–`202611100059` |
| Computer ledger account merge | `202611100900`–`202611100959` |
| Software image for first builds | `202611101200`–`202611101259` |
| 16 Deployment | `202611071800`–`202611071859` |
| 17 Verification | `202611071900`–`202611071959` |
| Automations: records and routes | `202611101300`–`202611101359` |
| Automations: runs and Run now | `202611101400`–`202611101459` |
| Automations: pull request runs | `202611101500`–`202611101559` |
| Keyboard shortcuts storage | `202611101600`–`202611101659` |
| Agent workspace calls | `202611111200`–`202611111259` |
| Parallel image sources | `202611161200`–`202611161259` |
| Sub-workspaces | `202611161700`–`202611161759` |
| Build free storage | `202611261200`–`202611261259` |

## Key code

- [The test harness](../worker/test-support/harness.ts) applies every SQL
  migration in filename order to a fresh local D1 database.
- [Shared contracts](../src/shared/) define the browser and runner payloads.
- Run `npm run db:migrate` to apply the migrations to local development storage.

## The migrations

`202611060000_worker_core.sql` creates sign-in and the first org records.
`202611060100_contracts.sql` adds the tables used by the feature backends.
It keeps existing rows and gives each existing org its General section.
`202611070007_lifecycle_provider_retry.sql` adds the nullable `image_builds.provider_retry_json` column.
It saves the provider retry window of a running image build, as [Image builds](../worker/lifecycle/image-builds.md#provider-retries) says.
A workspace start keeps the same state in its Durable Object storage.
`202611071600_org_initials.sql` adds the nullable `orgs.initials` column.
It keeps custom initials for the org rail and General settings.
`202611072100_email_invitations.sql` discards the pending invitations by GitHub login.
It then adds invitations by email, each user's verified emails, and the durable matches of invitations to users.
`202611072200_user_terms_and_suspension.sql` adds four columns to `users`: the accepted revision of the Terms and its time, and the time of a suspension and the operator who suspended the user.
Existing users get empty values in all four columns.
[Terms consent](../worker/security/README.md#terms-consent) says how a new account fills the first two, and [Operator actions](../worker/operator/README.md) says how a suspension fills the other two.
`202611072201_image_allocation_intent.sql` moves each image build job in the `create` phase to the new `allocating` phase.
A build now records that phase before it asks for its build sandbox, and an older job in `create` may have sent that request already.
So a build whose create reply was lost finds that sandbox again. When the user who started the build is suspended, the build then removes that sandbox.

Chat history, sessions, runner event cursors, the shown start steps, and
banner state belong to workspace Durable Object storage. They have no D1
tables. The job step records of `202611201500_job_step_times.sql` copy the
times of the start steps for measurement.
Stored secrets use ciphertext columns. The browser reads metadata, except
when an org admin reveals one secret value through the recorded Reveal action.
The git credential helper uses the GitHub user token of the turn's sender, as
[GitHub tokens](../docs/protocol/github-tokens.md) says.
The older comment on `github_connections` in `202611060100_contracts.sql`
stays, because a merged migration does not change.
The `boat_keys` table of `202611060000_worker_core.sql` stays for the same
reason. No code reads or writes it, because the app keeps its one Boat key
as a Worker secret.

`202611080000_org_suspension.sql` adds the suspension time and operator reference to `orgs`.
Both fields start empty. The operator API keeps their first values.
Members receive only the suspension time.

`202611080100_agent_login_reuse.sql` adds the `agent_logins.no_reuse` preference.
Existing Claude subscription tokens refuse re-use by default.
Existing API keys allow re-use by default.
The migration keeps the encrypted secret and its timestamps.

`202611081300_workspace_creation_name.sql` adds the nullable `workspace_creation_plans.name` column.
The agent create tool stores its cleaned workspace name there for creation retries.
Existing plans keep `NULL`.
[Workspace and session names](../docs/protocol/agents-and-sessions.md#workspace-and-session-names)
states how the app shows a missing name.
The `city` column and branch keep their city value.

`202611081849_chat_attachments.sql` adds attachment metadata, owner and target identities, claim revisions, and retryable deletion state.
The private R2 bucket holds the bytes.
The uploader ID is opaque, so retained files do not block account deletion.
The org reference remains until external file purge succeeds.
Chat attachment queries live in `worker/chat/attachment-data.ts` and `attachment-claim-data.ts`.

`202611082300_new_workspace_view.sql` rebuilds `user_preferences` and keeps every existing row and value.
The three default model columns can be all set or all unset.
The nullable `new_workspace_view` column holds `page` or `dialog`.
An unset view used the page then. An unset model uses the configured app default.

`202611091200_waitlist.sql` adds app access, invite and referral codes, code
uses, and the sign-up pause. Each existing account gets app access from
its join time and one referral code with five uses. The user record also
gets the primary verified email and the GitHub account creation time.
[The waitlist backend](../worker/waitlist/README.md) owns these records.

`202611091200_workspace_numbers.sql` gives each workspace its number in its org.
It backfills by creation time, then workspace ID, before it installs the allocation trigger.
The `workspaces_allocate_number` trigger owns allocation.
It increments `orgs.workspace_number_count` and assigns that number inside the workspace insert transaction.
A unique index protects each org and number pair.
Cleanup never lowers the counter. Restore keeps the same org row and counter.
Read the inserted row again to get its number. SQLite `RETURNING` runs before the AFTER trigger.

`202611091300_approval_emails.sql` adds the approval email state and its
approval and state times. Pending messages keep their recipient, subject,
and body for stable delivery retries. A missing verified email saves the
`none` state with no message. The migration also adds the operator who
disabled a code. [The operator backend](../worker/operator/README.md#approval-email-delivery)
owns email delivery and code management.

`202611092050_waitlist_switch.sql` adds the waitlist switch to the one row
of `signup_settings`. `waitlist_on` starts on, also on the existing row.
`waitlist_updated_at` and `waitlist_updated_by_user_id` keep the last
change, and both start empty. The deletion of that operator clears the
reference. The migration rebuilds `user_app_access` with the new source
`open_signup`. It keeps every existing row and value, and the same keys,
references, and checks. No table refers to `user_app_access`, so the
rebuild drops no reference.
[The operator backend](../worker/operator/README.md#waitlist-codes-and-sign-ups)
owns the switch, and [the waitlist backend](../worker/waitlist/README.md#integration)
owns open sign-up grants.

`202611092100_provider_accounts.sql` adds `provider_account` to each table
that holds a sandbox ID or a saved snapshot name: `workspaces`,
`image_builds`, `image_build_jobs`, `lifecycle_sandbox_cleanup`,
`image_leases`, `workspace_creation_plans`, `image_source_jobs`,
`org_deletion_resources`, `terminal_credentials`, and `preview_hostnames`.
The column defaults to `boat`, the one production account. The default
fills the existing rows and the rows that the previous Worker writes during
a deploy. Name the account in each new write, and do not rely on the default.
In `image_build_jobs`, the column holds the account of `previous_image_name`.
In `preview_hostnames`, it holds the account of `listener_sandbox_id`.
`settings` gets no column. The next migration moves the org image out of
`settings`.
The migration rebuilds `workspaces`, so that a unique index on
`(provider_account, sandbox_id)` replaces the unique `sandbox_id`.
D1 keeps cascading deletes active while it defers foreign keys. So the
migration copies each child table of `workspaces` aside and back. It keeps
each workspace number and the org counters, and it recreates both triggers.
It also rebuilds `org_deletion_resources` with the account in its primary
key, and it adds the account to the `image_leases_snapshot` index.

`202611092305_org_images.sql` adds `org_images`, one org image for each org
and provider account, with the primary key `(org_id, provider_account)`.
Each row holds `image_name`, `image_build_id`, `last_refresh_at`,
`last_push_refresh_at`, `pending_push_refresh_at`, and
`next_image_refresh_at`. `provider_account` has no default, so each writer
names it. The non-unique index `org_images_account_name`, on
`(provider_account, image_name)`, serves the check of whether a record still
names an image. The migration copies these six fields of each `settings` row. The
copy takes the account of the build that `image_build_id` names, or `boat`
without such a build. Then the migration drops the six fields from
`settings`. The scripts, the env vars, and the revision stay in `settings`.
A Worker version from before this migration cannot run on the new schema, as
[When a deploy fails](../docs/automatic-deploys.md#when-a-deploy-fails) says.
The [lifecycle provider accounts](../worker/lifecycle/provider-accounts.md#org-images)
page gives the readers and the rules of these records.

`202611100000_codex_access_token.sql` rebuilds `agent_logins` to accept a Codex access token with the kind `token`.
It keeps every row, column, and other rule, including `no_reuse`, the primary key, and the user deletion cascade.

`202611100001_codex_chatgpt_login.sql` adds the refresh claim and safe failure cause to `agent_logins`.
It preserves the encrypted secret and its login timestamps.
It adds `codex_devices` for encrypted, account-owned device authorizations and their safe terminal states and causes.
Its nullable `login_updated_at` holds the current Codex login date at start, or null without a login.
Polls and the final conditional save compare that date with the current login.
Completed device rows keep no login-status copy. Poll replies read the current `agent_logins` record.
Its expiry index serves scheduled cleanup. User deletion removes these records through the user foreign key.

`202611100900_computer_ledger.sql` adds the retained computer ledger. Each
entry names its computer by the provider account and the sandbox ID
together, so equal IDs in two accounts stay two entries.
It copies known IDs from workspaces, builds, cleanup records, preview
listeners, terminal credentials, image source jobs, and the deleted-org
resource journal. Each copy takes the account of its source row. The copy
also keeps an account that the Worker does not configure. Such an entry
stays pending, with no provider request and no deletion mark.
Identity-write triggers copy the account of the source row in the same way.
They also retain assigned IDs from imports and repairs.
A workspace owner trigger keeps its live computer records with the current owner.
An allocation starts with its request key, its account, and no provider ID.
The lifecycle attaches the ID after the provider reply.
Confirmed deletions keep their entries until the org purge.
An owner or parent ID has no foreign key, so its removal keeps the computer record.
The [lifecycle provider accounts](../worker/lifecycle/provider-accounts.md#the-computer-ledger)
page gives the rules of these entries.

The ledger migration runs after `202611092100_provider_accounts.sql` and
`202611092305_org_images.sql`. The first of these rebuilds `workspaces` and
`org_deletion_resources`. SQLite drops the triggers of a table when it drops
the table. This order puts the ledger triggers on the rebuilt tables, so
they stay.

`202611101100_org_provider_assignment.sql` adds the provider account of
each org. Existing rows receive `boat`. New production writes name the
selected account explicitly. The migration also creates the singleton
assignment weights setting, with `boat` at 100%, and its change events.
Each setting change can retain its operator and time. Operator references
become null after account deletion. Existing org, resource, and computer
ledger records and triggers stay in place.

`202611101110_e2b_provider_state.sql` adds E2B create claims, encrypted traffic tokens,
and the mapping from app snapshot names to provider snapshot IDs.
Claims precede provider mutations. They survive ambiguous replies and org removal.
Completed deletions retain tombstones so old requests cannot allocate again.
The [E2B client](../worker/sandbox/e2b/README.md) gives the recovery behavior.

`202611101200_software_images.sql` adds `software_images`, which owns each
software image attempt and its provider account, version, artifact, phase,
resources, output, and deploy token digest. A partial unique index allows
one building attempt per account. `image_build_jobs.software_image_name`
pins the ready software image that a first build uses.
The [software image backend](../worker/software-image/README.md) owns these records.

`202611161200_image_packages_version.sql` adds the nullable
`packages_version` column to `image_build_jobs` and `software_images`. It
holds the version of the apt part of the software step that the image of
the row holds. Existing rows keep `NULL`, so the next build from their image
runs the apt part once. A build job also keeps an empty version when two
starts of its software command carried different apt parts.
[Image builds](../worker/lifecycle/image-builds.md#the-software-step) says
how a build reads and writes it.

`202611181709_software_image_poll_progress.sql` adds three tables for the
deploy polls of a software image attempt. `software_image_operations`
keeps the last finished call of an attempt before its main provider call,
such as the readiness read, for one phase and revision.
`software_image_output` keeps the build output that no deploy poll has
taken yet. `software_image_deploys` links a deploy token digest to the
attempt that its admission chose, until that deploy token expires. Each
row references `software_images` with `ON DELETE CASCADE`, so deleting an
attempt deletes its rows. The migration changes no existing table, column,
or phase name, so the previous Worker keeps working.
[Reply budget](../worker/software-image/README.md#reply-budget) says how
the deploy polls use these tables.

`202611101300_routines.sql` adds org-scoped automations and their run records.
Automation owners reference users, so membership removal can transfer their records.
Org deletion cascades to both tables.
Run workspace IDs have no foreign key, so a failed admission can still keep its attempt identity.
An accepted failed first start keeps its workspace.
The automation also keeps the former owner's name and its consecutive failure count.

`202611101400_routine_run_failures.sql` keeps the public code and message of a failed workspace creation attempt.
It also records the owner when a run enters the queue.
The saved owner prevents an old queued request from using a replacement owner's logins.
Message indexes support first-turn reports and creation recovery.

`202611101401_routine_run_choice.sql` adds the nullable agent choice of a run.
The starter records the agent, model, and effort together before it checks the login.
Existing runs keep null because their original choice is not known.

`202611101500_workspace_base_branches.sql` adds the nullable workspace base branch and the creation plan base branch and start commit.
A null base branch uses the repository default branch.
Existing rows keep that fallback.

`202611131528_workspace_start_branch.sql` adds the nullable creation plan
`start_branch` beside the existing base branch. Old plans fall back to
their base branch, then their captured default branch.

`202611101600_agent_login_endpoints.sql` rebuilds `agent_logins` to accept
the `endpoint` kind for both agents. The nullable `endpoint_origin` column
is required only for that kind. The full endpoint stays inside the
ciphertext with its key. The rebuild copies every existing row, ciphertext,
timestamp, and `no_reuse` choice. It also keeps Codex token rows and the
refresh claim, claim expiry, and failure cause. Existing rows get a null origin.

`202611110407_agent_login_models.sql` adds nullable endpoint model IDs,
the last successful read time, the last attempt time, and an attempt ID to
`agent_logins`. It alters the table without replacing or deleting rows.
The attempt ID prevents a late response from overwriting a newer read.

`202611101600_shortcuts.sql` adds `user_shortcuts`.
Each row holds one account's changed command for one keyboard, with its
ordered keys as JSON. An empty list keeps a command without keys.
The primary key keeps each account, keyboard, and command separate.
Deleting the user deletes these rows through the foreign key.
[Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md#storage)
states the storage rules.

`202611102114_workspace_github_summary.sql` adds the nullable `workspaces.github_summary` column.
A check accepts only `checks-running`, `checks-failed`, `checks-passed`, and `merged`.
The migration copies nothing, so each existing row keeps `NULL` until its next GitHub refresh.
The workspace object keeps the column as a copy of its committed banner state, as [The summary copy](../worker/github/README.md#the-summary-copy) says.
The complete banner state and its events stay in Durable Object storage.

`202611130900_workspace_github_bar_states.sql` replaces the check of `workspaces.github_summary`, so that it accepts each state of the pull request bar except closed.
The values are `checks-running`, `checks-failed`, `ready-to-merge`, `merged`, `conflict`, `changes-requested`, `draft`, and `blocked`.
SQLite cannot change a check, so the migration copies the column into a new column with the new check, drops the old column, and renames the new one.
It copies `checks-passed` as `ready-to-merge` and keeps each other value.
So each row keeps its old colour until its next GitHub refresh writes the bar state.
[The GitHub state](../docs/protocol/github-banner.md#the-github-state) states the values.

`202611111230_workspace_first_session_title.sql` adds the nullable `workspace_creation_plans.first_session_title` column.
The agent create tool stores the requested first session title there, so a repeated create keeps it.
Existing plans keep `NULL`. A plan with `NULL` gives its first session no title at admission.

`202611120000_org_rail_order.sql` adds the nullable integer `org_members.rail_position` column.
It fills every existing membership by org creation time, then org ID, for each person.
This keeps the current rail order at deployment. New memberships keep `NULL` and sort at the end.
The [members backend](../worker/members/README.md) owns the reads and moves.

`202611121200_new_workspace_view_existing.sql` saves the page as the view of each existing account without a saved view.
It keeps every other preference and every saved view.
An unset view now uses the dialog, so only accounts made after this migration get the dialog without a choice.
[The preference](../docs/protocol/create-a-workspace.md#the-preference) gives the requirement.

`202611141345_agent_secrets.sql` adds encrypted org secrets, workspace
pre-approvals, and session approvals. A name is unique in its org.
Composite foreign keys keep each grant within its org and delete its rows
with its secret or workspace. Creator and approver IDs are opaque
attribution IDs, so account removal keeps the records.
The migration adds `workspaces.mac_access`, on for each existing and new
row, and `workspace_creation_plans.capabilities_json` for create recovery.
The [secrets backend](../worker/secrets/README.md) owns these records.

`202611181310_automation_secret_preapprovals.sql` adds the chosen secrets of
each automation. Composite foreign keys enforce the org of its automation
and secret. Deleting either removes its rows. Approver IDs are opaque
attribution IDs, so account removal keeps the choices. The migration adds
only this table and its indexes for org reads and secret deletion. The
previous Worker ignores them and keeps its existing reads and writes.
The [automations backend](../worker/automations/README.md) owns these choices.

`202611161353_secret_reveals.sql` adds retained reveal records with the
secret ID and name, value version, admin ID, and time. An org foreign key
removes its records at org purge. Secret and admin IDs have no foreign
key, so their deletion keeps the records. No record holds a secret value.
The migration gives each existing secret value version 1. Replacement
increments that version, so metadata shows only a reveal of the current
value. An index serves the last reveal of each value version.

`202611161200_parallel_image_sources.sql` rebuilds `image_source_jobs` with the primary key `(build_id, source_index)`, so an image job keeps one row for each repository.
It copies every column of each older row, including the encrypted token, process, output offsets, source index, and provider account.
The new `estimate_bytes` column holds the memory estimate of the Git commands of a repository, 256 MiB by default.
The new `image_source_runs` table holds one row for each job.
That row keeps the job phase, the process and output of its first command, and the memory budget.
Its `metadata_plan_json` column saves the metadata batches before the first token: one installation and at most 500 repositories in each.
`metadata_batch_index` and `metadata_repository_index` save the read progress.
The size estimates and the repository cursor save together, in one D1 batch.
A later call goes on from that plan and that progress.
Only one metadata token lives at a time.
It temporarily belongs to source row 0, with the original source-token context and no grant, and that row keeps its phase.
The previous cleanup reader can therefore revoke it before suspension or deletion continues.
A failed revocation keeps the token there, and blocks the next token and every copy.
Neither table has a foreign key, so each token stays owned until GitHub confirms its revocation.
Each older job gets a run in the `legacy` phase.
A job that the previous Worker starts during a deploy gets one at its next call.
The source loader finishes the confirmed process of such a job with the original encryption context of its token.
Then it moves the job once to one row for each repository, at a point with no token or grant.
SQLite drops the triggers of a dropped table, so the migration recreates both computer ledger triggers of `image_source_jobs`.
A Worker with the serial source loader cannot safely resume a parallel job.
After a parallel job starts, deploy fixes forward instead of rolling back to that loader, as [When a deploy fails](../docs/automatic-deploys.md#when-a-deploy-fails) describes.
The [source loader](../worker/lifecycle/repository-layout.md#the-source-loader) gives the rules of these records.

`202611161200_user_last_active.sql` adds the nullable `users.last_active_at` column.
It holds the time of the last new workspace or chat message of the person, as [the Worker README](../worker/README.md#last-active-time) says.
The migration fills each existing user from the creation time of the newest workspace that the person created in the app, from `workspace_runtime.created_by_user_id`.
It counts only a workspace whose first message ID has the 36-character form of `crypto.randomUUID()`, which only the app makes.
Routine runs and agent tools make 43-character IDs, and the ID form stays after a routine delete removes its runs.
As a second guard, it also leaves out each workspace with a `created_by_workspace_id`, and each workspace of a routine run, by `routine_runs.workspace_id` or by its first message ID.
It also leaves out each workspace after the end of the last sign-in session, 7 days after `users.updated_at`, because no session of the person could create it.
Chat messages live in Durable Object storage, so the migration cannot read them.
A user with no such workspace keeps `NULL`.

`202611161400_workspace_running_since.sql` adds the nullable Unix millisecond
column `workspaces.running_since`. It keeps only the start of the current run.
Existing rows keep null until their next lifecycle save. It guesses no time.
The partial index `workspaces_running_since` holds running, unarchived rows
with a non-null time. Its running states match `runningWorkspacePredicate`.
The [operator Overview](../worker/operator/overview.md) uses this index to read the ten oldest runs.

`202611161700_workspace_parents.sql` adds the nullable parent workspace link
to `workspaces` and `workspace_creation_plans`. Existing rows keep `NULL`.
The workspace link references `workspaces(id)`. The index on
`(org_id, parent_workspace_id)` serves direct sub-workspace reads.
The creation plan keeps the parent through creation retries and replay.
[Sub-workspaces](../docs/protocol/sub-workspaces.md) gives the parent rules.

`202611170110_org_agent_logins.sql` adds `org_agent_logins`, keyed by org
and agent. It accepts only API keys and own endpoints. The org foreign key
deletes its logins with the org. The nullable creator reference clears
when that user is deleted. The encrypted key and address use an org
context. Only the endpoint origin stays in plain text.
The table also holds the endpoint model list and its read and attempt
times. `use_for_every_member` starts off. A switch write keeps the login's
`updated_at` version. Existing personal logins and their data stay intact.
[Org logins](../docs/protocol/org-logins.md) states the requirements.

`202611171200_mac_access_off.sql` turns Mac access off one time in each
existing workspace, also in a workspace where a member turned it on. The
`DEFAULT 1` of `workspaces.mac_access` stays, because SQLite changes a
column default only with a rebuild of the table. Each insert sets the
column itself, and an absent choice now gives 0. A workspace that the
previous Worker creates on the new schema starts with Mac access on, as
[Migrations and the previous Worker](../docs/automatic-deploys.md#migrations-and-the-previous-worker)
says. A member turns it off in its Capabilities.
[Mac access](../docs/protocol/secrets.md#mac-access) gives the rule.

`202611131221_attachment_download_tokens.sql` adds one-use attachment download grants.
Each row holds a token digest, the file and destination identities, its expiry, and its claim time.
Deleting an attachment also removes its grants.

`202611131431_attachment_transferred_bytes.sql` adds the nullable transfer destination and byte-deletion time to each attachment.
Existing rows keep null in both columns.
The partial index serves the cleanup of transferred bytes.
The attachment record stays after its R2 object is deleted.

`202611121610_fast_choices.sql` adds fast mode to workspace runtime records,
creation plans, account defaults, and automations. Each column starts at 0.
Sessions and automation run choices keep fast mode in their existing JSON records.
[Fast mode](../docs/protocol/fast-mode.md) gives the choice rules.

`202611161300_rename_routines_to_automations.sql` renames routines to
automations, as the product did. The `routines` table becomes
`automations`, `routine_runs` becomes `automation_runs`, and its
`routine_id` column becomes `automation_id`. Each index gets the new name.
The rows stay. Saved default names and stored failure codes and messages
of runs and creation attempts use the new word, as new rows do.

`202611161300_workspace_branch_names.sql` adds `workspaces.branch_placeholder`
and `workspaces.task_number`. Existing rows get 0 and 1, so their branches stay.
A new row starts with 1 in both. The start sets the placeholder to 0 before it
uses the branch in the sandbox. Until then, a name renames the branch, as
[The branch and the name](../docs/protocol/create-a-workspace.md#the-branch-and-the-name)
says. Each Continue adds 1 to the task number. A row from before this file
starts at task 1, also after an earlier Continue, because D1 holds no count
of earlier Continues.

`202611161600_owner_count_indexes.sql` adds indexes on the owner of
workspaces, automations, and automation runs. The
[Stats tab of the account](../docs/protocol/account-stats.md) counts the
records of one person, and these indexes keep each read to that person's
rows.

`202611170100_org_skills_repository.sql` adds `settings.skills_repository`.
Existing orgs and new orgs without a choice get empty text.

`202611171100_org_color.sql` adds the nullable `orgs.color` column. It keeps
the preset colour that an admin picks for the tile of the open org, as
[Orgs and members](../docs/protocol/orgs-and-members.md) says. Existing orgs
get null, which the app shows as Blue.

`202611181130_org_skills_repository_trust.sql` adds
`settings.trusted_skills_repository` with an empty default. Existing orgs
gain no trust. Its guarded `settings_clear_replaced_skills_trust` trigger
clears stale trust when a previous Worker changes or removes the source
without a new matching grant. Restoring the old source cannot restore its
old trust. A change of letter case keeps the same identity. The settings
writer saves a replacement and its new named grant together.
[Repository trust](../docs/protocol/org-skills-trust.md#save) gives the contract.

`202611181200_feedback_sends.sql` adds `feedback_sends`. Each row holds one
24-hour epoch of the delivery key of one feedback email of one user. It
keeps the user, the delivery key, the time of the first try, the time of
the hourly count, a generation token, the delivery state, and the number
of tries that still run. A row keeps no message, screenshot, email
address, browser string, or secret. Deleting the user deletes the rows
through the foreign key. Three indexes serve the lookup of a delivery key,
the hourly count, and the cleanup. The migration changes no existing
table, so the previous Worker keeps working.
[The send limit](../worker/app-api/feedback.md#the-send-limit) gives the
rules of these rows.

`202611181500_repository_order.sql` adds the nullable integer
`repositories.position` column. It holds the place of a chosen repository
in the repository order of its org, which counts from 0. The migration
fills it for each chosen row (`selected = 1`) of each org, in the order of
the lower-case GitHub name, then the exact name, then the ID. A row that
is not chosen keeps null. The previous Worker adds and chooses rows
without a position, and its Remove keeps the position. So the order puts a
chosen row without a position after the rows with one, and it ignores the
position of a row that is not chosen. The next add or move gives every
chosen row a position again.
[The app API](../worker/app-api/README.md) gives the rules of the order.

`202611201200_pull_request_merges.sql` adds `pull_request_merges`. Each row
holds one merged pull request of a workspace branch: the GitHub repository
ID and the number as the key, the org, the workspace, the owner at the time
of the record, the GitHub merge time, and the record time. Deleting the org
deletes the rows through the foreign key. The workspace ID has no foreign
key, so the org purge can delete the workspaces first. One index serves the
counts of an owner by merge time, and one serves the cascade of an org. The
migration copies no data, so the table starts empty. It changes no existing
table, so the previous Worker keeps working.
[The merge record](../worker/github/README.md#the-merge-record) gives the
rules of the rows.

`202611201400_idle_stop_settings.sql` adds `idle_stop_settings`, one row
with the stop time of idle workspace computers in minutes, 30 at first,
with its last change and operator. `idle_stop_events` keeps each change
with its operator and time. The previous Worker reads neither table and
keeps its fixed 30 minutes.
[Operator stop time](../worker/operator/idle-stop.md) gives the rules.

`202611201500_job_step_times.sql` adds `job_steps` and `job_runs`, the job
step records of [Step timing](../docs/protocol/step-timing.md#job-step-records).
`job_steps` holds the begin and the end of each step of each build,
refresh, create, and resume, with the key `(job_id, step)`. `job_runs`
holds one row for each run of a start, with the key `(job_id, run_number)`.
Neither table has a foreign key. Each write checks that its org exists, so
a record never fails the batch of the phase change that it measures. The
org purge deletes the rows of the org, and the 15-minute cron deletes rows
after 90 days. The migration changes no existing table, so the previous
Worker keeps working. The [lifecycle README](../worker/lifecycle/README.md#job-step-records)
gives the writers.

`202611201600_org_provider_switches.sql` adds `org_provider_switches`.
It stores each org's switch request, accounts, operator, time, job stop
choice, wait, build identity and times, failure cause, account-change time,
and stop operator and time. A partial unique index allows one waiting or
building switch per org. Org purge deletes its records. User deletion
clears the actor references. Build deletion clears the job references.
The migration also adds three nullable columns to `image_builds`:
`operator_switch_id` identifies each hidden switch build attempt,
`waiting_for_switch_id` identifies a member build that waits for a switch,
and `execution_started_at` can hold when that build actually starts.
These fields let the build code retain every switch attempt and keep a
waiting member build's execution time separate from its request time.
Existing rows and previous Worker inserts get null in all three columns.
The migration changes no existing value, column rule, or write default.
The previous Worker therefore keeps working on this schema.
The [operator backend](../worker/operator/README.md#provider-account-switches)
owns the new records.

`202611201700_waiting_image_builds.sql` recreates `image_builds_running`
with `waiting_for_switch_id IS NULL` in its condition. It permits waiting
member builds beside one executing build. Existing values and columns
stay unchanged. The previous Worker omits the waiting link, so its
inserts still get null and retain the same one-running-build rule.
The previous schema and write shapes therefore keep working. Its old
`runningBuild` query does not understand waits and can select a waiting
row. The new reader explicitly excludes those rows. The
[provider switch guide](../worker/lifecycle/provider-switches.md) gives
the atomic transition into execution and the separate execution deadline.

`202611221800_model_favourites.sql` adds the nullable text column
`user_preferences.model_favourites`. It holds the saved JSON list of
one account. Existing rows keep null. The migration changes no existing
column, default, or constraint, so the previous Worker keeps working.
[Model favourites](../docs/protocol/model-favourites-account.md#the-starting-favourites)
gives the rules for an account without a saved list.

`202611261200_image_build_storage.sql` adds the nullable integer columns
`image_builds.storage_total_bytes` and `image_builds.storage_free_bytes`.
They hold the size and the free space of the disk of a build, which the
build measures before it saves the image. Existing rows keep null. The
previous Worker does not read or write them, so it keeps working.
[Image builds](../worker/lifecycle/image-builds.md#free-storage) says how
the Worker fills them.
