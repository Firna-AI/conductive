# Reservations

This page belongs to the [import area](README.md).
It describes the reservation of one imported workspace, from the first control of the Mac to a complete inventory of checked parts.
[The import](../../docs/protocol/conductor-import.md#the-import) and [Stopped uploads](../../docs/protocol/conductor-import.md#stopped-uploads) state the requirements.

## The owner of a reservation

- Each reservation has its own Durable Object of the `Workspace` class, named `importServiceName(reservationId)` through the existing `WORKSPACES` binding. `callImportService` in [`client.ts`](client.ts) calls its `conductorImportOperation` RPC.
- `ImportRuntime` in [`runtime.ts`](runtime.ts) first checks that the name maps to its own object ID, and that the saved scope of the object holds the same org and reservation. A mismatch gets 403 `import_forbidden`.
- `ImportReservationService` in [`service.ts`](service.ts) runs each control, each seal, and each deletion of the reservation in one serial queue.
- Each control checks import access, the reservation, its importer, its state, its expiry, and its chosen repository before it acts. It checks import access again before it answers.
- Each D1 write repeats these checks in its own SQL guard, `reservationWriteGuard` of [`reservation-data.ts`](reservation-data.ts). So an earlier read never admits a later write.
- The chosen repository must stay selected in the org, and its GitHub installation must not be suspended.
- Each failure has a safe code: 403 `import_forbidden`, 409 `import_unavailable`, 409 `import_expired`, 400 `invalid_input`, or 503 `import_storage_unavailable`. A GitHub failure keeps its existing GitHub code, such as 502 `github_unavailable`. `importServiceError` gives each other failure 502 `import_failed`.

## The reservation and its source slot

- The Mac sends `reserve` with the selected `ImportScanRow`. The row needs a branch and a GitHub repository that the org chose.
- `createReservation` saves the org, the importer, the chosen repository, the local Conductor ID, the name, the branch, the creation time, and the expiry.
- The expiry is the creation time plus `IMPORT_RESERVATION_MS`, 604,800,000 ms. A new upload link never extends it.
- One source slot exists for each org and local Conductor ID. A unique index lets only one reservation of that source be open or complete.
- A repeated `reserve` of the same importer returns the open reservation of that source. Another member gets 409 `import_unavailable`.
- At its expiry, the slot is free again. The next `reserve` of that source, the alarm of the reservation, or the Cron marks the old reservation expired, and its data gets full cleanup.
- No reservation starts for a source that the org already imported.
- The Mac gets the private `ImportReservation`, with the source fingerprint. The page gets the public form without it.

## The manifest

- The Mac sends one `snapshot`, then numbered `manifest` pages, then `manifest.end`. [The manifest](../../src/shared/conductor-import.md#the-manifest) gives each record.
- The snapshot fixes the source fingerprint, the exact branch and HEAD, the bundle object, the expected counts and byte totals, and the private Git disk facts. It must match the local ID, the branch, and the repository of the reservation.
- A second snapshot can only repeat the first one exactly.
- Each page `offset` counts the records of all earlier pages. An exact repeat of a stored page changes nothing. A changed page, a gap, or a page after `manifest.end` fails.
- [`manifest-data.ts`](manifest-data.ts) writes each page in one D1 batch with the statements of [`manifest-statements.ts`](manifest-statements.ts). It keeps the order of every record, and it fills normalized rows of objects, parts, and old documents.
- A unique index refuses two records with one path. The shared parser refuses an absolute path, an empty, `.`, or `..` segment, and a `.git` segment.
- `closeManifest` in [`manifest-validation.ts`](manifest-validation.ts) closes the manifest only when the record, object, part, and session counts and the byte totals match the snapshot.
- Each object must have contiguous parts from index 0 that sum to its size. A document uses the `document` group, and each other object uses `work`.
- `closeManifest` also refuses a part over 1,000,000 bytes, a file record without its file object, and a session without its document and memory objects. It refuses a write below a declared file or symlink, an identity object whose two sizes differ, and a prerequisite without a matching receipt.
- A snapshot with a bundle must declare exactly that bundle object. A snapshot without a bundle must name its HEAD as a verified prerequisite.
- `manifestPage` reads the manifest back in bounded pages, in the stored order.

## Upload links and checks

- After `manifest.end`, the Mac asks for a `target` for each declared part that is not verified.
- [`part-data.ts`](part-data.ts) saves each upload identity and its expiry before the Worker sends the link. It also moves the latest link expiry of the [cleanup record](cleanup.md#the-cleanup-record) forward.
- Every issued identity stays in its own row. A new link for the same part keeps the older ones.
- After a PUT, the Mac sends `verify`. [`part-service.ts`](part-service.ts) seals the latest stored identity of the part through `sealPart`. When that upload is missing, it tries the older identities of the part, in pages of [`target-data.ts`](target-data.ts).
- Only an actual size and SHA-256 match marks a part verified. `storedBytes` is the sum of the verified parts. In-flight bytes that the Mac reports never count.
- Each seal runs in the serial queue, with a durable write marker, as [Writes and cleanup](cleanup.md#writes-and-cleanup) says.

## Explicit retry

- A retry operation names the reservation and its local ID. With an unchanged source, the Mac pages through `missing` from cursor 0.
- Each `missing` page inspects at most one unverified part. It first tries to seal a stored upload of that part, and it returns the part only when no upload matches.
- A page can have an empty part list and a non-null cursor. The Mac follows the cursor.
- The Mac uploads and verifies only the parts that the pages return. Nothing restarts an upload by itself.

## A changed source

- For a changed source, the Mac sends `reserve` with `replace`: the old reservation ID and the old fingerprint. The old fingerprint is null when no snapshot was stored.
- One D1 batch marks the old reservation superseded, creates the new reservation with an empty inventory, and requests full cleanup of the old one.
- A wrong ID or a wrong fingerprint changes nothing, and the control fails.
- The new reservation has a new ID. No part, receipt, or completion of the old reservation enters it.

## Current GitHub facts

- The Mac sends `repository.facts` for its reservation. [`repository-facts.ts`](repository-facts.ts) reads the chosen repository from GitHub with `freshGitHubUserToken` of the stored importer.
- The private reply holds the GitHub repository ID, its full name, the head of the selected branch, the default branch and its head, an observation time, and a facts ID. It holds no token and no raw GitHub body.
- The Mac then sends `repository.prerequisites` with the facts ID, the exact source HEAD, the source fingerprint, and the candidate OIDs.
- A candidate is verified only when one of the captured heads contains it. A moved head, another repository, or a GitHub failure establishes nothing.
- Each comparison that GitHub returns must have the captured head as its base and the requested candidate as its head. Otherwise the request fails, and it stores no receipt.
- [`repository-data.ts`](repository-data.ts) keeps the facts, the receipt, and each verified pair with the reservation. The manifest names each prerequisite with its receipt ID, and `closeManifest` checks the receipt against the source and its HEAD.
- The Mac needs no Conductor login and no Git credential of its own for this check. A later activation must still check each prerequisite against GitHub at that time.

### Git LFS availability

- After `repository.facts`, the Mac can send `repository.lfs` with the facts ID and one page of `ImportLfsObject` pairs. Each pair is the SHA-256 `oid` of an LFS object and its `sizeBytes`.
- `readLfsAvailability` in [`lfs-availability.ts`](lfs-availability.ts) needs facts of the same reservation and branch. Before each GitHub read, after it, and before the answer, it checks current access, the open reservation, and the repository ID and name of the facts.
- `readLfsBatch` in [`lfs-batch.ts`](lfs-batch.ts) posts a `download` request to the Git LFS Batch API of the chosen repository on `github.com`. It sends `freshGitHubUserToken` of the stored importer as a Basic Git credential.
- It builds the address only from the stored name of the chosen repository, never from a value of the Mac or the source. It follows no redirect, and it needs HTTP 200.
- A valid download action for the exact OID and size puts the pair in `available`. A 404 or 410 error for the exact pair puts it in `missing`. Each list keeps the order of the request.
- `available` means that GitHub advertises the object now. It is not a download, and it checks no bytes.
- Each other reply fails the whole control with 502 `github_unavailable`, with no partial lists. Examples are an authentication, rate-limit, network, or redirect failure, and an unexpected, duplicate, mismatched, or invalid object. The reservation stays for an explicit retry.
- The Worker drops each download link, header, and expiry, and it sends no download request. The reply holds only the facts ID and the pairs. The Worker stores none of them, and it writes no receipt.
- This read takes no part in the commit receipts or in their base and head checks. The Mac must finish its classification and its source fingerprint before it sends `repository.prerequisites`.
