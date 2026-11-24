# Masked-paths list tabs open the plain lists

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the round 3 finding checks found outside the scope.
- **Location:** `docs/mockups/src/components/files/FileTabs.tsx:17` and `docs/mockups/src/components/workspace/tools.ts:44`.
- **Reason:** The links are already on `main`, and the change that found them only touched the large-branch example.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/components/files/FileTabs.tsx:17` and `docs/mockups/src/components/workspace/tools.ts:44`.
- **Terms:**
  - **Masked paths:** Catalogue screens such as `app/chat/masked-paths/changes`, where file labels that hold a secret show as "[redacted]".
- **Background:** The masked-paths screens show the Files panel with masked rows. Their file previews already link back to masked pages, through `docs/mockups/src/screens/workspaceFileTab.ts`.
- **Problem:** On a masked-paths screen, the All files tab, the Changes tab, and the phone's Files tab open `app/files` and `app/files/changes`. One press then removes the "[redacted]" rows.
- **Impact if no action:** A catalogue reader sees the masked example switch to the plain example.
- **Root question:** How do the list links of the masked example stay in that example?
- **Options:**
  - **A.** Give the masked example its own list destinations at these call sites. Effort: Small.
  - **B.** Add the masked pages to the link table of the large-branch example in `docs/mockups/src/limitedListPaths.ts`, so that the link layer chooses each destination. Effort: Small.
- **Left out:** A note in the screen text. The lists would still change.
- **Wider fix:** B. One table then chooses every example's destinations.
- **Previous examples:** Commit `216ed6791` added the masked back links.
- **Related:** None.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the links are on `main` and are outside the scope of the change that found them.
