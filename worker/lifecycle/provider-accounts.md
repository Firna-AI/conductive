# Provider accounts

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code stores the provider account of each sandbox and
saved snapshot, and how it reaches the client of that account. The
[sandbox area](../sandbox/README.md#provider-accounts) owns the account
configuration and the lookup.

## Stored accounts

Each D1 record of a sandbox or a saved snapshot also stores its provider
account in `provider_account`. Each reader returns it as `providerAccount`.
Write the account with each sandbox ID or snapshot name. Compare a sandbox
or a snapshot by its account and its ID or name together, also in leases,
cleanup records, and image pins.

- A create takes the account of the published build of its org image.
  `settings` stores no account.
- A resume takes the account of the workspace record.
- A new build takes `DEFAULT_PROVIDER_ACCOUNT`, `boat`, from
  [`account-identity.ts`](../sandbox/account-identity.ts). Its job row keeps
  the account of the previous org image, which `BuildJob` reads as
  `previousProviderAccount`. The two can differ.
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
