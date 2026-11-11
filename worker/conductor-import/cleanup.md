# Import cleanup

This page belongs to the [import area](README.md).
It describes how the Worker deletes the stored data of a reservation, and why no late write can bring that data back.
[How long the app keeps import data](../../docs/protocol/access-and-security.md#how-long-the-app-keeps-import-data) states the requirements.

## The cleanup record

- Each reservation gets one cleanup record when it starts. The record has no foreign key, so it stays after the reservation row and after the org rows.
- Its group is `none` while the reservation can still take writes. It is `work` for the stored work only, or `all` for the stored work and the old documents.
- Its due time starts at the expiry of the reservation. Publication clears that due time, so a published workspace keeps its data.
- It keeps the latest expiry of every upload link that the Worker issued, also after a new link for the same part.
- [`cleanup-data.ts`](cleanup-data.ts) owns its reads and writes.

## Cleanup requests

| Request | Caller | Group |
| --- | --- | --- |
| Expiry | The alarm of the reservation object, the next `reserve` of the same source, or the Cron | `all` |
| A changed source | The `reserve` with `replace` | `all`, for the old reservation |
| A successful activation | `cleanupImportWork(env, orgId, workspaceId)` | `work` |
| Org purge | `purgeOrgImports(env, orgId, renew)` | `all` |

- `cleanupImportWork` in [`cleanup.ts`](cleanup.ts) acts only when the workspace has its `activation_completed_at`. It keeps every old document and its metadata.
- A request for `all` widens an earlier `work` request.
- Archive starts no import cleanup. The data of an archived workspace stays until the app deletes the workspace.
- Each request enters the owner of the reservation, through `cleanupConductorImport` of its Durable Object. No caller deletes a prefix of the bucket itself.

## Writes and cleanup

- A seal writes a sealed key in the bucket. So each seal first saves its exact upload identity in the cleanup record, with `beginImportWrite`. The record admits a write only while its group is `none` and no other write is open.
- A cleanup request changes the group at once, before it waits for the queue. So no new seal can start after the request.
- The deletion runs in the same serial queue as the seals, after them. While a write marker remains, the cleanup waits and tries again after 30 seconds.
- A lost reply of the bucket during a seal leaves the marker. The next use of the reservation object first repeats that exact seal with `recoverImportWrite` of [`write-recovery.ts`](write-recovery.ts), and only then clears the marker.
- So no deletion finishes while an admitted seal can still write.

## Deletion

- `runImportCleanup` in [`cleanup-service.ts`](cleanup-service.ts) deletes the objects of the group through `deleteObjects` of the storage port.
- When the latest link expiry is still in the future, the record keeps its owner. The object alarm deletes again at or after that expiry, so a late PUT through an old link leaves no object.
- The record finishes only after a deletion at or after the latest link expiry. Then the row of an expired, superseded, or deleted reservation goes, with its child rows.
- A published workspace keeps its reservation row after a `work` cleanup, so its old documents stay readable.
- A failed deletion keeps the record due. The object alarm tries again after 30 seconds.

## The Cron and the org purge

- `cleanupDeletedOrgs` of the [members backend](../members/README.md) first calls `cleanupExpiredImports` of [`cleanup.ts`](cleanup.ts). It sends each due record to its owner, in pages of 32.
- A record whose org is gone is due too, also a finished `work` record. Its owner then deletes both groups.
- `purgeOrgImports` runs after the attachment purge and before the purge of the org records. A cleanup that is still pending leaves the org pending for a retry.
- No cleanup depends on an open page, a connection of the Mac, or a timer in memory.
