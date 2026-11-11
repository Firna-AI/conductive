# Import from Conductor in the Mac app

This area holds the main-process side of an import from Conductor.
It lists the Conductor workspaces of this Mac that are not archived.
It uploads the workspaces that the person selects.
[Import on the Mac](../../../docs/protocol/desktop-import.md) and [Import from Conductor](../../../docs/protocol/conductor-import.md) state the requirements.
The [import area](../../../worker/conductor-import/README.md) of the Worker relays each operation and keeps the reservations.
The [import offer bar](../../../src/shell/import/ImportOfferBar.tsx) and the [import page](../../../src/shell/import/ConductorImportScreen.tsx) of the app start each operation through the Worker, with [runImportOperation](../../../src/app/import/import-operation.ts).
The [desktop README](../../README.md) gives the package, the window, and the device commands.

## Consent and operations

- The consent and the dismissal of the import offer belong to this Mac, not to an account. The app saves them in its private user-data directory, apart from the command permissions of each account.
- Before consent, the Mac reads only whether the Conductor database exists.
- A scan shows a native alert until the person allows the read on this Mac. Allow saves the consent on this Mac.
- Don't Allow reads no Conductor data and ends the scan with `consent_required`. A later scan asks again.
- An upload or a retry without consent fails with `consent_required` and shows no alert.
- A dismissal hides only the offer. It does not change the consent.
- The alert runs in the main process, so the renderer still has no preload script or IPC bridge.
- Each device connection gets its own import controller. It uses the [shared import contracts](../../../src/shared/conductor-import.md) directly.
- `status` and `dismiss` send the status, then `done`. `scan` sends pages of scan rows, then `done`.
- For an empty scan, the page gets `done` with no scan page.
- `upload` names one local Conductor ID, and `retry` also names its reservation. The page gets the reservation progress before the packing starts.
- The public `complete` event names the published workspace, but it does not end the operation. Pages of `result.files` and `result.sessions` follow, then `done`.
- All import operations of one device connection take turns. A turn lasts from one import frame to its matching `import.ack`, with the `import.part.ack` replies of a split result inside it.
- Each encoded frame stays below the device frame limit, counted in UTF-8 bytes.
- The socket writes an import frame only after its earlier writes flush, so pending native replies go first. Commands, settings, and heartbeats keep their own handlers and sends.
- A cancelled operation leaves the turn queue and drops its unsent frame.
- Sleep, sign-out, cookie replacement, connection loss, and app exit stop the import work of the connection. No import starts again by itself.

## The scan

- The main process runs its database, Git, file, and session-file work as jobs, each in its own worker thread. A cancellation also stops the Git process groups of the job.
- App exit cancels each job and waits until its worker thread and Git process groups stop.
- Each job except the existence check resolves the trusted home and user-data folders once, at its start. Every path below them keeps the no-follow checks.
- The worker opens the live Conductor database in read-only mode and never copies it. The read leaves the database and its write-ahead log unchanged.
- Each read takes only the allowed columns of `workspaces`, `repos`, and `sessions`, in one short transaction. These columns give the local Conductor ID and the native session IDs.
- No read touches a message table, a script, an env value, or a credential store.
- A scan estimates each upload size from metadata only. It builds no bundle and decodes no session file.
- A workspace that the scan cannot measure still appears in the list, with no upload size.
- Each acting Git command keeps fixed private settings: no global or system config, hook, file monitor, prompt, or lazy fetch.
- For each repository, one read-only config query reads only the effective `core.excludesFile` path, as data. The untracked list follows that file, as Git resolves it, and the repository's own ignore rules.
- A folder that Git lists as one candidate, such as an untracked or newly staged nested repository, imports as its working files. They omit `.git` data and follow the outer ignore rules and the nested repository's own rules.
- Ignore rules never drop the `.context` folder.
- Tracked worktree comparisons run in a private repository with its own index, so no filter from the source config runs.

## The upload

- An upload first copies the source into a private stage under the user-data directory. The copy fails with `source_changed` when the source changes during the copy.
- The package comes only from the stage. It keeps the working bytes, the exact HEAD and branch, the Git file modes, and each deleted path.
- It keeps each symbolic link as a link, and each folder of `.context`, also an empty one.
- A changed or untracked file over 100 MiB stays on the Mac, also in `.context`. The result frames list each such file.
- An unchanged Git LFS file that GitHub holds comes from GitHub at the activation. The bytes of a changed or local-only Git LFS file upload as an ordinary working file.
- The bundle, the memory files, and the old documents always upload in full.
- The bundle leaves out the commits that the current GitHub heads hold. A Worker receipt for this source proves each commit that the bundle needs from GitHub.
- The Mac never uses its remote-tracking refs as proof.
- Each stage belongs to one account, org, and reservation. It keeps the snapshot, the Git disk facts, the manifest, the parts, and the source fingerprint.
- A retry reuses its sealed stage when the source is unchanged and each staged part still matches its record. It then uploads only the parts that the Worker reports as missing.
- Otherwise a retry replaces the reservation, as [A changed source](../../../worker/conductor-import/reservations.md#a-changed-source) says, and uploads a new package.
- Each part goes in one HTTPS PUT to the exact link, with exactly the headers that the Worker issues. The PUT adds no cookie or ambient credential and follows no redirect.
- The Mac asks for a new link when a link expires. After each PUT, the Worker verifies the part.
- No upload link and no stage path reaches the renderer.

## Old documents

- Each staged session file becomes one Markdown old document. The converter streams the file and decodes a zstd file as it reads.
- The document keeps the messages, the answers of the agent, and one short line for each tool step.
- It leaves out thinking text, signatures, provider metadata, and tool output.
- A Claude document follows only the main chain of the session. A Codex document skips the event copies of each message.
- Each memory file uploads with its original bytes, and the Mac never rewrites it. A zstd file keeps a `.jsonl` restore path and records its decoded size.
- A session without a memory file does not import, and the result frames give its title.

## Development

Run these focused checks from the repository root with Node 24:

```sh
npm --prefix desktop run test:logic -- src/import
npm --prefix desktop run test:electron -- tests/import.spec.ts
```

The import code takes raw home and user-data folders as inputs, and the tests pass temporary folders. A test that calls the code below the worker builds its locations with `ImportLocations.create`.
Build the desktop app before the Electron check, with the build command in [Development](../../README.md#development).
The [import Electron test](../../tests/import.spec.ts) runs the compiled import code in Electron, with the real device session and worker thread.
It uses a fixture source, an automatic consent answer, and local stand-ins for the Worker and the bucket.
It stops an upload with its connection, and an explicit retry on the next connection reuses the same package.
The native alert, a scan of real Conductor data, and a real upload also need a Mac smoke check.

The package keeps this code outside the ASAR archive, as [Checks and packages](../../README.md#checks-and-packages) says.

### Key Code

- [Main process](../main.ts) shows the native consent alert.
- [Device composition](../device/main.ts) creates the import preferences and the job runner. App exit waits for the active import jobs.
- [Device session factory](../device/session-factory.ts) gives each device connection a new import controller.
- [Device session](../device/session.ts) passes import frames to its import controller and disposes the controller with the session.
- [Device messages](../device/messages.ts) read each import frame with the shared reader.
- [Device writes](../device/write-queue.ts) admit one import frame after the earlier socket writes flush, and keep the native sends apart.
- [Import controller](controller.ts) runs the import operations of one device connection. [Import channel](channel.ts) sends the frames of one operation in order.
- [Import scheduler](scheduler.ts) gives all import operations of one controller a shared turn.
- [Import preferences](preferences.ts) keep the consent and the offer dismissal of this Mac.
- [Import job runner](worker-client.ts) runs each job in the [import worker](worker.ts) thread and stops its Git process groups at cancellation and app exit.
- [Trusted locations](locations.ts) give the resolved home and user-data folders. Only `ImportLocations.create` builds them, so raw locations do not fit the import code.
- [Conductor source](source.ts) reads the allowed database columns. [Scan](scan.ts) builds each row and its size estimate.
- [Inventory](inventory.ts) lists the changed, deleted, untracked, and `.context` paths and the memory files of one workspace.
- [Source walk](source-walk.ts) walks a candidate or `.context` without following links, with an explicit ignore policy. [Candidate paths](candidate-paths.ts) expand each folder candidate on disk and apply the outer and nested ignore rules.
- [Safe files](safe-files.ts) read source files without links and refuse a file that changes. [Git](git.ts) runs Git with fixed settings, checks ignore rules, and makes the private comparison repository.
- [Stage](stage.ts) prepares, builds, seals, and reuses the private stage of one reservation. [Capture](stage-capture.ts) copies the source into it.
- [Package](package.ts) builds the snapshot and the manifest from the [bundle](package-git.ts), the [Git disk facts](disk.ts), and the [parts](objects.ts).
- [Native sessions](native.ts) find each session file and write its old document with the [line reader](native-lines.ts), the [Claude chain](native-chain.ts), and the [message filter](native-messages.ts).
- [Upload session](upload-session.ts) runs one upload or retry. [Part upload](upload.ts) checks each part and sends it in one signed HTTPS PUT.
- [Import contracts](../../../src/shared/conductor-import.md) define the frames, the manifest, and the page limits that the Mac shares with the Worker.

### Related Docs

- [Import on the Mac](../../../docs/protocol/desktop-import.md)
- [Import from Conductor](../../../docs/protocol/conductor-import.md)
- [Import operations](../../../worker/conductor-import/operations.md) of the Worker
- [Reservations](../../../worker/conductor-import/reservations.md) of the Worker
- [Shared import contracts](../../../src/shared/conductor-import.md)
- [Desktop README](../../README.md)
