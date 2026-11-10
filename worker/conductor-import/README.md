# Conductor import storage

This area holds the private storage of an import from Conductor.
In the import flow, the Mac app uploads each part straight to the attachment bucket with a short-lived link from the Worker.
The Worker then checks and seals each part, reads sealed parts, streams old documents, and deletes the objects of a reservation.
[Import uploads](../../docs/protocol/access-and-security.md#import-uploads) and [The uploads](../../docs/protocol/desktop-import.md#the-uploads) state the requirements.

The port `ConductorImportStorage` has no R2 type, so another storage needs only a new adapter.
`createR2ImportStorage` implements the port on R2.
No route, record, or other product code calls the port yet.

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
The bucket URL must be the path-style HTTPS address in [Public variables](../../docs/deployment.md#public-variables).
[Upload links of an import](../../docs/deployment/attachment-bucket.md#upload-links-of-an-import) gives the setup of the three inputs.

- Each target is a PUT link to a new temporary key. Its signature covers the size, the SHA-256, and a create-only condition. The link expires after 300 seconds.
- The uploader sends the exact bytes with the returned headers and no other credential. The secret access key never leaves the Worker.
- `sealPart` reads the actual bytes of the temporary object and checks their size and SHA-256. It then writes a create-only sealed key. A repeat seal returns the same part.
- A link names only its own temporary key, so a stale link cannot change a sealed part. The temporary object stays until `deleteObjects`.
- `readPart` reads at most `maxReadBytes` in each call. `streamDocument` accepts only `document` parts, and it reads one whole part for each chunk that its consumer asks for.
- `maxPartBytes` limits each part. No limit applies to a whole package, document, Git bundle, or memory file, or to the number of parts.
- `deleteObjects('work')` keeps the old documents, which stay longer than the stored work, as [How long the app keeps import data](../../docs/protocol/access-and-security.md#how-long-the-app-keeps-import-data) says.

## Duties of the caller

The adapter checks no access and keeps no record.
The caller owns these duties:

- **Access:** check access before each call, as [Import uploads](../../docs/protocol/access-and-security.md#import-uploads) says. The adapter trusts its scope.
- **Records:** store each target identity, each sealed part, and the part order of each old document. Later calls need them.
- **Completion:** track when every part of a reservation is sealed, and only then complete it, as [The import](../../docs/protocol/conductor-import.md#the-import) says.
- **Expiry:** give a new target when a link expires. Expire the reservation itself, as [Stopped uploads](../../docs/protocol/conductor-import.md#stopped-uploads) says.
- **Cleanup:** call `deleteObjects` when the data must go. A link from before the delete can still create its temporary object until its `expiresAt`. So delete again after that time, and keep the reservation ID until then.
- **Limits:** choose `maxPartBytes` and `maxReadBytes` so that one whole part fits in the memory of one Worker request.

## Development

Run `npm run test -- worker/conductor-import` from the repository root with Node 24.
The tests use the local R2 bucket of the [test harness](../test-support/README.md), a fixed clock, and fixed upload IDs.
Local R2 does not accept signed links, so the fixture writes each temporary object through the binding.
The tests check the fields and the signature of each link, but no test sends a PUT through one.
A real upload through a link needs a live bucket and its key pair.

### Key Code

- [conductor-import-storage.ts](../../src/shared/conductor-import-storage.ts): `ConductorImportStorage`, the port, with its types and `ImportStorageError`.
- [r2-storage.ts](r2-storage.ts): `createR2ImportStorage`, the R2 adapter.
- [r2-signing.ts](r2-signing.ts): `signR2Upload` signs a short-lived PUT link for the S3 API of R2.
- [r2-bytes.ts](r2-bytes.ts): `readR2Part` reads an object and checks its actual size and SHA-256.
- [object-keys.ts](object-keys.ts) builds the object keys and checks each part and scope.
- [document-stream.ts](document-stream.ts): `documentStream` pulls the parts of one old document in order.
- [storage.test-support.ts](storage.test-support.ts): `storageFixture` builds the adapter on local R2.
- [env.ts](../env.ts): `AppEnv` declares the bucket binding and the three signing inputs.

### Related Docs

- [Import from Conductor](../../docs/protocol/conductor-import.md)
- [Worker backend](../README.md)
