# installTerminalService has no production caller

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the check of finding 6 in review round 1 of the branch `calummoore/porto-6ebg`.
- **Location:** `worker/terminal/service.ts` (`installTerminalService`), `worker/terminal/README.md`.
- **Reason:** the review found it in code that the branch did not change.

- **Background:** `installTerminalService(provider, sandboxId)` runs the terminal install command as one waiting command. Its comment says "Call during each org image build". The image builds run the same command inside `installImageSoftware` instead. Only tests call `installTerminalService`, on the branch and on `origin/main`.
- **Problem:** The function and its comment describe a path that the product does not use.
- **Impact if no action:** A reader can think that the image build calls it, and a change to it has no effect.
- **Root question:** Does the terminal backend need a separate install hook?
- **Options:**
  - **A.** Remove `installTerminalService`, its tests, and its README text, as dead code. Effort: Small.
  - **B.** Keep it, and correct its comment and the README. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. No caller needs it.
- **Action:** ask the user, because the review found it outside the branch.
