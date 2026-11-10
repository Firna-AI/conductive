# Publication and old documents

This page belongs to the [import area](README.md).
It describes how a complete reservation becomes a workspace, how members read its old documents, and what a later activation can read.
[Imported workspaces](../../docs/protocol/imported-workspaces.md) and [Sessions from Conductor](../../docs/protocol/chat-and-events.md#sessions-from-conductor) state the requirements.

## Publication

- The Mac sends `complete` after it verified every part. `completeReservation` in [`publication.ts`](publication.ts) runs one guarded D1 batch.
- The guard requires the exact open reservation and its source fingerprint, a closed manifest, no unverified part, no cleanup request, and no admitted write. It also repeats the access and repository checks of each reservation write.
- The batch adds the section "Import from Conductor" at the top of the list when the org has none.
- It then adds the workspace and its runtime row with `importedWorkspaceStatements` of [`workspace-data.ts`](workspace-data.ts). In the same batch, it marks the reservation complete and clears the due time of its cleanup record.
- The workspace takes the ID of its reservation. Its owner is the importer. It gets the next number of its org from the existing trigger, it lists first in its section, and it starts in `inactive`.
- The old-document rows and the ordered parts came with the manifest, before the batch. No route shows them until the reservation is complete and its workspace exists.
- The batch creates no first message, session, turn, workspace token, cloud computer, or image lease.
- A repeated `complete` returns the same workspace ID. When the guard fails, nothing changes, and the control gets 409 `import_unavailable`.

## Old documents

- `conductorDocumentRoute` in [`routes.ts`](routes.ts) serves two `GET` routes. `route` in [`worker/routes.ts`](../routes.ts) tries it first, after the app request gate.
- `conductorOldDocumentsPath` gives one page of `ConductorOldDocuments`. Pass its `nextCursor` as `cursor` on the next request.
- `conductorOldDocumentPath` streams one old document as `text/markdown; charset=utf-8`, with `Cache-Control: no-store`.
- The metadata of a document is its ID, title, agent, message count, and day. It holds no native ID, path, memory object, or model.
- A page holds at most 64 documents, and its encoded reply stays below 1,000,000 bytes.
- The document path puts `i` before the encoded ID, so that an ID such as `.` or `..` stays one path segment.
- Each route needs a current sign-in session, membership of the org, and a workspace of that org. The document must belong to the complete reservation of that workspace.
- [`document-data.ts`](document-data.ts) reads the verified parts of the document in their order. The stream reads one part at a time, only when the reader asks for bytes, through `streamDocument` of the storage port.
- The route checks the member again before it reads each part, and again before it releases its bytes. A member who loses access gets no more bytes.
- The routes read no cloud computer and check no workspace state. So the old documents stay readable before the activation, while the workspace is stopped, after a failed activation, and after Archive.
- The old documents never enter the chat history, a session, or the events socket.

## Trusted activation reads

[`activation-data.ts`](activation-data.ts) gives three trusted calls with no route:

- `readPublishedImport(env, orgId, workspaceId)` returns the snapshot, the branch, the chosen repository, the importer, and the source ID of a published import.
- `readPublishedManifestPage(env, orgId, workspaceId, cursor)` returns the private manifest in pages, with the native session recipes and the exact prerequisites.
- `readPublishedPartRange(env, orgId, workspaceId, partId, range, signal)` reads one bounded range of one verified part.

They mint no bucket credential, and they check no access.
No call returns a result of `repository.lfs`, because the Worker stores none, as [Git LFS availability](reservations.md#git-lfs-availability) says.
Their caller owns these duties:

- Authorize the activation, the member, the owner, the image, and the current start before each read.
- Check the disk before the transfer. Combine the Git disk facts of the snapshot and its content byte totals with the actual free disk. Count each file reference, the filesystem allocation, the Git indexes, the LFS copies, and the room to stage the work. After the delivery, check the actual tree, pack, and LFS facts before any change to the checkout.
- Check each real destination on disk before each write, also the generated document and native session paths. Never follow an imported symlink.
- After a successful activation, save `activation_completed_at` with the guarded lifecycle write. Then call `cleanupImportWork`, as [Cleanup requests](cleanup.md#cleanup-requests) says.
- After a failed activation, call no cleanup.
