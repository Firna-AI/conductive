# Import storage

This page belongs to the [import area](README.md).
It describes the private storage of an import from Conductor: the storage port and its R2 adapter.
In the import flow, the Mac app uploads each part straight to the attachment bucket with a short-lived link from the Worker.
The Worker then checks and seals each part, reads sealed parts, streams old documents, and deletes the objects of a reservation.
[Import uploads](../../docs/protocol/access-and-security.md#import-uploads) and [The uploads](../../docs/protocol/desktop-import.md#the-uploads) state the requirements.

The port `ConductorImportStorage` has no R2 type, so another storage needs only a new adapter.
`createR2ImportStorage` implements the port on R2.
Three callers use it: the reservation service, the old-document route, and the trusted activation reads.
[Duties of the caller](#duties-of-the-caller) says what each of them owns.

## The port

One `ConductorImportStorage` value serves one reservation.
Its `ImportStorageScope` holds the `orgId` and the `reservationId`.
Each `ImportPart` has a `group`, an `id`, a `sizeBytes`, and a lowercase hexadecimal `sha256`.
The group is `work` for the stored work, or `document` for an old document.

| Method | What it does |
| --- | --- |
| `createUploadTarget(part)` | Returns a PUT target with its `url`, `headers`, `expiresAt` in Unix milliseconds, and `identity`. |
| `sealPart(identity)` | Checks the uploaded bytes and returns the `SealedImportPart`, or `null` when they are missing or do not match. |
| `readPart(sealed, { offset, length }, signal?)` | Returns the bytes of one range of a sealed part. |
| `streamDocument(parts)` | Returns a stream of the sealed parts of one old document, in the given order. |
| `deleteObjects(group?)` | Deletes the objects of this reservation, for one group or for both groups. |

## The R2 adapter

Call `createR2ImportStorage(env, scope, { maxPartBytes, maxReadBytes })` for one reservation.
It uses the existing optional binding `CHAT_ATTACHMENTS`, and it throws `not_configured` without it.
`createUploadTarget` also needs the public variable `CHAT_ATTACHMENTS_S3_BUCKET_URL` and the Worker secrets `CHAT_ATTACHMENTS_ACCESS_KEY_ID` and `CHAT_ATTACHMENTS_SECRET_ACCESS_KEY`.
Without these inputs, only that method throws `not_configured`, and attachments keep working.
The reservation service then answers 503 `import_storage_unavailable`.
The bucket URL must be the path-style HTTPS address in [Public variables](../../docs/deployment.md#public-variables).
[Upload links of an import](../../docs/deployment/attachment-bucket.md#upload-links-of-an-import) gives the setup of the three inputs.

- Each object key starts with the prefix of its org and reservation, then its group. An imported workspace takes the ID of its reservation, so its data stays under its own prefix.
- Each target is a PUT link to a new temporary key. Its signature covers the size, the SHA-256, and a create-only condition. The link expires after 300 seconds.
- The uploader sends the exact bytes with the returned headers and no other credential. The secret access key never leaves the Worker.
- `sealPart` reads the actual bytes of the temporary object and checks their size and SHA-256. It then writes a create-only sealed key. A repeat seal returns the same part.
- A link names only its own temporary key, so a stale link cannot change a sealed part. The temporary object stays until `deleteObjects`.
- `readPart` reads at most `maxReadBytes` in each call. `streamDocument` accepts only `document` parts, and it reads one whole part for each chunk that its consumer asks for.
- `maxPartBytes` limits each part. No limit applies to a whole package, document, Git bundle, or memory file, or to the number of parts.
- `deleteObjects('work')` keeps the old documents, which stay longer than the stored work, as [How long the app keeps import data](../../docs/protocol/access-and-security.md#how-long-the-app-keeps-import-data) says.

## Duties of the caller

The adapter checks no access and keeps no record. It trusts its scope.
Its callers own these duties:

- **Access:** `ImportReservationService` checks import access before each control, and each of its D1 writes repeats the check, as [Reservations](reservations.md#the-owner-of-a-reservation) says. The old-document route checks the member before each part. The trusted activation reads leave the access check to their lifecycle caller.
- **Records:** [`part-data.ts`](part-data.ts) stores each target identity and its expiry before the link goes out, and the verified mark of each part. The manifest tables keep the part order of each object and of each old document.
- **Completion:** [`publication.ts`](publication.ts) completes a reservation only when every declared part is sealed, as [The import](../../docs/protocol/conductor-import.md#the-import) says.
- **Expiry:** the reservation service gives a new target when a link expires. The reservation itself expires seven days after its creation, as [Stopped uploads](../../docs/protocol/conductor-import.md#stopped-uploads) says.
- **Cleanup:** only the owner of the reservation calls `deleteObjects`. A link from before the delete can still create its temporary object until its `expiresAt`. So the owner deletes again after the latest link expiry, and it keeps the reservation ID until then, as [Import cleanup](cleanup.md) says.
- **Limits:** each caller passes `IMPORT_PART_BYTES`, 1,000,000 bytes, as `maxPartBytes` and `maxReadBytes`. So one whole part fits in the memory of one Worker request.

## Live proof

Local R2 does not accept signed links, so the tests write each temporary object through the binding.
They check the fields and the signature of each link, but no test sends a PUT through one.
A real upload through a link needs a live bucket and its key pair.
So no test proves that live R2 enforces the expiry, the size, the SHA-256, or the create-only condition of a link.
