# Each build job keeps a copy of the install script

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/build-image-install-order`, a new problem of the options check of decisions 28 and 29 of the software image plan.
- **Location:** `worker/lifecycle/build-admission-data.ts`, the insert into `image_build_jobs`.
- **Reason:** refreshes already copied the script before the software image plan, and the plan changes only how often refreshes run the script.

- **Terms:**
  - **Build job:** the row of one build or one refresh of an org image in the D1 table `image_build_jobs`.
- **Background:**
  - Each build job copies the whole install script into its row, up to about 1 MB under the default body limit.
  - Only the purge of a deleted org deletes these rows.
  - Refreshes run up to 49 times a day for an org with many pushes, and each one adds a row with a copy.
- **Problem:** The copies of the same script grow without limit in the shared D1 database.
- **Impact if no action:** One busy org adds many megabytes of identical script text each day.
- **Root question:** How does a build job know its install script without a copy for each job?
- **Options:**
  - **A.** Store each distinct install script once, keyed by its revision, and keep only the revision in each job row. Effort: Medium.
  - **B.** Delete the script copy of a finished job, and keep the copy of the newest good build, which a refresh reuses. Effort: Small.
- **Left out:** Change nothing, because the copies keep growing. Only the store and the deletion can bound them, so there is no third approach.
- **Wider fix:** A. One copy for each revision bounds the text for any number of jobs.
- **Previous examples:** None found.
- **Recommendation:** A. It removes the copies and keeps each job's script exact.
- **Action:** fix after merge, apply A, because the problem is outside the software image plan.
