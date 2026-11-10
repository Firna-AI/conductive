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
- A new build takes the account that trusted code names, by default
  `DEFAULT_PROVIDER_ACCOUNT`, `boat`, from
  [`account-identity.ts`](../sandbox/account-identity.ts). Its job row keeps
  the account of the previous org image, which `BuildJob` reads as
  `previousProviderAccount`. A new build starts from the image of its own
  account, so the two can differ only in an older saved job.
- A saved start job keeps its account. `readStartJob` reads an older job
  without one as `DEFAULT_PROVIDER_ACCOUNT`.
- A Continue job takes the account of the workspace record when Continue
  is admitted. `readContinueJob` reads an older job without one as
  `DEFAULT_PROVIDER_ACCOUNT`.

## Routing

Each provider call gets the client of the account that its record or job
stores, through `providerForAccount` or `orgProviderForAccount` in
[`client.ts`](../sandbox/client.ts). No call falls back to another account.

- Workspace actions, disk retention, input activity, archive, and
  suspension stops use the account of the workspace record.
- Continue uses the account of its saved job for the deadline, each
  command, each poll, the read of the branch, and the status read of its
  fetch grant, as [Continue](continue.md#phases) says. Its resume and its
  check of local work use the account of the workspace record, as a resume
  and Archive do. Each phase checks that the workspace record still names
  the saved account and sandbox.
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

## Org images

`org_images` holds one org image for each org and provider account: the
image name, its build, the last refresh, the last and the pending push
refresh, and the next refresh deadline. `settings` keeps the scripts, the env
vars, and the revision, which all accounts of the org share.

- [`org-image-data.ts`](org-image-data.ts) gives `OrgImage`, `readOrgImage`,
  and `imageIsPublished`.
  [`org-image-refresh-data.ts`](org-image-refresh-data.ts) holds the push
  refresh queries of one account.
- Trusted internal code names the account. The image readers, and the
  starts of creates, builds, and refreshes, take an account argument that
  defaults to `DEFAULT_PROVIDER_ACCOUNT`. No code picks the newest image
  across accounts. No HTTP reply or browser screen names an account.
- An image is published when its record names a succeeded build of the
  same account with the same snapshot name. `publishBuild` writes only the
  record of the account of its build.
- The push refresh limit, the pending push refresh, and the daily deadline
  belong to the record of one account. The Cron repair advances the record
  of the default account.
- Build cleanup keeps an old snapshot while any `org_images` record names
  the same account and name, and while a lease holds it.
- One org still runs one build at a time, with one image coordinator. The
  coordinator reads an older saved state without an account as `boat`.
