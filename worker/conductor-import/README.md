# Import from Conductor backend

This area holds the Worker side of an import from Conductor.
The Mac app reads local Conductor workspaces, and the Worker relays their list to the page of the same Mac app.
For each workspace that the person imports, the Worker keeps a durable reservation and checks each uploaded part.
It then publishes the workspace with no cloud computer, and members read the old documents of its sessions through the Worker.
[Import from Conductor](../../docs/protocol/conductor-import.md), [Import on the Mac](../../docs/protocol/desktop-import.md), [Imported workspaces](../../docs/protocol/imported-workspaces.md), and [Import uploads](../../docs/protocol/access-and-security.md#import-uploads) state the requirements.

## Responsibilities

- Relay each import operation between one desktop page and its paired Mac, as [Import operations](operations.md) says.
- Keep one reservation for each imported workspace, with its source slot, its seven-day expiry, its manifest, and its upload links, as [Reservations](reservations.md) says.
- Read the current GitHub facts of the chosen repository for the Mac, with the token of the importer on the Worker.
- Publish the workspace only after each part is stored and checked, as [Publication and old documents](publication.md) says.
- Serve the old documents to the members of the org, in every state of the workspace.
- Give a later activation its trusted reads and its work-only cleanup.
- Delete the stored data of each reservation, also after a late upload and after the org is gone, as [Import cleanup](cleanup.md) says.
- Keep each byte of the bucket behind one storage port, as [Import storage](storage.md) says.

## Integration points

- **Operation route:** `POST` of `conductorImportOperationsPath(orgId)` on the app hostname. The device broker serves it, because it needs the paired Mac connection, as [Mac device commands](../devices/README.md#import-operations) says.
- **Old-document routes:** `GET` of `conductorOldDocumentsPath` and of `conductorOldDocumentPath`. `route` in [`worker/routes.ts`](../routes.ts) tries `conductorDocumentRoute` first, after the app request gate.
- **Reservation owner:** each reservation has its own Durable Object of the `Workspace` class, named `importServiceName(reservationId)`, through the existing `WORKSPACES` binding. `ImportWorkspace` in [`workspace.ts`](workspace.ts) adds its RPC methods and its alarm to that class. `Workspace.alarm` runs the import alarm first.
- **Record writer:** [`workspace-data.ts`](workspace-data.ts) gives the statements of the inactive workspace record. Publication runs them in its own guarded batch.
- **Activation:** a later activation reads the published import through [`activation-data.ts`](activation-data.ts). After a successful activation, it calls `cleanupImportWork` of [`cleanup.ts`](cleanup.ts). [Trusted activation reads](publication.md#trusted-activation-reads) gives the duties of that caller.
- **Members cleanup:** `cleanupDeletedOrgs` of the [members backend](../members/README.md) calls `cleanupExpiredImports` at the start of each Cron run. It calls `purgeOrgImports` before it purges the records of a deleted org.
- **Contracts:** the [shared import contracts](../../src/shared/conductor-import.md) define each request, frame, event, manifest record, and page helper.

The native create, the attachments, the Mac commands, and the settings relays keep their routes and their behaviour.

## Development

Run `npm run test -- worker/conductor-import` from the repository root with Node 24.
The tests use local D1, native SQLite Durable Objects, and the local R2 bucket of the [test harness](../test-support/README.md), with a fixed clock and fixed IDs.
`broker.test.ts` and `broker-http.test.ts` run the real Worker entry with an authenticated Mac socket.
`repository-facts.test.ts` uses the fake GitHub of the harness.
Local R2 does not accept signed links, so no test sends a PUT through one, as [Live proof](storage.md#live-proof) says.

### Key Code

The [import code map](code-map.md) lists each entry point of this area.

- [service.ts](service.ts): `ImportReservationService`, the serial owner of one reservation.
- [broker.ts](broker.ts): `ImportBroker`, the import operations on the paired Mac socket.
- [publication.ts](publication.ts): `completeReservation`, the guarded publication batch.
- [routes.ts](routes.ts): `conductorDocumentRoute`, the member routes of old documents.
- [cleanup.ts](cleanup.ts): the cleanup entry points of the activation, the org purge, and the Cron.
- [r2-storage.ts](r2-storage.ts): `createR2ImportStorage`, the R2 adapter of the storage port.

### Related Docs

- [Import from Conductor](../../docs/protocol/conductor-import.md)
- [Import on the Mac](../../docs/protocol/desktop-import.md)
- [Imported workspaces](../../docs/protocol/imported-workspaces.md)
- [Access and security](../../docs/protocol/access-and-security.md#import-uploads)
- [Shared import contracts](../../src/shared/conductor-import.md)
- [Worker backend](../README.md)
