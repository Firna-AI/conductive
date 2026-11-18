# GitHub branch names show without the secret mask

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from checked review finding 4 on `calummoore/merge-main-with-latest-9orf`.
- **Location:** `src/shell/workspace/github/merge-latest.ts:45`, `src/github/bannerParts.tsx:97`, `src/github/bannerStatus.ts:87` and `:121`, `src/shell/workspace/ContinueDialog.tsx:38`, `worker/github/app-handler.ts:34` and `:49`, and `worker/github/delivery-receipt.ts:17`.
- **Reason:** The pull request bar on `main` already shows the raw names. The Merge latest row repeats that gap, so one fix for every GitHub screen costs the same later.

- **Terms:**
  - **Masked label:** the text that a screen shows in place of a path or a branch name, with each exact copy of a secret value hidden.
  - **GitHub state:** the banner record that the Worker sends to the browser, from a stored read, a fresh read, or a `github.updated` event.
- **Background:** `docs/protocol/tokens-and-secrets.md` says that screens show a separate masked label of each path and branch name. The browser gets the real names, because reads and prompts need them (decision 145). The file data already carries a masked label, `displayBaseBranch`, which the Worker builds with `OutputSanitizer` and `baseLabel` of `src/shared/output-fields.ts`.
- **Problem:** The GitHub state carries no masked label. So the pull request bar, the Continue dialog, and the Merge latest row of the command palette show the raw `branch` and `baseBranch`. A branch name with an exact copy of a secret value shows that value on screen.
- **Impact if no action:** A screenshot of the workspace can hold a secret value that the app should hide.
- **Root question:** How does each screen that names a GitHub branch show a masked label, while prompts and Git steps keep the real name?
- **Options:**
  - **A.** Give the Merge latest row the generic label "Merge latest target branch". Fixes the row only, and changes the approved design. Effort: Small.
  - **B.** Show the masked `displayBaseBranch` of the Changes report in the row when its base equals the banner base, else the generic label. Browser only. Fixes the row only. Effort: Small.
  - **C.** Add optional `displayBranch` and `displayBaseBranch` to the GitHub state on each path: the stored read, the fresh read, and the `github.updated` events. Reuse the masking of the file data. The bar, the Continue dialog, and the Merge latest row show them. Prompts keep the real names. An older client ignores the fields, and a new client falls back to the raw name when they are missing. Effort: Medium.
- **Left out:** Sending the secret values to the browser for masking there exposes stored credentials.
- **Wider fix:** C.
- **Previous examples:** Commit `216ed6791` split real paths and base refs from masked labels for the file data.
- **Recommendation:** C. It gives every GitHub screen one masked source, and it needs no protocol change.
- **Action:** fix after merge, apply C, because the gap exists on `main` already and one fix covers every screen.

Add a regression for each screen with a marked fake value in the base branch. Assert the exact masked label on screen and the exact real name in the prompt.
