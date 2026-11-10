# Delete org misses unresolved allocations

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, a problem outside the scope of the check of finding 8, branch `conductor/boat-native-remote-workspaces-milestone-5d`, round 1. The same day, the item grew to cover the workspace cleanup owners.
- **Location:** `worker/members/deletion-data.ts:120-129` (`recordSuspendedResources`), `worker/members/deletion.ts:62-81` (`stopDeletedOrg`), `worker/members/cleanup.ts:58-110` (the purge), `worker/members/purge-data.ts:11-37`, `worker/lifecycle/settings-data.ts:150-160` (`firstOrgAdmin`), `worker/lifecycle/start-allocation-cleanup.ts:16-25` (`retryAllocationCleanup`), `worker/lifecycle/cleanup.ts:25-37` (`retrySandboxCleanup`), and `worker/members/README.md:82-85` (the `suspendOrg` contract).
- **Reason:** Delete org had this gap before the time-limit work that found it, and the production hooks now drain starts and builds.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Unresolved allocation:** a create request for a new sandbox that the app saved before it called the provider, and whose reply never reached the Worker. The app has the request but no sandbox ID.
  - **Cleanup owner:** a saved record that keeps the delete of a sandbox scheduled until it finishes.
  - **Workspace object:** the Durable Object of one workspace. Its alarm retries the cleanup of a failed create.
  - **Deletion list:** the rows of `org_deletion_resources`. Delete org fills it once, stops each listed sandbox, and deletes each listed resource at the purge.
  - **`suspendOrg` hook:** the lifecycle callback that Delete org runs before it fills the deletion list.
- **Background:**
  - The protocol says that Delete org stops every sandbox of the org at once. It also says that the app deletes everything of the org after 7 days, unless an admin restores the org. See the "Delete org" section of `docs/protocol/orgs-and-members.md`.
  - `stopDeletedOrg` runs the `suspendOrg` hook, then fills the deletion list with `recordSuspendedResources`, then stops each listed sandbox. It fills the list only once, before it marks the org suspended.
  - The `suspendOrg` contract in `worker/members/README.md` says that the hook must drain pending workspace starts and image builds, and keep their sandbox IDs in D1. It does not say what the drain does with a cleanup owner.
  - `productionMembersHooks` in `worker/members/composition.ts` implements `suspendOrg`. It suspends the lifecycle of the org image and of each workspace of the org, which drains their starts and builds. The main Worker dispatches the Members routes with these hooks, through `worker/routes.ts`. Its Cron Trigger runs the purge with the same hooks.
  - An image build prepares the org's cloud computer image in its own build sandbox. It saves its create request in `image_build_jobs`, as phase `allocating`, before it calls the provider.
  - After a failed build, `cleanupBuild` in `worker/lifecycle/build-execution.ts` replays that saved request and deletes the returned sandbox. So the build row is the cleanup owner of a build.
  - `finishFailedStart` in `worker/lifecycle/start-failure.ts` hands the cleanup of a failed create to its workspace object, and then removes the workspace row.
  - With a known sandbox ID, the failed create also keeps a `lifecycle_sandbox_cleanup` row. With an unresolved allocation, only the workspace object's storage holds the saved request.
  - `runWorkspaceAlarm` in `worker/lifecycle/workspace-alarm.ts` retries that cleanup with `retryAllocationCleanup` and `retrySandboxCleanup`. When they make no progress, it tries again 30 seconds later.
  - Only a replay of the saved request, with its idempotency key, can find the sandbox of an unresolved allocation. The fixed provider routes in `worker/sandbox/routes.ts` have no route that lists or finds sandboxes.
  - The replay finds the sandbox only while the provider still keeps the key. The repository does not record how long the provider keeps it.
  - Each create request sets a 30-minute auto-stop, with `ttlSeconds: 1_800`, in `worker/lifecycle/resource-intents.ts` and `worker/lifecycle/start-machine.ts`.
- **Problem:**
  - **Deleted-org filter:** `firstOrgAdmin` returns an admin only while `orgs.deleted_at IS NULL`, at `worker/lifecycle/settings-data.ts:157`.
  - `retryAllocationCleanup` and `retrySandboxCleanup` return without progress when `firstOrgAdmin` finds no admin, at `worker/lifecycle/start-allocation-cleanup.ts:24-25` and `worker/lifecycle/cleanup.ts:36-37`. So after Delete org, the cleanup of a workspace object makes no progress.
  - **Known-ID deletion list:** `recordSuspendedResources` lists only the `sandbox_id` values of `workspaces` and `image_builds` rows, at `worker/members/deletion-data.ts:128-129`.
  - The list does not read a build's saved request, a `lifecycle_sandbox_cleanup` row, or a workspace object's saved request. So Delete org neither stops nor deletes those sandboxes.
  - **Purge:** `purgeOrgRecords` deletes `image_builds`. The `image_build_jobs` row with the saved request goes with it, by the cascade at `migrations/202611070001_lifecycle.sql:23`.
  - It deletes the `orgs` row. Each `lifecycle_sandbox_cleanup` row of the org goes with it, by the cascade at `migrations/202611070001_lifecycle.sql:36`.
  - The purge clears a workspace object only when `org_deletion_workspaces` lists it. Delete org fills that table from `workspaces` rows, at `worker/members/deletion-data.ts:120-124`.
  - `pendingWorkspaceStates` reads that table, at `worker/members/purge-data.ts:33-37`. A failed create that removed its row before Delete org is not listed, so the purge never clears its workspace object.
- **Impact if no action:**
  - These sandboxes stop after their 30-minute auto-stop, but nothing deletes them. Their disks can keep a copy of the org's repositories in the app's provider account after the org is gone.
  - This breaks the rule that the app deletes everything of the org after 7 days.
  - After the purge, no admin of the org can exist. So a workspace object that still holds an unresolved allocation repeats its alarm every 30 seconds without end.
- **Root question:** How does Delete org stop and delete every sandbox that only a saved create request or a pending cleanup still tracks?
- **Options:**
  - **A.** Resolve every cleanup owner in the drain. Add to the `suspendOrg` contract that the drain replays each unresolved allocation of a build or a workspace. The drain saves each sandbox ID in D1 before the hook returns. The deletion list then reads those IDs.

    No D1 record names the unresolved allocation of a failed create today, so the drain cannot find its workspace object. A also needs that D1 record and a migration. The rule lives only in a hook contract that each implementation must follow. A replay failure fails the suspension, so no other sandbox of the org stops until a retry succeeds. Effort: Medium.
  - **B.** Make Delete org read every cleanup owner. `recordSuspendedResources` also lists these:
    - each image build with a saved request and no `sandbox_id`, keyed by the build ID
    - each `lifecycle_sandbox_cleanup` row of the org, as a sandbox
    - each unresolved workspace allocation, which then needs a D1 record, because today only the workspace object holds it

    After the deleted-org lease check, the stop step resolves each saved request through the provider of its stored account. It replays the request, records the returned ID as a sandbox, and stops it. A failure keeps the resource for the next cleanup run, as a failed stop does now. The other sandboxes still stop at once.

    The purge deletes each such sandbox before it deletes the records of its owner. It also clears the workspace object of each workspace owner, even when the workspace row is gone, so that its cleanup alarm ends. The `kind` column of `org_deletion_resources` allows only `sandbox` and `snapshot`, at `migrations/202611071400_org_deletion_cleanup.sql:11`. So B needs a migration for that column and for the D1 record of a workspace allocation. Effort: Large.
  - **C.** Add one shared recovery queue for the saved create requests of every build and every start. Delete org drains it before it fills the deletion list. This needs a new table, a migration, a queue driver, and tests for each owner. It replaces the separate cleanup owners that builds and starts have now. Effort: Large.
- **Left out:**
  - A provider lookup of the org's sandboxes by name or label. The fixed provider routes have no such route, and a new route is a new provider interface, which this item does not decide.
  - The 30-minute auto-stop as the only answer. It stops the sandbox but deletes nothing, so it fails the rule that the app deletes everything of the org after 7 days.
  - A refusal of Delete org while a cleanup owner is pending. It is a new rejection for the user, and the retries of options A and B already wait without one.
  - Let each owner finish its own cleanup in a deleted org. The `suspendOrg` contract fences every lifecycle write of the deleted org, so the owners cannot save their progress. B gives the same result with one owner during the deletion.
- **Wider fix:** B. It keys Delete org on every cleanup owner. So no unresolved allocation or pending cleanup can hide a sandbox from Delete org, whatever the hook does. C also covers owners that later code adds, but it replaces the cleanup owners that builds and starts have now.
- **Previous examples:**
  - Commit `6ae0ffd`, "fix(lifecycle): recover recorded snapshot intents", recovered snapshots after uncertain provider replies.
  - `cleanupBuild` in `worker/lifecycle/build-execution.ts` keeps the saved request of a failed build through every failure exit, for the same class at the build's own exits.
- **Recommendation:** B. It keeps Delete org right whatever the hook implementation does, and the other sandboxes still stop at once. A is smaller, if the branch that writes the hook keeps the members code as it is.
- **Action:** fix after merge, apply B, because the gap is in Delete org code that predates the time-limit work.
- **Evidence update, 2026-11-10:** the computer ledger now exists. It is the D1 table `computer_ledger`, from `migrations/202611100900_computer_ledger.sql`.
  - It has a row for each create request. The row holds the allocation key, the provider account, the org, the owner, the purpose, and the computer ID once the app knows it. It holds no saved request body.
  - So the claims above that no D1 record names an unresolved workspace allocation predate the ledger. A replay still needs the saved request, which only its owner keeps.
  - Delete org now lists the live ledger rows that hold a computer ID, at `worker/members/deletion-data.ts:130-131`. The other line anchors above also predate the ledger. Recheck each claim and anchor against the current hooks before the work starts.
  - This note changes no option and no recommendation. It does not claim that the gap still reproduces.
  - `plans/follow-ups/unresolved-computer-request-ownership.md` holds the wider question: one owner for unresolved create requests across every owner. Its option D would also close this gap.
