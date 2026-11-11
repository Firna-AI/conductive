# Shared import contracts

These modules define the portable contracts of an import from Conductor.
The Worker and the browser import them now.
They also build in the NodeNext build of the Mac app, so the Mac app and the runner can import them directly, with no copy and no converter.
They belong to the [shared contracts](README.md).
The [import area](../../worker/conductor-import/README.md) gives the Worker side.

- Each module uses JSON values and plain TypeScript types. It imports no Cloudflare, Node, provider SDK, or R2 type.
- New relative imports end in `.ts`, so that the NodeNext build of the Mac app can rewrite them.
- Each `read*` function narrows an unknown value, and it throws `ImportContractError` for a value that does not fit. The Worker answers such a value with 400 `invalid_input`.

## The import origin and the Activate route

`conductor-import.ts` owns the optional `Workspace.conductorImport` origin.
It keeps the local Conductor ID, importer user ID, and nullable activation completion time.
Native workspaces omit it. `readWorkspaceImport` validates that field for each workspace reader.
An imported workspace starts in `inactive`, with no first message or session.
The same module owns the old-document metadata and the paths of the import routes.
The other `conductor-import-*.ts` modules own the device operations, the manifest, their parsers, and the page helpers.

`workspacePaths.activate` in `workspaces.ts` names the Activate route of an imported workspace.
Its reply is `ActivateWorkspaceResponse`: a `WorkspaceResponse` with `sessionId`, the real early session of the activator.
An activation shows its start with `WorkspaceStart.kind` `create`. A Resume of an activated import keeps `resume`.
[Import activation](../../worker/lifecycle/import-activation.md) gives its steps and failures.

## Modules

| Module | What it owns |
| --- | --- |
| [conductor-import.ts](conductor-import.ts) | The optional `Workspace.conductorImport` origin, `ConductorOldDocument`, `ConductorOldDocuments`, and the route builders `conductorImportOperationsPath`, `conductorOldDocumentsPath`, and `conductorOldDocumentPath` |
| [conductor-import-operation.ts](conductor-import-operation.ts) | Scan rows and row states, private and public reservations, page actions, Mac events, control results, public events, and the frames between the Worker and the Mac |
| [conductor-import-operation-read.ts](conductor-import-operation-read.ts) | `readImportAction`, `readImportScanRow`, `readImportDeviceFrame`, and `readImportDeviceEvent` |
| [conductor-import-control-read.ts](conductor-import-control-read.ts) | `readImportWorkerFrame`, for the Mac main process only |
| [conductor-import-lfs.ts](conductor-import-lfs.ts) | `ImportLfsObject`, the private `repository.lfs` request and result, their readers, and `importLfsPage`, as [Git LFS availability](#git-lfs-availability) says |
| [conductor-import-public-read.ts](conductor-import-public-read.ts) | `readImportPublicEvent`, for the desktop page |
| [conductor-import-documents-read.ts](conductor-import-documents-read.ts) | `readConductorOldDocuments`, for the pages of old-document metadata |
| [conductor-import-manifest.ts](conductor-import-manifest.ts) | `ImportSnapshot`, the manifest records, `ImportManifestPage`, and `importDocumentFile` |
| [conductor-import-manifest-read.ts](conductor-import-manifest-read.ts) | `readImportSnapshot`, `readImportManifestEntry`, and `readImportPart` |
| [conductor-import-git-disk-read.ts](conductor-import-git-disk-read.ts) | `readImportGitDisk`, the parser of the private Git disk facts of a snapshot |
| [conductor-import-pages.ts](conductor-import-pages.ts) | `importPage`, `importWire`, `importEncodedBytes`, and `IMPORT_PART_BYTES` |
| [conductor-import-values.ts](conductor-import-values.ts) | `ImportContractError`, and the checks of text, integers, hashes, OIDs, paths, branches, and repository names |
| [conductor-import-storage.ts](conductor-import-storage.ts) | The private storage port and its identities, as [Import storage](../../worker/conductor-import/storage.md) says |

## Public and private values

- The desktop page sends only an `ImportOperationRequest`: the device pairing and one action.
- `readImportPublicEvent` accepts status, scan rows with their states, progress, the two results, completion, done, failed, and errors. It refuses each other event kind, and it drops each field outside these shapes. So it never returns an upload link, a manifest, a native session recipe, or a repository proof.
- `readImportScanRow` keeps only the local ID, the name, the repository, the branch, the session count, and the upload size. It turns a GitHub remote into its lowercase full name. It gives `null` for another remote or a local path.
- `ImportWorkerFrame` holds the private frames for the Mac main process: `import.operation`, `import.ack`, `import.part`, `import.error`, and `import.cancel`. An `import.ack` carries the private `ImportControlResult`, such as an upload link.
- [device.ts](device.ts) adds the import frames to `WorkerToDevice` and `DeviceToWorker`. Its command and settings frames stay as they were.

## The manifest

- `ImportSnapshot` is version 1. It holds the source fingerprint, the local ID, the repository, the exact branch, the HEAD OID with its object format, and the nullable bundle object ID.
- It also holds the record, object, part, and session counts, and the stored and restored bytes of the content objects.
- Its required `gitDisk` holds private Git disk facts for the disk check before the transfer, as [Git disk facts](#git-disk-facts) says.
- OIDs are lowercase hexadecimal: 40 characters for `sha1`, and 64 for `sha256`. Each hash is a lowercase SHA-256.
- The records are `object`, `part`, `file`, `directory`, `symlink`, `delete`, `session`, and `prerequisite`.
- An object has the purpose `bundle`, `file`, `memory`, or `document`. Its encoding is `identity`, or `zstd` for a memory object. Its `restoredBytes` is its size after decoding.
- A part names its object, its index from 0, and its storage `ImportPart`. Work objects use the group `work`, and old documents use `document`.
- A file has the mode `100644` or `100755` and a content object. A directory record keeps an empty directory, also in `.context`.
- A symlink keeps its exact target text. No packing or restore follows it.
- A delete record is a tombstone. So a rename is a tombstone and a new record.
- A session record holds the old-document ID, title, agent, model, message count, and day. It also holds the native session ID, its restore path, its memory object, and its document object. No page and no public route gets it.
- A native restore path is relative to its restore root. It is never a path on the Mac.
- A prerequisite record names an exact OID and the ID of its server receipt.
- `importPath` refuses an absolute path, an empty, `.`, or `..` segment, and a `.git` segment.
- `importDocumentFile(id)` gives the safe path of an old document under `.context/conductor/`.

## Git disk facts

- `ImportGitDiskFacts` is version 1. The Mac app must take it from the same staging state as the rest of the snapshot, and the source fingerprint must cover it.
- `treeOid` is the tree of the snapshot HEAD, in the object format of the snapshot.
- `reconstruction` holds `objectCount`, `inflatedBytes`, and `maxObjectBytes` of the object set that the bundle rebuilds, with any external thin-pack bases that it appends. Each is 0 without a bundle.
- `checkout` holds `fileCount`, `fileBytes`, `directoryCount`, `symlinkCount`, `symlinkBytes`, and `pathBytes` of the full target tree. Each path counts, also when paths share one blob. The repository root itself does not count.
- `lfs` holds `cacheObjectCount` and `cacheBytes` of the distinct Git LFS payloads, and `checkoutPathCount` and `checkoutBytes` of their paths in the worktree. These bytes come in addition to the pointer blobs in `checkout.fileBytes`.
- `inflatedBytes` counts the canonical content sizes of the Git objects. It is not the compressed size of the bundle, the disk use of the source `.git`, or the final allocation on the target disk.
- `readImportGitDisk` requires nonnegative safe integers, the object format of the snapshot, and counts and sizes that agree with each other. It adds no total limit and no safety factor.
- The stored and restored bytes of the content objects keep their meaning. The Git disk facts do not change them.

## Git LFS availability

- `ImportLfsObject` holds the `oid` of a Git LFS object and its `sizeBytes`. The `oid` is always a lowercase SHA-256, also in a repository with SHA-1 Git objects. The size is a nonnegative safe integer.
- The private `repository.lfs` event of the Mac holds the reservation ID, the facts ID, and one page of pairs. The private result holds the facts ID and the same pairs, in `available` and `missing`.
- `readImportLfsRequest` merges two equal pairs, and it refuses two sizes for one OID. `readImportLfsResult` refuses an OID that shows twice. Both keep only these fields.
- `readImportDeviceEvent` and `readImportWorkerFrame` use these readers. No public event holds a pair.
- [Git LFS availability](../../worker/conductor-import/reservations.md#git-lfs-availability) gives what the Worker reads and what `available` means.

## Pages and limits

- `DEVICE_FRAME_LIMIT_BYTES` in `device.ts` is 1,000,000. Each encoded frame stays strictly below it, and `importWire` throws for a larger one.
- `importPage(values, envelope)` returns the longest first slice of a list whose complete encoded envelope fits. It counts the JSON escaping. Call it again for the rest of the list.
- `importLfsPage(objects, context)` returns the longest first slice of pairs whose complete `import.frame` request and largest possible `import.ack` both fit. The context gives the operation ID, the sequence, the reservation ID, and the facts ID.
- `IMPORT_PART_BYTES` is 1,000,000 decoded bytes. Split a larger object into more parts.
- No limit applies to a whole package, an old document, a session file, or the number of parts.
