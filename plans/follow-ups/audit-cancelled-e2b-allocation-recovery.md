# Check active E2B recovery after a failed start

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from the merge of `origin/main` at `b504e8b8` into branch `calummoore/e2b-backup-sandbox-provider`, draft pull request #193.
- **Location:** `worker/lifecycle/start-failure.ts:123`, `worker/lifecycle/start-failure.ts:130`, `worker/sandbox/client.ts:19`, `worker/sandbox/e2b/client.ts:53`, and `worker/lifecycle/start-allocation-cleanup.ts:32`.
- **Reason:** The merge kept this path unchanged, and nobody has reproduced its effect, so it needs its own investigation.

- **Terms:**
  - **Saved create request:** the encrypted create payload of a workspace start, `job.createPayloadCiphertext`. The lifecycle uses it to recover a create after a lost reply.
  - **Active mode:** the default allocation mode `'active'` of `providerForAccount` in `worker/sandbox/client.ts`. An E2B client in this mode can create, connect, and write the env file.
  - **Cleanup mode:** the allocation mode `'cleanup'`. An E2B client in this mode only finds the sandbox ID of an earlier create. It never creates, connects, or writes to a sandbox.
  - **Certified absence:** a result that proves that a create request made no sandbox. The E2B cleanup client throws `ProviderAllocationAbsent` for it.
- **Background:**
  - `finishFailedStart` in `worker/lifecycle/start-failure.ts` ends a failed workspace start. It takes the sandbox ID from `job.allocatedSandboxId`, or else from the `sandbox_id` of the workspace row.
  - Line 123 handles a start with no sandbox ID and a saved create request: `if (!sandboxId && job.createPayloadCiphertext)`.
  - Lines 124 and 125 define `canDefer = () => job.failure?.timeLimit || startTimeLimitReached(job, dependencies.now())`. So `canDefer()` is false while the failure is not a time-limit failure and the start time limit has not passed.
  - When `canDefer()` is false, line 127 returns null when the function got no `provider` argument.
  - Otherwise, line 128 calls `allocateWorkspace`. Its provider is `providerForAccount(env, dependencies.fetch, job.providerAccount)`, at line 130. Its input throws `Missing pinned allocation payload`, so only the saved create request can supply the payload.
  - Line 130 passes no mode. `providerForAccount` uses `'active'` by default, at `worker/sandbox/client.ts:19`.
  - `allocateWorkspace`, at `worker/lifecycle/start-allocation.ts:71`, reads the saved create request and writes the runner version of the workspace row. Without `job.allocatedSandboxId`, it calls `createSandboxResource` with `mayHaveAllocated: true`. Then it assigns the sandbox to the workspace row.
  - With a sandbox ID, the failure path records a cleanup and detaches the sandbox, so the app deletes it.
  - Without an ID, lines 138 to 141 hand the job to the separate allocation cleanup when `canDefer()` is now true. Otherwise the function returns null, and the failure waits.
  - The separate allocation cleanup, `retryAllocationCleanup` at `worker/lifecycle/start-allocation-cleanup.ts:16`, takes the provider in cleanup mode at line 32. It calls `recoverResourceForCleanup`.
  - In cleanup mode, the E2B `create` at `worker/sandbox/e2b/client.ts:53` calls `cleanupAllocation` in `worker/sandbox/e2b/allocation-cleanup.ts`. That function reads the saved create claim and the sandbox list by metadata. It returns a sandbox ID, a certified absence, or a pending result.
  - In active mode, the E2B `create` calls `createSandbox` at `worker/sandbox/e2b/allocation.ts:74`. Then it writes the env file of the saved request when the sandbox is ready.
  - `createSandbox` recovers an earlier claim through `recoverCreate`, at line 23. For a ready sandbox without a saved traffic token, `recoverCreate` calls the E2B `connect` route, at line 66.
  - When the earlier claim has the state `retryable`, `createSandbox` claims again and sends a new create. Line 83 holds that check.
  - A Boat client ignores the mode. So this question applies only to accounts of the kind `e2b`.
  - The block is the same before and after the merge of `origin/main` at `b504e8b8` on 12 November 2026. Nobody has run it against E2B or against the fake E2B server.
- **Task:**
  1. Reproduce a failed start before its time limit with the fake E2B server in `worker/test-support/fake-e2b.ts`. Use a create claim in each state: pending, ready, and `retryable`.
  2. Record, for each claim state, which E2B routes the failure path calls: create, connect, the env file write, the sandbox list, and delete.
  3. Decide whether the failure path needs active recovery, or whether cleanup mode gives the same cleanup with fewer provider calls.
  4. When the result shows a problem, write a finding in the item layout of the `decisions-and-findings` skill, with its options. Do not choose a new behaviour in this task.
- **Impact if no action:** Nobody knows whether a failed E2B start can connect a sandbox, write env values into it, or send a new create before the app deletes it.
- **Needs:** Nothing for the local reproduction. A check against real E2B also needs an E2B key.
- **Done when:** A recorded result gives the E2B routes for each claim state, and says whether active recovery is necessary on this path.
