# Privacy page includes an internal decision reference

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the documentation work on branch `conductor/conductor-prompts`.
- **Location:** `src/marketing/privacy.ts`, the Security item about real file paths and branch names.
- **Reason:** the internal reference already exists on main, in a sentence that the agent instructions change does not modify.

- **Source:** Implementation. **Category:** UX wording.
- **Terms:**
  - **Privacy page:** the public notice at `conductive.build/privacy`, from `src/marketing/privacy.ts`.
- **Background:** The Privacy page tells visitors which data the app uses and who receives it. One Security item explains that the browser receives real file paths and branch names. Its last sentence ends with "(decision 145)".
- **Problem:** The number names an internal decision record. A visitor cannot use that reference.
- **Impact if no action:** The public notice keeps an internal reference that has no meaning for its readers.
- **Root question:** How does the Privacy page state this fact without an internal reference?
- **Options:**
  - **A.** Remove only "(decision 145)" in the feature branch that found it. The rest of the sentence stays. Effort: Small.
  - **B.** Make the same wording change in a separate branch. The feature branch stays within its changed facts. Effort: Small.
- **Left out:** A new test or lint for internal decision references, because it adds a gate that no user requested. No third approach is needed for this wording removal.
- **Wider fix:** None. The existing product copy rules already keep internal details out of public text.
- **Previous examples:** The reference exists in the Privacy source on main at `039e087`.
- **Related:** [privacy-branch-name-rule.md](privacy-branch-name-rule.md): the same Privacy page. One docs-only branch can carry both corrections, preserving every personal-data fact.
- **Recommendation:** B. The reference is outside the changed facts of the agent instructions feature.
- **Action:** fix after merge, apply B, because the unmodified sentence belongs to a separate wording change.
