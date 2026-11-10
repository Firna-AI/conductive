# The build log hides the snapshot time

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the plan `plans/parallel-image-repositories.md` on branch `calummoore/build-time-increase`.
- **Location:** `worker/lifecycle/image-build-steps.ts:54` and `worker/lifecycle/build-execution.ts:184`.
- **Reason:** The user chose per-repository times only, and a new log line is text that no requirement covers.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Org image build:** the job that makes the saved snapshot that each new cloud computer of an org starts from. It loads the repositories, installs the app's software, runs the install script, and saves the snapshot.
- **Background:**
  - The build log of the Cloud computer tab gets a heading line when a step starts: "Updating the repositories.", "Installing the cloud computer software.", and "Running the install script."
  - The snapshot step in `advanceBuildStep` of `worker/lifecycle/image-build-steps.ts` writes no line. So the log time of the last line marks the last output of the install script, not the start of the save.
  - On 2026-11-10, the install script of one org wrote no output. Its time and the save time showed only as one sum of 12 s to 17 s.
- **Problem:** No reader can split the install script time from the snapshot time of a build.
- **Impact if no action:** A slow save or a slow install script shows as the same number.
- **Root question:** How can a reader tell the time of the snapshot step of a build?
- **Options:**
  - **A.** Write a heading line when the snapshot step starts, for example "Saving the cloud computer image." Effort: Small.
  - **B.** Save the start time of the snapshot step in D1, with no log line. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. Each step writes its own heading.
- **Previous examples:** None found.
- **Recommendation:** A. It matches the headings of the other steps, and the log keeps its time.
- **Action:** ask the user, because A adds build log text that no requirement covers.
