# A visible hint for the keys of a code field

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Open. It waits for the user.
- **Added:** 2026-11-23, from finding 3 of the review of branch `calummoore/code-editor-recommendations-c775`.
- **Location:** `src/files/code/CodeField.tsx`, the code field of the install script and the startup script on the Cloud computer tab.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Code field:** the field with line numbers and shell colours in which an admin edits a script of the cloud computer.
- **Background:** In a code field, Tab indents and Shift+Tab outdents, so Tab does not move the focus. Escape, then Tab, moves the focus out of the field. The branch gave the field a description that a screen reader reads with the field. The screen shows no hint.
- **Problem:** A sighted keyboard user does not see how to leave the field.
- **Impact if no action:** Such a user can press Tab many times and only indent the script, until the user tries Escape.
- **Root question:** How does a sighted keyboard user find the way out of a code field?
- **Options:**
  - **A.** Keep the hint for screen readers only. Effort: Small.
  - **B.** Show the hint as a muted line under the field while the field has the keyboard focus. Change the mockup first. Effort: Small.
  - **C.** Let Tab move the focus, and indent with Tab only after the user types in the field, or with a switch. Effort: Medium.
- **Left out:** An editor library, because the keys stay the same.
- **Wider fix:** None. The one shared field already owns the hint.
- **Previous examples:** `plans/follow-ups/terminal-keyboard-trap.md`.
- **Recommendation:** B. It shows the way out where the user needs it, and it changes no key.
- **Action:** ask the user, because a visible hint adds text to a screen and the options have real trade-offs.
