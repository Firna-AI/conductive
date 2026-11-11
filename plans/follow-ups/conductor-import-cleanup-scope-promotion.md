# Cleanup promotion can leave private documents behind

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`, review round 3 of head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2`, finding 13. It includes the independent finding check and the root outcome of the same day. The check corrected the category from Security to Product bug.
- **Location:** `worker/conductor-import/service.ts:267-274`, where `cleanup` saves the requested group before the serial queue. `worker/conductor-import/cleanup-data.ts:48-55`, `requestImportCleanup`. `worker/conductor-import/cleanup-service.ts:12-58`, `runImportCleanup`. `worker/conductor-import/cleanup-data.ts:91-114`, `markImportDeletion`, which guards only `in_flight` at `:101`. `worker/conductor-import/cleanup.ts:28-56`, `purgeOrgImports`, with its selection at `:36-39`. `worker/conductor-import/cleanup-data.ts:116-133`, the Cron selection. `migrations/202611101830_conductor_import_reservations.sql:106-116`, the cleanup table.
- **Reason:** The import review used both of its fix rounds, and this Rare product bug is not critical: no attacker can cause or reach the kept objects, and no data is lost.

- **Source:** Review. **Category:** Product bug.
- **Grade reasons:**
  - Severity is High. The purge reports the import data of a deleted org as gone, but private documents stay forever with no owner record. That breaks a requirement and a Privacy promise.
  - Likelihood is Rare. The trigger needs a work cleanup that stayed unfinished for about 7 days, then finishes during the few seconds of the purge request.
  - The category is Product bug, not Security. No attacker can start a work cleanup of another org or set the time of its purge. After the purge, no route reaches the kept keys. Org IDs come from `randomToken` at `worker/app-api/feature-org.ts:54`, and reservation IDs from `crypto.randomUUID()` at `worker/conductor-import/broker-events.ts:79`, so no later org or reservation reuses the prefix.
  - Confidence is Medium. The defect is definite in the code, but it needs a timing that nobody ran. This is a source trace.
  - Harder later is No. A new column with a backfill from `group_name` and `finished_at` works later, and the project is not in production.
- **Terms:**
  - **Reservation:** the Worker record for one imported workspace and its uploaded parts.
  - **Work:** the uploaded Git data, files, and native session memory that activation restores.
  - **Old document:** a Markdown copy of one imported session, kept in the private object bucket.
  - **Cleanup group:** the field of the cleanup record that requests deletion of work, or deletion of both work and old documents: `none`, `work`, or `all`.
  - **Owner:** the Durable Object of one reservation. It runs the controls, seals, and deletions of that reservation in one serial queue.
- **Background:**
  - Conductive imports local Conductor workspaces into cloud workspaces. A successful activation requests deletion of work. The purge of a deleted org later requests deletion of both groups.
  - `docs/protocol/import-uploads.md:54-55` keeps old documents for the life of their workspace. `docs/protocol/import-uploads.md:56-57` says that the purge of a deleted org deletes its reservations and their parts.
  - The Privacy page promises that the data of a deleted org goes after 7 days. On this branch it is at `src/marketing/privacy.ts:186-187`. On the main branch of 11 November 2026, it is at `src/marketing/privacy.ts:86-87`. Find it by its words: "deletes the data of the org after 7 days, unless an admin restores it".
  - `docs/protocol/conductor-import.md:168-170` says that old documents keep secret values that users typed.
  - `cleanup()` writes its requested group at once, before the serial queue, so that no new seal starts after it, as `worker/conductor-import/cleanup.md:32` says. The group only widens: `none`, then `work`, then `all`.
- **Problem:**
  1. A successful activation sends `cleanupConductorImport(..., 'work')` to the owner, through `worker/lifecycle/creation-publication.ts:14-17` and `worker/conductor-import/cleanup.ts:21-25`.
  2. The work run writes its request, then reads the record in the queue: group `work`, no finish time. It calls `deleteObjects('work')` at `cleanup-service.ts:48` and waits on the bucket.
  3. During that wait, the purge sends `cleanupConductorImport(..., 'all')` from `worker/members/cleanup.ts:168-170`. Durable Object input gates stop other requests only during storage calls, so this request runs during the bucket wait. It sets the group to `all`, clears `first_deleted_at` and `finished_at`, sets `due_at` to now, and waits behind the work run.
  4. The work run continues. Its upload links expired long ago, because each link lasts 300 seconds, so `next` is null.
  5. `markImportDeletion` sets `finished_at`. It guards only `in_flight = 0` and never compares the group. The record now says that group `all` finished, although only `work` was deleted.
  6. The queued `all` run reads that record. `cleanup-service.ts:38` returns true, and no deletion of the `document/` keys runs.
  7. `purgeOrgImports` accepts the result, and `purgeOrgRecords` deletes the org. The delete cascades to the reservation rows and their document rows. The cleanup row has no foreign key, so it stays as a finished `all` record.
  8. No later query selects it. The purge selects `group_name != 'all' OR finished_at IS NULL`, and the Cron selects unfinished records, or records that are not `all` and have no org.
- **Evidence:** A new activation and each import control need an org that is not deleted, at `worker/lifecycle/access.ts:33` and `worker/conductor-import/access.ts:15`. The purge starts 7 days after Delete org, at `worker/members/deletion-data.ts:5` and `:30`. So a work run at purge time needs a work cleanup that stayed unfinished for about 7 days, for example after repeated bucket delete failures, with owner retries every 30 seconds and publication retries. A Cron call that fails at the caller while its owner run goes on, or two overlapping Cron runs, can also overlap. This is a source trace, not an executed reproduction.
- **Test gap:** `worker/conductor-import/cleanup.test.ts:79-133` sends `cleanup('all')` while a seal holds a bucket `put`. `worker/conductor-import/activation-cleanup.test.ts:28-69` widens a finished work record after it deletes the org row. No test sends `all` while a `work` deletion waits on the bucket.
- **Impact if no action:** The org purge removes the org records while private old documents stay in the bucket, with no record that can find them again. That breaks the purge rule and the Privacy promise above.
- **Root question:** How must org purge finish deletion of every imported object?
- **Options:**
  - **A.** Compare the captured group when the run saves its completion. Keep a changed group due, and return pending. Add the overlapping-delete regression. This repairs this transition directly. Effort: Small.
  - **B.** Store the requested and the completed cleanup scopes separately. Let each deletion advance only its captured completed scope. Use that difference for alarms, purge selection, and completion. Add the same regression. Effort: Medium.
    - B also changes the two direct group writes at `worker/conductor-import/reservation-data.ts:113-120` and `:157-164`, the due query, the purge selection, and the migration of the cleanup table.
  - **C.** Make the org purge reconcile every reservation prefix through its owner, also for records marked complete. Require a confirmed full deletion before the record purge. It adds repeated bucket work and makes ordinary completion records less reliable. Effort: Medium.
  - **D.** After every reservation owner reports done, the org purge deletes the whole import prefix of the org, through a new org-level method of the storage port, before `purgeOrgRecords`. Effort: Medium.
    - Add a regression with a finished `all` record and kept document keys. Update `worker/conductor-import/cleanup.md` and `worker/conductor-import/storage.md`, which say that only the owner deletes.
    - D removes kept objects of any cause at the purge, also causes that nobody found yet. It adds a second deletion path outside the owner. That is safe only because no write reaches a deleted org after its 7 days and after every owner finished.
    - D leaves the scope race open for a later `all` caller outside the purge.
- **Shared assumptions checked:**
  - Old documents stay through a work cleanup, by `docs/protocol/import-uploads.md:54-55`. Kept.
  - A request writes its group at once, before the serial queue. Kept. Its reason holds for open reservations, which take seals.
  - Only the owner of a reservation deletes its bucket objects, by `worker/conductor-import/cleanup.md:27` and `worker/conductor-import/storage.md:57`. Its reason is the order against seals and late uploads. In the purge, after every owner reports done, that reason is gone. D drops it.
  - The purge keeps its order: every owner first, then the record purge. Kept.
  - No protocol text or legal text changes, because both already promise the deletion. Kept.
- **Left out:**
  - Change nothing. It leaves private documents after a reported purge.
  - Delete both groups during ordinary work cleanup. It removes documents that members must keep.
  - A test alone. It detects the race but does not keep the deletion ownership.
  - Write the request inside the serial queue. A is better on every point: it is smaller and saves the wider request at once.
  - `blockConcurrencyWhile` around the deletion. A is better on every point. The callback resets the object after 30 seconds or a throw, and it stops every other import request.
  - Skip work cleanup while the org is deleted. A is better on every point. It depends on the purge timing and misses later widening callers.
  - A request version counter. A is better on every current point: it is the same compare at the same write, plus a migration.
  - A purge check that lists the prefix after done and keeps the org pending. It deletes nothing, so it fails the goal.
- **Wider fix:** B. A completed scope stays distinct from the requested scope in the whole cleanup state machine. D is a structural fix of a wider class, a purge that leaves import objects for any cause. D does not replace B, because it leaves the race open for callers outside the purge.
- **Previous examples:** No earlier cleanup-scope promotion was found. For the wider class, a decision that a run reads before a wait and applies after the state changed: [added-build-can-be-lost.md](added-build-can-be-lost.md), and commit `fb42989e`, "fix(members): close key and invitation revocation races". `worker/chat/attachment-cleanup.ts:38` keeps deletion ownership until the external deletion finishes.
- **History:** 2026-11-11, before the supplementary links: "None."
- **Related:**
  - [conductor-import-unstarted-archive.md](conductor-import-unstarted-archive.md): the same code. Its E and F request the existing work cleanup group at `worker/conductor-import/service.ts:267`. They must use the cleanup scopes that B here fixes, or they add a new trigger of this race.
- **Recommendation:** B. It removes the cause in the owner of the cleanup state, so each `all` request stays open until a full deletion, also for a later caller. D stays a sound extra hardening, and a later branch can add it after B.
  - The first review recommended B, and the finding check of 2026-11-11 kept B. The root kept B the same day.
- **Action:** fix after merge, apply B, because the import review used both of its fix rounds and this Rare High product bug is not critical.
  - The first review graded the category Security, and its Action was: "ask the user, because this security fix needs a third source fix round, which has no approval. This proposes an outcome only. The root owns the final action." The check corrected the category to Product bug.
- **Validation of the fix:**
  - Add the overlapping-delete regression: hold a `work` deletion on the bucket, send `all`, release the deletion, and assert that the `document/` keys are gone and that the record finishes only after a full deletion.
  - Assert the purge and Cron selections over a record whose requested scope is wider than its completed scope.
  - Keep every current assertion, guard, and time limit.
