# Cached reads look current in a question

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, wider fix of review finding 1.
- **Location:** `src/app/resource.ts:142`, `src/shell/settings/LeaveOrg.tsx:63`
- **Reason:** The direct fix of the Remove question landed with its own read. The shared change reaches other screens outside the diff.

- **Terms:**
  - **Resource:** the store of one kind of org data in the app model, such as the automations, with a cached value and reloads.
- **Background:**
  - A resource keeps its last good value and stays `ready` after a failed reload.
  - A question that counts data, such as the Remove question of a repository or Leave org, cannot tell a current value from an old one.
  - The Remove question now reads the automations into its own store at each opening. Leave org still counts owned workspaces from the shared cached list.
- **Problem:** Each question that needs current data must build its own read.
- **Impact if no action:** A later question can show an old count, as the Remove question did before its fix.
- **Root question:** How does a question know that the data it counts is current?
- **Options:**
  - **A.** Change nothing. Each question builds its own read. Effort: Small.
  - **B.** Give a resource a read state apart from its last good value: a read that started after a given moment, pending, answered, or failed. Move the Remove question and Leave org to it. Effort: Medium.
- **Left out:** A server endpoint for each count: it adds an API for each question.
- **Wider fix:** B.
- **Previous examples:** Commit `ec33f56b` unified the account sources after stale data reached chat inputs.
- **Recommendation:** B. It removes the case for every question.
- **Action:** fix after merge, apply B, because it changes a shared app store outside the diff.
