# Retire the old file projection reader

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-23, from `calummoore/object-memory-history-and-files-state-14g5`.
- **Location:** `worker/files/storage.ts`, `worker/files/bucket-convert.ts`, `worker/files/legacy-list.ts`.
- **Reason:** Idle workspaces can keep the old layout, and the reader release can write it during a rollback.

**Terms**

- **Projection** means the cached file tree and branch changes in workspace Durable Object storage.
- **Old layout** stores each list as one JSON text in chunks. **Bucket layout** stores each list in 64 buckets and keeps its order in a separate text.

**Background**

On 23 November 2026, Cal approved keeping the old-layout reader with no end date. The Files and Changes APIs serve the last complete reports while the cloud computer sleeps. The writer converts an old projection when it first writes a list or marks the tree unavailable. A workspace that stays idle can keep its old record under `files:state:v1`. The reader release at `aeaf6234d` reads the bucket layout and writes the old layout during rollback.

**Task**

Remove the old-layout reader when each stored projection uses the bucket layout and each supported rollback target writes the bucket layout. Remove the old-layout conversion and its test fixtures after both checks pass.

**Impact if no action**

The Worker continues to maintain both readers and the conversion path. Idle workspaces keep access to their cached lists.

**Needs**

- A stored-data check that covers idle workspaces and proves every projection uses the bucket layout. If old projections remain, convert them in a pass that the user approves and verify the stored layout again.
- A check of the supported rollback targets. The reader release must be outside that set.

**Done when**

The stored-data and rollback checks pass. The Workspace Files reader and writer use the bucket layout for each stored projection.
