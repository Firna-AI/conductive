# Provider accounts

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code stores the provider account of each sandbox and
saved snapshot, how it reaches the client of that account, and how it keeps
one org image for each account. The
[sandbox area](../sandbox/README.md#provider-accounts) owns the account
configuration and the lookup.

## Stored accounts

Each D1 record of a sandbox or a saved snapshot also stores its provider
account in `provider_account`. Each reader returns it as `providerAccount`.
Write the account with each sandbox ID or snapshot name. Compare a sandbox
or a snapshot by its account and its ID or name together, also in leases,
cleanup records, and image pins.

- A create takes the account of the published org image that it starts
  from, as [Org images](#org-images) says.
- A resume takes the account of the workspace record.
- A new build takes the fixed account of its org. Its job row keeps
  the account of the previous org image, which `BuildJob` reads as
  `previousProviderAccount`. A new build starts from the image of its own
  account, so the two can differ only in an older saved job.
- A saved start job keeps its account. `readStartJob` reads an older job
  without one as `DEFAULT_PROVIDER_ACCOUNT`.

## Routing

Each provider call gets the client of the account that its record or job
stores, through `providerForAccount` or `orgProviderForAccount` in
[`client.ts`](../sandbox/client.ts). No call falls back to another account.

- Workspace actions, disk retention, input activity, archive, and
  suspension stops use the account of the workspace record.
- A start uses the account of its saved job. When the workspace record
  already holds a sandbox in another account, the start reaches that
  sandbox through the account of the record.
- A failed start deletes its sandbox through the account of the job. When
  the job allocated no sandbox, it uses the account of the workspace
  record. A record in `lifecycle_sandbox_cleanup` uses its own account.
- A build reaches its build sandbox and its new snapshot through
  `BuildJob.providerAccount`. Its cleanup checks the leases of the previous
  org image and deletes that image through `previousProviderAccount`.
- An unknown account throws `ProviderAccountError` before any provider
  request. `deleteSandboxIfPresent` and `deleteSnapshotIfPresent` ignore
  only a provider `not_found`. So a cleanup never counts the resource of an
  unknown account as removed.

## The computer ledger

The [computer ledger](computer-ledger.ts) keeps one entry for each cloud
computer of an org. Each entry stores its provider account with its sandbox
ID. The account and the ID together name the computer, so equal IDs in two
accounts stay two entries.

- An allocation record stores its request key and its account before the
  create request. The account and the key together name the allocation.
  The lifecycle attaches the returned ID to that record.
- Each write of an entry names its account. A read, an update, or a delete
  of one computer matches its account and its ID together. A list of live
  computers gives the account with each ID.
- A D1 trigger copies the account of each record that names a computer,
  such as a workspace, a build, or a cleanup record. The
  [ledger migration](../../migrations/README.md) fills the ledger from older
  records in the same way.
- An org Stop task in [`computer-stop-task.ts`](computer-stop-task.ts) saves
  the account and the ID of each computer before its first provider request.
- Each provider call for a ledger computer uses the client of the stored
  account, as [Routing](#routing) says.
- The Stop or the Delete of a computer in an account that the Worker does
  not configure stays pending. `ProviderAccountError` stops the call before
  any provider request. The ledger entry gets no deletion mark.
- A software image build belongs to no org, so the ledger holds no entry
  for its computer. Its `createResource` intent has no ownership. The
  [software image record](../software-image/README.md) keeps the account
  and the ID of that computer until its cleanup deletes it.

D1 holds the workspace, token, build, and log records. The storage of each
object holds the lifecycle state, the turn records, and the events.
The computer ledger keeps allocation keys, orgs, owners or starters, and provider IDs with their [provider accounts](provider-accounts.md#the-computer-ledger).
It keeps deleted computer IDs until their org is purged.
Assigned identity writes also retain older IDs, including imports and repairs.
Workspace owner changes update each live ledger entry of that workspace.
The retained owner survives removal of the workspace row.
Allocation recovery keeps that retained owner when it merges an imported computer.
Definite first create refusals stay as rejected allocation records.
A refused replay keeps an earlier uncertain request live.
Each failed computer has its own cleanup flag.
The native cleanup pointer can therefore change without losing an older failed computer.
Archive and Restore keep the ledger entry of a retained computer live.
At the end of Restore, the delete goes through the ledger-aware cleanup of [`cleanup.ts`](cleanup.ts).
`detachArchiveDisk` then marks the exact account and ID deleted in the same D1 batch that detaches the disk.
A confirmed missing archived disk uses that batch too.

## Resource entry points

- [`resource-intents.ts`](resource-intents.ts): `createResource`, the only
  path to a provider call that creates a sandbox or a snapshot. It stores the
  request first, so the lifecycle finds the resource after a lost reply.
  It records a computer allocation before create and attaches the returned ID.
- [`computer-ledger.ts`](computer-ledger.ts): allocation records, returned IDs,
  confirmed deletions, and the live computers that still need cleanup.
- [`computer-stop-task.ts`](computer-stop-task.ts): persistent org Stop tasks.
  The task saves the account and ID of each computer, and its alarm, before the first provider request.
  Its native RPC and alarm share the lifecycle queue.
- [`cleanup.ts`](cleanup.ts): retries every failed computer of a workspace.
  `deleteSandboxIfPresent` marks the ledger after Delete succeeds or returns not found.

## Org images

`org_images` holds one org image for each org and provider account: the
image name, its build, the last refresh, the last and the pending push
refresh, and the next refresh deadline. `settings` keeps the scripts, the env
vars, and the revision, which all accounts of the org share.

- [`org-image-data.ts`](org-image-data.ts) gives `OrgImage`, `readOrgImage`,
  and `imageIsPublished`.
  [`org-image-refresh-data.ts`](org-image-refresh-data.ts) holds the push
  refresh queries for the account of each org.
- [`org-provider-account.ts`](../data/org-provider-account.ts) reads the fixed
  account from `orgs.provider_account`. New creates, builds, refreshes,
  settings reads, and repository lists use that account. Low-level image
  readers require an explicit account. No code picks the newest image
  across accounts. Normal member replies name no account.
- An image is published when its record names a succeeded build of the
  same account with the same snapshot name. `publishBuild` writes only the
  record of the account of its build.
- The push refresh limit, the pending push refresh, and the daily deadline
  belong to the record of one account. The Cron repair advances the record
  of the fixed org account. A push refresh finds each matching org through
  that account, including orgs on different accounts.
- Build cleanup keeps an old snapshot while any `org_images` record names
  the same account and name, and while a lease holds it.
- One org still runs one build at a time, with one image coordinator. The
  coordinator reads an older saved state without an account as `boat`.

## Org assignment

The [assignment service](../provider-assignment/README.md) selects an account
before Create org writes its records and starts its first build.
Existing orgs receive `boat`. An org keeps its account through Delete and
Restore. No route changes that account.

The [operator provider API](../operator/providers.md) reads and changes the
weights for future orgs. Its account list contains only configured IDs.
It gives org counts and each org's account only through operator replies.

Only accounts whose configured kind is `boat` receive disk retention
restarts. The active lifecycle checks the kind before a provider read or
resume. Deleted-org maintenance filters both disk lists with the same rule.
Restore keeps every workspace receiver and gives other provider kinds no
retention alarm. Unknown accounts remain pending without another provider call.
