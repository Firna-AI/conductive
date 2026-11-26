# Dialogs take their pending state twice

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, wider fix of review finding 4.
- **Location:** `src/shell/ui/Dialog.tsx:49`
- **Reason:** The direct fix, a held-write test of the Remove question, landed. The shared change reaches 16 questions in 13 files.

- **Background:**
  - `Dialog` takes `busy`, which blocks Cancel, Escape, and a press outside while a write runs.
  - Each caller also gives the same pending value to its confirming button. 16 write questions in 13 files do this.
  - Only Leave org, Suspend, Lift, and now Remove repository have a test that holds the write.
- **Problem:** The two pending values can disagree, and most callers have no test that would see it.
- **Impact if no action:** A later change can let a question close while its write runs.
- **Root question:** How does a question keep its confirming button and its dismissal on one pending state?
- **Options:**
  - **A.** Add a held-write test to each question. Effort: Medium.
  - **B.** Let `Dialog` take the action that drives the confirming button, and derive `busy` from it. Keep an action that is off apart from a write that runs, so Cancel stays on while the action waits for other work. Effort: Medium.
  - **D.** One shared test helper for held questions in `src/test-support/`. Effort: Medium.
- **Left out:** A lint against `busy={false}`: five questions use it on purpose, and it is a new gate.
- **Wider fix:** B.
- **Previous examples:** Commit `fe605f834` added the held tests of Leave org.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because it changes a shared dialog and its callers outside the diff.
