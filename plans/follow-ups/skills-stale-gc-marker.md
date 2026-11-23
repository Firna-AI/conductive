# A stale skills GC marker can block cleanup

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, a new problem from the independent check of review finding 407.
- **Location:** `crates/cnd-runner/src/skills/files.rs:46-61`, `crates/cnd-runner/src/skills/git.rs:61-65`, `crates/cnd-runner/src/skills/sweep.rs:91-96`.
- **Reason:** The failure needs unusual process or host state, and the branch has used its two source review fix rounds.

### 1. A stale skills GC marker can block cleanup

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Performance.
- **Location:** `crates/cnd-runner/src/skills/files.rs:46-61`.
- **Terms:**
  - **Git store:** The runner-owned bare repository that supplies complete skills copies.
  - **GC marker:** Git's `gc.pid` file, which records the process ID and host name of a garbage-collection process.
- **Background:** Skills reclamation runs `git gc --prune=now`. The runner gives each Git child 30 seconds and kills its process group when the call stops. Before later Git work, `recover_locks` removes `*.lock` files but leaves `gc.pid`.
- **Problem:** A killed garbage collector can leave its marker. Git refuses a recent marker when its recorded host differs from the current host, or its process ID appears active. The refusal can last until the marker is 12 hours old. A marker for a dead process on the same host is ignored, so a leftover marker alone does not prove a failure.
- **Impact if no action:** Git reclamation can keep failing after a stop, host change, or process-ID reuse. Unreachable Git objects then remain longer. The separate startup-availability follow-up prevents these cleanup failures from hiding usable skills.
- **Root question:** How does the owned Git store recover cleanup after a killed garbage collector?
- **Options:**
  - **A.** Extend recovery of the owned Git store to stale GC markers. First establish that all Git children of its previous call have exited. Keep the single serial owner and cover the stale-host case through the existing Git fixture. Effort: Small.
  - **B.** Run garbage collection with `--force` after establishing exclusive ownership of the Git store. This avoids stale marker checks but must never overlap another garbage collector. Effort: Small.
  - **C.** Replace the Git store at each runner start while retaining complete exported copies. This drops all stale process state, but requires a new fetch and loses the persistent cache. Effort: Medium.
- **Left out:** A longer command timeout does not clear a stale marker. Retrying the same command preserves the refusal. Deleting markers without exclusive ownership could overlap a live garbage collector. Removing exported skills copies would break retention of the last good copy.
- **Wider fix:** A makes one recovery owner handle the process markers of the Git children it owns.
- **Previous examples:** `recover_locks` already recovers stale ordinary Git locks in the same store. No previous GC-marker failure was found in the follow-up records.
- **Related:** `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md` separates cleanup from publication. Apply that fix independently. This item concerns recovery of reclamation itself.
- **Recommendation:** A. It retains normal Git locking while removing stale state from children whose lifetime the runner owns.
- **Action:** fix after merge, apply A, because this conditional case is rare and no runtime failure was reproduced.

## Evidence and verification

The working agent read upstream Git v2.43.0 `builtin/gc.c`, in
`lock_repo_for_gc`. Lines 464-479 check the marker's age, recorded host,
and process. Lines 689-694 reject a conflicting explicit GC call with
`gc is already running on machine ... (use --force if not)`.

No sandbox host change, process-ID reuse, or stale-marker failure was
reproduced. Confirm the actual host and process behavior before changing
recovery. Keep Git children bounded and keep selection, link, and lease
checks. Do not assume that a killed child on the same host causes this
failure. Extend the existing recovery fixture rather than testing Git's
private parser or adding a timing test.
