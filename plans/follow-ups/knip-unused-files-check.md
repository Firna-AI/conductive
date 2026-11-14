# Find unused files in the gate

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-14, from branch `calummoore/porto-vtqz`, PR #342, review item 309, the wider fix of findings 5 and 103.
- **Location:** `knip.jsonc:3`.
- **Reason:** It adds a check to the gate, and the user did not answer before the merge.

- **Terms:**
  - **knip:** the tool behind `npm run exports:check`. Today it checks only unused exports and types.
- **Background:** Two findings of the review found code that stayed behind after a move: an old terminal installer that only tests used, and a credential mapper that nothing imported. The gate passed with both, because knip checks only exports. A trial run with knip's `files` check listed 12 unused files, the mapper among them, plus generated files and files that load by path.
- **Problem:** The gate cannot see a whole file that a move leaves unused, or code that only tests use.
- **Impact if no action:** Later moves can leave more dead code behind.
- **Root question:** Should the gate fail on unused files?
- **Options:**
  - **A.** No new check. Effort: Small.
  - **B.** Add knip's `files` check. Add entries for files that load by path or convention, such as the worker test entries, `src/marketing/content.config.ts`, and `worker/lifecycle/image-runtime.ts`, and ignore `src/shared/generated/`. Effort: Small.
  - **C.** B, plus a production pass that ignores test imports. Cost: the first run needs a triage of test seams. Effort: Medium.
- **Left out:** An ESLint unused-module rule, because B reuses the knip step that the gate already runs.
- **Wider fix:** B.
- **Previous examples:** The terminal installer and the credential mapper of this change.
- **Related:** None.
- **Recommendation:** B. Its trial run found a real dead file, at a small cost.
- **Action:** ask the user, because it adds a new gate check.
