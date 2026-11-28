# The Mokly publish check stops at its time limit

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-28, from the CI of pull request #706, branch `calummoore/remove-drag-to-merge-queue-p999`.
- **Location:** the `Mokly` check of the `mokly-ai` GitHub app, which runs `mokly publish --config mokly.config.json`; `mokly.config.json`; `docs/mockups/`.
- **Reason:** the cause is not known, and the time limit belongs to the Mokly cloud service, outside this repository.

- **Source:** CI. **Category:** Process.
- **Terms:**
  - **Mokly check:** the check that publishes the mockup catalogue of each commit to mokly.ai.
- **Background:** The `Mokly` check is not one of the checks that the `Protect main` ruleset requires. The local `npm run mockups:check` builds the same catalogue, 26038 files, and passes.
- **Problem:** The check ends with "Unable to publish" and "Publishing reached the time limit. Try again." after 15 minutes. It fails on `87f2f08e3` (pull request #706) and on the two newest `main` commits, `27d9595fe` and `3371d05f2`. The log stops during `mokly publish`, after the build starts.
- **Impact if no action:** No pull request gets a published catalogue to review, and the red check hides a real mockup failure.
- **Root question:** How does the catalogue publish within the time limit of the Mokly service?
- **Options:**
  - **A.** Raise the publish time limit in the Mokly service. Effort: Small, outside this repository.
  - **B.** Find what makes the publish slow, such as the number of pages or the upload, and make the catalogue or the Mokly publish faster. Effort: Medium.
  - **C.** Check whether pull request #705, which upgrades Mokly to 0.22.0, changes the publish time. Its own `Mokly` check also fails. Effort: Small.
- **Left out:** A rerun only, because the check fails on three commits in a row.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** C first, then A.
- **Action:** ask the user, because the cause is not known and the time limit is a setting of a service outside this repository.
