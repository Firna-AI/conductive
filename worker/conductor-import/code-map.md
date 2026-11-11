# Import code map

These entry points belong to the [import area](README.md).
[Shared import contracts](../../src/shared/conductor-import.md) lists the portable types, parsers, and page helpers.

## Operations

- [broker-route.ts](broker-route.ts): `importBrokerRoute`, the operation route of the device broker.
- [broker.ts](broker.ts): `ImportBroker`, the operations of the paired Mac, their ACK order, their private fragments, and their public stream.
- [broker-events.ts](broker-events.ts): `applyImportEvent` checks each Mac event against its action and calls the reservation owner.
- [broker-socket.ts](broker-socket.ts): `sendImportFrame`, and `sendImportControl`, which splits a large `repository.prerequisites` result into acknowledged fragments. It sends each other result in one `import.ack`.
- [broker-types.ts](broker-types.ts): `ImportOperation`, the state of one operation.
- [scan-state.ts](scan-state.ts): `importScanState` adds the org state of each scan row.
- [public-values.ts](public-values.ts): `publicImportReservation` removes the source fingerprint for the page.

## Reservations

- [workspace.ts](workspace.ts): `ImportWorkspace` adds `conductorImportOperation`, `cleanupConductorImport`, and the import alarm to the workspace Durable Object.
- [runtime.ts](runtime.ts): `ImportRuntime` and `importServiceName` select and check the owner object of a reservation. `importServiceError` maps each failure to a safe code.
- [client.ts](client.ts): `callImportService` calls that owner.
- [service.ts](service.ts): `ImportReservationService` runs each control of one reservation in its serial queue.
- [access.ts](access.ts): `requireImportAccess`, the `importPermission` SQL rule, and `importRepository`, the match of a source to a chosen repository.
- [reservation-data.ts](reservation-data.ts): the reservation rows, the source slot, `IMPORT_RESERVATION_MS`, and `reservationWriteGuard`.
- [manifest-data.ts](manifest-data.ts) and [manifest-statements.ts](manifest-statements.ts): the snapshot, the manifest pages, and their normalized rows.
- [manifest-validation.ts](manifest-validation.ts): `closeManifest`, the checks of a complete manifest.
- [part-data.ts](part-data.ts): the part records, the stored targets, the missing-part pages, and the verified marks.
- [part-service.ts](part-service.ts): `importPartOperation` and `checkedMissingPart`, the target, seal, and retry steps.
- [target-data.ts](target-data.ts): `importTargetPage`, the older targets of one part.
- [repository-facts.ts](repository-facts.ts): `currentRepositoryFacts` and `verifyPrerequisites`, with the GitHub token of the importer. `importRepositoryContext` checks current access and the chosen repository, and gets that token.
- [repository-data.ts](repository-data.ts): the stored facts, the receipts, and the verified prerequisites.
- [lfs-availability.ts](lfs-availability.ts): `readLfsAvailability`, the `repository.lfs` control. It checks the facts, the access, and the repository around each GitHub read.
- [lfs-batch.ts](lfs-batch.ts): `readLfsBatch`, one fixed Batch request to GitHub, and the check of its reply. Download links and headers never leave it.

## Publication and old documents

- [publication.ts](publication.ts): `completeReservation`, the one guarded publication batch.
- [workspace-data.ts](workspace-data.ts): `importedWorkspaceStatements` and `insertVerifiedImportedWorkspace`, the trusted writer of an inactive imported workspace.
- [routes.ts](routes.ts): `conductorDocumentRoute`, the member list and the Markdown stream.
- [document-data.ts](document-data.ts): the metadata pages and the ordered parts of an old document.
- [activation-data.ts](activation-data.ts): `readPublishedImport`, `readPublishedManifestPage`, and `readPublishedPartRange`, the trusted activation reads.

## Cleanup

- [cleanup.ts](cleanup.ts): `cleanupImportWork`, `purgeOrgImports`, and `cleanupExpiredImports`.
- [cleanup-service.ts](cleanup-service.ts): `runImportCleanup`, one deletion step of the owner.
- [cleanup-data.ts](cleanup-data.ts): the cleanup record, its write marker, and the due records.
- [write-recovery.ts](write-recovery.ts): `recoverImportWrite` repeats an admitted seal after a restart.

## Storage

- [conductor-import-storage.ts](../../src/shared/conductor-import-storage.ts): `ConductorImportStorage`, the port, with its types and `ImportStorageError`.
- [r2-storage.ts](r2-storage.ts): `createR2ImportStorage`, the R2 adapter.
- [r2-signing.ts](r2-signing.ts): `signR2Upload` signs a short-lived PUT link for the S3 API of R2.
- [r2-bytes.ts](r2-bytes.ts): `readR2Part` reads an object and checks its actual size and SHA-256.
- [object-keys.ts](object-keys.ts) builds the object keys and checks each part and scope.
- [document-stream.ts](document-stream.ts): `documentStream` pulls the parts of one old document in order.
- [env.ts](../env.ts): `AppEnv` declares the bucket binding and the three signing inputs.

## Test support

- [storage.test-support.ts](storage.test-support.ts): `storageFixture` builds the adapter on local R2.
- [service.test-support.ts](service.test-support.ts): `importFixture` gives an org, an importer, a chosen repository, and calls of the real reservation owner.
- [manifest.test-support.ts](manifest.test-support.ts): a fixed snapshot, its manifest entries, and their bytes.
- [git-disk.test-support.ts](git-disk.test-support.ts): `invalidGitDiskSnapshots`, the snapshots with invalid Git disk facts that the parser must refuse.
- [member.test-support.ts](member.test-support.ts): `importReader` adds a second member who reads old documents.
- [lfs.test-support.ts](lfs.test-support.ts): `prepareLfs` reserves the source and reads its facts. It also gives the fixed Batch replies and the pairs of the LFS tests.
