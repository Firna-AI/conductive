# Migrations

D1 applies SQL files in filename order. Each filename starts with a full
date, hour, and minute: `YYYYMMDDHHMM_description.sql`.
Never change a migration that has merged or has been applied to a shared database.

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

Chat history, sessions, runner event cursors, start steps, and banner state
belong to workspace Durable Object storage. They have no D1 tables.
Stored secrets use ciphertext columns. The browser reads only metadata.
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
An unset view uses the page. An unset model uses the configured app default.

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

`202611101200_software_images.sql` adds `software_images`, which owns each
software image attempt and its provider account, version, artifact, phase,
resources, output, and deploy token digest. A partial unique index allows
one building attempt per account. `image_build_jobs.software_image_name`
pins the ready software image that a first build uses.
The [software image backend](../worker/software-image/README.md) owns these records.

`202611101300_routines.sql` adds org-scoped routines and their run records.
Routine owners reference users, so membership removal can transfer their records.
Org deletion cascades to both tables.
Run workspace IDs have no foreign key, so a failed admission can still keep its attempt identity.
An accepted failed first start keeps its workspace.
The routine also keeps the former owner's name and its consecutive failure count.

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

`202611111600_github_installation_limits.sql` adds `github_installation_limits`.
Each row keeps the time, in milliseconds, when GitHub takes the reads of one GitHub App installation again.
It has no foreign key, so a removed installation never waits on it.
A row whose time has passed limits nothing.
[Rate limits](../worker/github/README.md#rate-limits) says how the reads use it.

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
| Routines: records and routes | `202611101300`–`202611101359` |
| Routines: runs and Run now | `202611101400`–`202611101459` |
| Routines: pull request runs | `202611101500`–`202611101559` |

## Key code

- [The test harness](../worker/test-support/harness.ts) applies every SQL
  migration in filename order to a fresh local D1 database.
- [Shared contracts](../src/shared/) define the browser and runner payloads.
- Run `npm run db:migrate` to apply the migrations to local development storage.
