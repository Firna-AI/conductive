# Repository watcher stops after one error

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/no-response-issue-l1pn`.
- **Location:** `crates/cnd-runner/src/watcher/service.rs` (the `monitor` loop), `crates/cnd-runner/src/watcher/linux.rs` (`add_tree` and `LinuxWatch::changed`).
- **Reason:** The fix of the stuck idle update does not need it, and the cause of the watcher error on the live sandbox is not yet known.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Repository watcher:** the inotify watch of the runner on the repository folder. It starts a file scan after each burst of changes, so the All files and Changes lists update live.
- **Background:**
  - The runner watches every folder of the repository with inotify. That includes ignored folders such as `.context/`, `target/`, and `node_modules/`.
  - `add_tree` adds a watch for each new folder. Any error other than a vanished path ends `LinuxWatch::changed` with an error.
  - The `monitor` loop then logs "The repository watcher is unavailable." and leaves its loop. No code opens the watch again until the next runner start.
  - On 20 November 2026 the runner of workspace W-153 logged this warning at 17:29:04 UTC. Its repository folder held 6.3 GB in 87,856 files under `.context/`.
  - The cloud computers allow 65,536 inotify watches for each user, and every program of the user shares that limit. A full limit makes `inotify_add_watch` fail with `ENOSPC`. This is the likely cause, but no log confirms it.
- **Problem:** After one watcher error, the file lists of the workspace stop updating live until the runner starts again. The member gets no notice.
- **Impact if no action:** Members see old file lists and old changes in large workspaces until a restart, and they cannot see why.
- **Root question:** How do the file lists stay current when the repository watch fails?
- **Options:**
  - **A.** Open the watch again after a delay, with a limit on the tries. A full watch limit then fails again. Effort: Small.
  - **B.** When the watch fails, fall back to a timed scan, such as once each 30 seconds, and try the watch again later. The scans cost more on a large repository. Effort: Medium.
  - **C.** Watch only the folders that Git does not ignore, plus `.context/`, so that large build folders use no watches. A change in an ignored folder then shows only at the next scan. Effort: Medium.
- **Left out:** A higher inotify limit in the software image, because it only moves the limit and other programs share it.
- **Wider fix:** C, because it removes the main use of the watch limit.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the lists current in each case, and the hash reuse of the stuck idle update fix keeps each scan cheap.
- **Action:** Ask the user, because B adds a new timed scan, and C changes which file changes show live.
