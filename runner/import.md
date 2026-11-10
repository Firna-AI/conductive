# Import activation

This guide belongs to [the agent runner](README.md). It gives the private
import commands of an activation, and how the runner restores the stored
work of an imported workspace.
[The activation](../docs/protocol/imported-workspaces.md#the-activation)
states the requirements. [Import activation](../worker/lifecycle/import-activation.md)
gives the Worker side.

## The deferred start

- The activation's launch writes its attempt ID to
  `/home/user/.conductive/import-pending`, then restarts the runner service.
- `initializeRunner` in `src/initialize.ts` reads that marker through
  `importRuntimeState` in `src/import-bootstrap.ts`. With the marker, or with
  a saved `import-runtime` record of the same workspace, the state file goes
  under `/home/user/.conductive/imports/`, outside the checkout. Other computers
  keep `CONDUCTIVE_STATE_PATH`.
- While the marker exists, `Runner.start` and `connect` skip
  `prepareContextFolder`, the clear of Claude credentials, the file watch, and
  the file and changes reports. The runner still connects and answers import
  commands.
- After `finish`, the receiver's refresh runs `clearImportedCredentials`,
  ends the deferral, sends fresh file and port reports, and starts the watch.
  `finish` then saves its mark and removes the marker.

## The import commands

- `Runner` gives each `import.command` to `ImportReceiver` in
  `src/import-receiver.ts`. The receiver reads it with
  `readRunnerImportCommand`, and runs one command at a time.
- A new command must name the workspace of the saved `open`, come before its
  deadline, and match the pending marker. The deadline also aborts the
  running command.
- The receiver saves each result in `ImportStorage` before it replies with
  `import.result`. A repeated command ID gets its saved result again.
- `receiveImportChunk` in `src/import-chunks.ts` writes one range only when
  the part, the length, the SHA-256, and the order match. A wrong range gets
  a failed result and changes no saved range.
- A disconnect aborts the running command. The Worker sends it again on the
  next connection.

## The disk check

- `preflight` runs `preflightImport` in `src/import-disk.ts` before any
  change to the checkout, any context write, and any content delivery. It
  measures the disk with `statfs`.
- A second check runs inside the restore, after the Git and LFS preparation
  and before the checkout. After its downloads, `prepareImportLfs` gives the
  allocation of the LFS paths that no overlay replaces. `applyImport` then
  calls `preflightImport` again with that allocation.
- This check measures the actual free disk again. It counts only the future
  work: the raw checkout and its index, the overlays, the native session and
  document destinations with their copies, those LFS paths, and the future
  receipts.
- It leaves out the stored parts, the expanded objects, the completed packs,
  the downloaded LFS cache, and their metadata, which are already on the
  disk. A failure is the same `import_disk_space`, before any checkout change.
- `importDiskRequirement` counts the peak allocation in whole filesystem
  blocks: the retained staging and each separate restored destination, with
  the Git and LFS facts of the snapshot.
- When the work does not fit, the result is `import_disk_space`, with the
  required and the available bytes. Each other failure of a command is
  `workspace_start_failed`. The stored work stays in both cases.

## The restore

- `restore` runs `applyImport` in `src/import-restore.ts`. Each step saves a
  mark in `ImportStorage`, so a restart repeats no finished step.
- `importGit` in `src/import-git.ts` runs Git with hooks, the file system
  monitor, and every LFS filter off, with `GIT_LFS_SKIP_SMUDGE=1` and no
  prompt. It caps the output at 1 MiB.
- `prepareImportGit` first checks the origin repository and the object format
  against the snapshot. It fetches the exact branch, or the default branch only
  when the remote confirms that the branch is absent. It fetches each missing
  prerequisite by its OID. Its credential is the activator's, through
  `CONDUCTIVE_ACTIVATION_ID`, as the
  [git credential sender](../worker/lifecycle/routes.md#the-git-credential-sender)
  says.
- The bundle code in `src/import-git-pack.ts` and
  `src/import-git-pack-facts.ts`, and `verifyImportTree` in
  `src/import-git.ts`, check the bundle, the pack, and the tree facts of the
  snapshot before any change to the checkout.
- `prepareImportLfs` in `src/import-lfs.ts` checks the LFS facts of HEAD.
  `downloadImportLfs` in `src/import-lfs-transport.ts` gets only the payloads
  that no overlay replaces. It uses the activator's token and the action
  headers of each object, and it checks each size and SHA-256.
- `checkoutImport` in `src/import-checkout.ts` makes the checkout raw. It
  saves a journal in the import storage, moves an existing `info/attributes`
  file aside, and puts an owned override there. The override turns off the
  text, end-of-line, filter, working-tree-encoding, and ident conversions,
  only for this checkout. The helper then checks out the branch at HEAD.
- A converted file can stay after that checkout when its cached stat matches
  the index. So the helper removes only the tracked regular files and
  symbolic links of HEAD, each through `withImportDestination`. This step
  removes no directory and no other path, and it deletes nothing recursively.
- `git checkout-index` then writes each removed file again from the index,
  so it holds the exact bytes of its blob. Untracked paths stay as they are.
- The original attributes file then comes back, before the restore marks
  its Git step as done. The helper removes its own temporary attributes
  folder. A restart first recovers the owned override from the journal.
- The Git config stays as it was. `core.symlinks=true` applies only to the
  two checkout commands.
- The restore then writes the overlays in manifest order: the files with
  their modes, the links as links, the directories, the deletions, `.context`,
  and the old documents under `.context/conductor/`. `withImportDestination`
  in `src/import-paths.ts` checks each destination, follows no parent link,
  and never writes through `.git`.
- After the files, the restore makes `.context/attachments/` and adds the
  anchored `/.context/` rule with `prepareContextExclude` of
  `src/context-folder.ts`, as [The context folder](agent-input.md#the-context-folder)
  says.

## Native sessions

- `session` runs `restoreImportSession` in `src/import-native.ts` for one
  continuation.
- Claude history goes under `.conductive/claude/projects/<key>/`.
  `claudeProjectKey` encodes the resolved folder as the pinned SDK does. The
  native bytes and the native ID stay.
- Codex history keeps its ID, its dated path, and each response item.
  `codexHeader` in `src/import-native-header.ts` changes only
  `payload.model_provider` of the copied header, from `openai` to
  `conductive`. A `zstd` memory object is decoded into its logical `.jsonl`
  file.
- No auth store, profile credential, or login of the source is copied.
- The result says `prepared` when the native history is in place. That does
  not mean that a provider accepts it.

## Fallback

- `NativeHistoryError` in `src/providers/native-history.ts` marks a definite
  native-history failure of Claude or Codex. Only such a failure gives the old
  document instead, once, through `fallbackImportedHistory` in
  `src/engine-import.ts`.
- The runner first closes the failed provider and its credentials. The stored
  member message stays as it was.
- A generic login, network, process, or abort failure keeps the native
  preparation.
- The runner sends `import.preparation` with `fallback` for that session. It
  sends it again at each connection.

## Tests

- `src/import-restore.test.ts` checks the deferred writes, and one exact
  restore of files, links, modes, native bytes, and document pairs across
  restarts. It checks the state outside the checkout, and the disk report
  before any write.
- The same file checks the raw checkout of converted image files, an
  untracked file that stays, and the unchanged attributes and Git config. It
  also checks a loss of disk after the Git and LFS preparation, and a replay
  that charges no staged work twice.
- `src/import-restore-validation.test.ts` checks the refusal of corrupt
  ranges and of a wrong expansion before the checkout, and then a fresh exact
  delivery.
- `src/import-lfs.test.ts` checks the HEAD LFS facts and the download of only
  the payloads that no overlay replaces. It runs the default credential
  adapter, with a captured helper process and real Git.
- `src/engine-import.test.ts` checks one fallback after a definite failure,
  and no fallback after generic failures.
- `test-support/import.ts` gives `importRunnerFixture`, and
  `test-support/import-inventory.ts` gives `importInventory`.
  `test-support/import-conversions.ts` builds the converted image of the raw
  checkout case.
- No test makes a network request, uses a real agent login, or starts a real
  agent program.

## Key code

- `src/initialize.ts` and `src/import-bootstrap.ts`: the runner state of an
  imported computer.
- `src/import-receiver.ts` and `src/import-storage.ts`: the commands, their
  saved results, and the staging folder.
- `src/import-chunks.ts`, `src/import-objects.ts`, and `src/import-disk.ts`:
  the ranges, the staged objects, and the disk check.
- `src/import-restore.ts`, `src/import-paths.ts`, and `src/import-git*.ts`:
  the restore, the safe destinations, and Git. `src/import-checkout.ts`:
  `checkoutImport`, the raw checkout and its attributes journal.
- `src/import-lfs.ts` and `src/import-lfs-transport.ts`: the LFS check and
  download.
- `src/import-native.ts`, `src/import-native-header.ts`, and
  `src/import-native-location.ts`: the native sessions and the credential
  clear.
- `src/engine-import.ts` and `src/providers/native-history.ts`: the fallback.
