# A builds read after a save can be stale

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, a new problem that the check of finding 1 of review round 1 found, branch `calummoore/new-repo-build-recreation`, plan `plans/added-repository-builds.md`.
- **Location:** `src/app/settings-actions.ts:24`, `src/app/computer-model.ts:152`, the resource and refresher code under `src/app/` that joins a running read.
- **Reason:** the stale answer needs a builds read that is already running at the moment of the save, and the next poll corrects it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Builds reply:** the answer of the builds path of the org settings. It holds the builds and `changes`, the saved changes that the org image does not hold.
  - **Repository notice:** the notice of the Repositories tab and the Cloud computer tab while a repository change waits for a build.
- **Background:**
  - After a repository save or an install script save, the app reads the builds again, so that the notices show at once.
  - When a builds read is already running, the new read joins it, so it gets the answer of a request that started before the save.
  - The app polls the builds every 5 seconds while a build runs, and every 30 seconds otherwise.
- **Problem:** When a builds read runs at the moment of a save, the notices can show the state from before the save for up to 30 seconds. After an add, the Repositories tab can then show that the repository waits for the next build, with Build computer, while its build already runs.
- **Impact if no action:** In a rare window, an admin sees an old state for up to 30 seconds. A press of Build computer then returns the running build and does no harm.
- **Root question:** How does a read after a save always reflect that save?
- **Options:**
  - **A.** A read after a save starts a new request when a read is already running, after that read ends, and keeps the newer answer. Effort: Small.
  - **B.** The repository save and the script save return the new builds reply in their answer, and the app stores it. Effort: Small.
  - **C.** Each read carries a sequence number, and the store drops an answer that started before the newest save. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. Every read that follows a write then reflects the write, for each resource.
- **Previous examples:** None found.
- **Recommendation:** A. It fixes the class in the shared resource code.
- **Action:** fix after merge, apply A, because the likelihood is Rare and the fix gets no harder after the merge.
