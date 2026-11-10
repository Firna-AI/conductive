# Import activation

This page belongs to the [workspace lifecycle](README.md). It describes the
first start of a workspace that the [import area](../conductor-import/README.md)
published. [The activation](../../docs/protocol/imported-workspaces.md#the-activation)
and [A failed activation](../../docs/protocol/imported-workspaces.md#a-failed-activation)
state the requirements.

## The route and the admission

- `chatLifecycleRoute` in [`lifecycle.ts`](../app-api/lifecycle.ts) serves
  `POST` of `workspacePaths.activate(orgId, workspaceId)`, after
  `requireWritableWorkspace`. It calls `activateImportedWorkspace` of the
  workspace object, not `handleLifecycleRequest`.
- The reply is `ActivateWorkspaceResponse`: the workspace for its reader,
  the start, the error, and `sessionId`, the real Untitled session of the
  activator.
- The admission checks the org, the membership, the active owner, Archive,
  an Archive reservation, and the import source. A workspace with no import
  source gets 404 `workspace_not_found`.
- A workspace with a completed activation answers with its saved session.
  It starts nothing.
- With no current start job, the admission reads the published import and
  takes a new epoch. It continues a kept attempt, or it makes a new one, as
  [Interrupted activations](#interrupted-activations) says.
- A new attempt pins its image, captures `runnerSoftware(env)`, and saves the
  start job, also under `lifecycle:import-checkpoint`. Its deadline is the
  admission time plus `WORKSPACE_START_TIME_LIMIT_MS`. A continued attempt
  keeps its deadline.
- Each Activate then runs `ensureActivationSession`. It claims the attempt
  fence and seeds the Untitled session of the activator. It saves that ID as
  the runtime session only while the runtime session is null. So concurrent
  requests join one attempt and one session.

## The image lease

- `pinImportImage` in [`import-image-admission.ts`](import-image-admission.ts)
  writes `workspace_import_image_leases` from the current good publication of
  the chosen repository. The same batch reads the captured repositories, the
  folder map, the startup script, and the encrypted environment.
- It then checks the member, the owner, and Archive again. A missing image or
  repository gets the native refusal of `imageAdmissionError`: 409
  `image_required` or 404 `repository_not_found`.
- `releaseImageLease` deletes the native lease and the import lease.
  `imageIsLeased` counts both, so image cleanup keeps a snapshot that an
  activation uses.
- Native creation keeps `image_leases`, because its claim needs a first
  message.

## The attempt fence

- `workspace_import_activation_attempts` holds the attempt, the epoch, and
  the state of the current activation of each imported workspace.
- `importActivationGuard` in [`import-activation-data.ts`](import-activation-data.ts)
  needs a workspace that is not archived and not yet activated, with an
  import source, an active owner, and a current member who is not suspended.
- [`import-activation-fence.ts`](import-activation-fence.ts) gives the writes:
  - `claimActivationFence` saves the attempt as `active`. It takes over only
    the same attempt or a row that is not active.
  - `activationResourceFence` guards the resource writes of the activation,
    such as the allocation pin in `start-allocation.ts`. Only the current
    attempt and epoch can pin a computer.
  - `completeActivationFence` saves `complete` and
    `workspaces.activation_completed_at` in one batch.
  - `closeActivationFence` saves `failed` or `interrupted`, and clears a
    matching `activation_completed_at`.

## The phases

The start job of kind `activate` has `turnId: null` and the
`ImportActivationProgress` of [`import-activation-types.ts`](import-activation-types.ts).
Its phases run in this order:

1. `machine` and `ready`: the native allocation, computer ledger, retry,
   and readiness paths.
2. `import-software`: `privilegedCommand(workspaceToolsCommand(WORKSPACE_TOOL_SOURCES))`,
   then `installImageSoftware` of the captured runner archive.
3. `import-launch`: `workspaceRunnerLaunch(attempt)` writes the attempt to
   `/home/user/.conductive/import-pending`, touches the ready marker, and
   restarts the runner service.
4. `import-open`, `import-manifest`, `import-preflight`, `import-parts`,
   `import-restore`, and `import-sessions`: one runner command at a time, as
   [The runner commands](#the-runner-commands) says.
5. `startup`: `workspaceStartupBody` of the captured startup script, with no
   second runner launch. The native terminal phases follow.
6. `import-finish`: the runner ends its import preparation.
7. `import-publish`, then `runner`: the guarded success and the native
   completion.

Only this job installs the runner archive at a start. The native create,
resume, retention, and refresh paths keep their commands. The allocation still
stores the runner version of its image snapshot.

The public start keeps `WorkspaceStart.kind: 'create'`. A Resume of an
activated import keeps `'resume'`. The public steps are:

| Step ID | Label |
| --- | --- |
| `image` | Starting from the newest image |
| `import-software`, `import-launch` | Preparing the cloud computer |
| `import-preflight` | Checking space for your work |
| `import-restore` | Restoring your work |
| `startup` | Applying your startup script |
| `runner` | Starting the agent |

## The runner commands

- `importPhaseAction` in [`import-activation-delivery.ts`](import-activation-delivery.ts)
  chooses the command of each phase. `deliverImportAction` saves it as
  pending and sends one `import.command` through the chat's runner channel.
  It returns before the ACK, so the queue stays free to store the ACK.
- A chunk carries one bounded range of one verified part from
  `readPublishedPartRange`, with its offset, its length, and its SHA-256.
  Each frame stays below `RUNNER_IMPORT_BYTES`.
- `receiveImportResult` keeps a reply only when it matches the attempt, the
  epoch, the current epoch, the pending command ID, and the connection. It
  then schedules the next step. `advanceImportActivation` in
  [`import-activation-progress.ts`](import-activation-progress.ts) applies it.
- A new connection gets the same pending command again. The runner answers a
  repeat from its saved result.
- A failed result fails the start with its code. `import_disk_space` is an
  HTTP 502 start failure, with the required and the available bytes. Each
  other restore failure is `workspace_start_failed`.

## Sessions and held messages

- Each `session` command restores one continuation. `seedContinuation` then
  seeds `importSessionId(documentId)`, with the importer as its starter and
  its `conductorImport` metadata.
- `prepared` means that the runner prepared the native history. It does not
  mean that a provider accepted it. A definite native-history failure gives
  `fallback`, through the runner's `import.preparation` event.
- Messages and attachments to the early session use the normal routes.
  [Workspace lifecycle](../chat/integration/workspace-lifecycle.md) says how
  the chat holds their turns until the activation succeeds.

## Success, failure, and cleanup

- `prepareStartSuccess` in [`start-completion.ts`](start-completion.ts) needs
  the `runner` phase and the committed final report of the runner. It first
  saves `completeActivationFence`. It checks the job again, then sets
  `cleanupPending`. Only then does `lifecyclePrepared` release the held
  turns. A later check that fails closes the fence as `failed`.
- `completeStoredStart` in [`start-storage-completion.ts`](start-storage-completion.ts)
  saves the checkpoint. With `cleanupPending`, it sets the publication alarm.
- `publishCreationResult` in [`creation-publication.ts`](creation-publication.ts)
  then calls `cleanupImportWork` of the import area. It clears the mark, or it
  tries again at the next publication alarm.
- A failed attempt closes the fence as `failed` and clears `cleanupPending`.
  The published import, its stored work, its old documents, and its accepted
  messages stay. An explicit Activate starts again, and the same activator
  keeps the early session.
- Archive closes an incomplete attempt as `interrupted` in
  [`archive-start.ts`](archive-start.ts), and keeps its computer under the
  rules of [Archive](../../docs/protocol/workspace-life.md#archive).

## Interrupted activations

- `retainedActivation` in [`import-activation-recovery.ts`](import-activation-recovery.ts)
  continues a kept attempt only when it has no failure, the workspace keeps the
  same allocated computer, and the original deadline has not passed.
- A continued attempt restarts at `machine`, keeps its deadline, takes the new
  epoch, and resumes after the early phases.
- Otherwise `releaseInterruptedActivation` gives the kept computer the
  failed-start cleanup, and a new attempt pins the newest good image.
- Restore returns the workspace stopped. Only an explicit Activate continues.
  A Resume of an import that is not activated starts nothing.

## The restore credential

During `import-restore` only, `activationCredentialSender` gives the activator
for a request with the `X-Conductive-Activation-Id` of the current attempt, as
[The git credential sender](routes.md#the-git-credential-sender) says.

## Key code

- [`import-activation.ts`](import-activation.ts): `importActivationMethods`,
  the Activate admission, `activationCredentialSender`, and
  `receiveImportResult`. `ensureActivationSession` claims the fence and seeds
  the early session.
- [`import-image-admission.ts`](import-image-admission.ts): `pinImportImage`.
- [`import-activation-fence.ts`](import-activation-fence.ts) and
  [`import-activation-data.ts`](import-activation-data.ts): the fence, its
  guard, `unfinishedImport`, and `importPreparedForDispatch`.
- [`import-activation-delivery.ts`](import-activation-delivery.ts) and
  [`import-activation-progress.ts`](import-activation-progress.ts): the runner
  commands, the trusted reads, and the session seeding.
- [`import-activation-recovery.ts`](import-activation-recovery.ts): the
  continue-or-replace rule.
- [`import-activation-cleanup.ts`](import-activation-cleanup.ts):
  `IMPORT_CHECKPOINT_KEY` and the work cleanup mark.
- [`import-activation-types.ts`](import-activation-types.ts): the phases and
  the saved progress.
- [`import-activation.test.ts`](import-activation.test.ts) and
  [`import-activation-archive.test.ts`](import-activation-archive.test.ts):
  the tests, as [Lifecycle backend tests](tests.md#import-activation) says.
