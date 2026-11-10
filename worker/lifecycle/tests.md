# Lifecycle backend tests

This guide belongs to the [workspace lifecycle](README.md).
Run the tests from the repository root with Node 24:

```sh
npm run test -- worker/lifecycle
npm run test -- worker/operator worker/workspace-alarms.test.ts
npm run typecheck
```

## Native fixture

`setupBackendTests` in `backend-test-hooks.ts` creates one shared harness per test file.
Each test resets its D1, R2, native objects, clocks, and fakes.
`backendFixture` in `backend-test-support.ts` adds a signed session, an org, a selected repository, and a published image.
Its prerequisite seed keeps the real signer, token encryption, and deterministic fixture IDs.
Stored agent logins let production first-message admission run normally.

`backendActor` in `backend-test-platform.ts` uses the production `Workspace` in Miniflare.
Its ordinary lifecycle endpoint calls `workspaceLifecycleEndpoint` over the actual namespace RPC.
The start codec runs before transport, and the result codec releases masked logs after transport.
The native transport copies plain RPC results before releasing their RPC session.
The object keeps its production chat, lifecycle, device, and alarm composition.

D1 holds workspace, token, build, and log records.
Native SQLite holds each object's lifecycle state, chat, turn records, and alarm owners.
Inspect those records through the native storage API.
APIs that require `WorkspaceStorage` use the production `nativeWorkspaceStorage` adapter.
The shared backend fixture keeps persistence in native storage.

## Clock, progress, and restart

Use `TEST_TIME` as the future origin for native alarms.
Await fixture clock changes so the host and native object use the same time.
An alarm near zero is already due on the real runtime clock.
It can run before a manual test advance.

`advanceTo` uses `advanceScheduledAlarms` from `scheduled-alarms.test-support.ts`.
It advances the clock and runs only stored due alarms, in time order.
It deletes each alarm before the production `Workspace.alarm` dispatcher runs.
Do not call a native controller alarm directly.

`backend-pump.test-support.ts` advances a waiting create or resume.
It reports runner readiness at the saved runner phase.
It keeps a horizon that leaves unrelated far-future disk and image work alone.
`backend-start.test-support.ts` reads serialized checkpoints and encrypted log chunks.

Await `restart` to evict and reconstruct the real object.
Restart first drains the object and saves its clock and identity metadata.
It resets the real object context, then evicts the fresh idle instance.
The fixture checks both instance changes and keeps committed native SQLite records.
This reset releases native request deadline resources without changing production timeouts.
Finish or release held calls before a restart.
The older checkpoint crash tests use `realRuntimeFixture` to stop and reopen a persistent runtime while work is held.
They test interrupted calls rather than graceful eviction.

## Holds and errors

Native storage hooks hold result reads and admission transactions with explicit entered and release signals.
Publication observers run after the real native publisher.
The admission signal follows a committed start job.
It does not imply that the caller's RPC has already returned.

The focused epoch-guard control accepts the production stored job format.
It rebuilds the job inside workerd before calling the existing controller guard.
This lower-level proof permits a Stop between epoch capture and admission.
Normal production lifecycle RPC methods share the chat queue.

Expected RPC errors use a focused test entry when namespace serialization would discard their extra fields.
That entry calls the actual inherited public method and copies its error before another namespace hop.
The host reconstructs the same status, code, and message for the assertion.
Normal lifecycle calls keep the production endpoint and log codecs.
Native warning controls record the warning arguments inside workerd.
Node console spies cannot observe that separate runtime.

## Focused prerequisites

`backend-workspace.test-support.ts` seeds a completed native workspace for tests of later operations.
It uses the production creation claim, workspace writer, token encryption, and first-message admission.
The real native lifecycle records its prepared state and runner readiness.
Repository and environment tests keep separate real create cases.
Their later cases still run image changes, resume, settings changes, and retention through production operations.

## Image and provider boundaries

Image retry fixtures use a native object named `org-image:<orgId>`.
They schedule through the production image RPC and advance its stored alarms.
`backend-image-fetch.test-support.ts` serves fake installation tokens and revocation responses.
It lets the real one-use source credential handler consume each simulated source command's grant.
The source materializer runs in the native object.
Dedicated source tests keep their real local Git fixture.

`LifecycleBoat` remains the provider boundary.
Its detached process IDs, status offsets, delayed replies, and stop failures remain observable.
Tests replace the current fetch dependency to inject a provider fault.
The native outbound route reads that current dependency for each request.
No test needs a real provider account, GitHub App, or cloud computer.

The computer Stop regression uses the same native fixture and stored alarm dispatcher.
It saves user and org scopes into one org task, restarts it, and changes no suspension request.
Its provider fault checks that the task and alarm exist before dispatch.
The build ledger cleanup tests retain older and current computer IDs.
They confirm retry after failed Delete and after suspension blocks initial provider setup.
