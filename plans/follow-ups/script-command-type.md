# A new runner can still run a saved script its own way

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, the split wider fix E of round 2 finding 17.
- **Location:** `worker/lifecycle/build-execution.ts`, `worker/lifecycle/image-software.ts`, and `worker/lifecycle/disk-retention.ts`.
- **Reason:** the direct fix, one shared builder, lands in PR #21. The type reaches about eight read sites outside that fix.

- **Background:** Three runners ran the saved install and startup scripts with `sh` on their own, so Bash scripts failed. PR #21 gives them one shared builder that runs Bash.
- **Problem:** A fourth runner can still write its own command line for a saved script.
- **Impact if no action:** The same defect can come back with the next runner.
- **Root question:** How does every saved script reach a command only through the shared builder?
- **Options:**
  - **E.** Give the saved script a type that only the builder turns into command text, as `MaskedStartLog` does for start logs. Wrap the text where the lifecycle reads it from D1 and from the stored start job. Effort: Medium.
- **Left out:** A lint, because a type prevents the case at less cost.
- **Wider fix:** E.
- **Previous examples:** PR #21 findings 9 D and 17.
- **Recommendation:** E.
- **Action:** fix after merge, apply E, because the direct fix already removes the defect.
