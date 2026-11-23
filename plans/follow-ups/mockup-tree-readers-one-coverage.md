# Mockup chip readers ignore the limited tree

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix that the agent split off review finding 7 of round 3.
- **Location:** `docs/mockups/src/components/chat/chatReading.ts:26`, `docs/mockups/src/screens/workspaceRowMenu.ts:53`, and `docs/mockups/src/screens/composerFor.ts:125`.
- **Reason:** The fix reaches chat reader parts that many catalogue pages render, and no limited screen yet draws a chip or a row menu on a path that only one coverage holds.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/components/chat/chatReading.ts:26` (`findEntry` and `mockupEntry`), `docs/mockups/src/screens/workspaceRowMenu.ts:53` (`rowMenuOf`), and `docs/mockups/src/screens/composerFor.ts:125`.
- **Terms:**
  - **Limited tree:** All files on a large branch. The cloud computer keeps at most 50,000 entries and counts the rest.
  - **Coverage:** The set of paths that one reader of the file tree can find.
  - **Workspace state:** The props of the mockup `WorkspaceScreen`. Its `lists` value selects the complete or the limited lists.
- **Background:** Cal's decision of 23 November 2026 for runner file report limits says that file mentions, chat file chips, answer links, and Add to chat use the one tree that All files shows. The mockups draw a large branch whose tree leaves out some paths, such as `tsconfig.json`. The `@` list of the mockups reads its coverage from the workspace state. The chip readers in `chatReading.ts` and Add to chat in `rowMenuOf` always read the complete fixture data.
- **Problem:** On a limited screen, a chip reader or Add to chat can still offer a path that the limited tree leaves out. Today no limited screen draws such a chip or row menu, so no page shows the mismatch.
- **Impact if no action:** A later limited state that draws a chip or a row menu on a left-out path would show a chip that the product would not draw.
- **Root question:** How do all mockup readers of the file tree show the coverage of the workspace they draw?
- **Options:**
  - **A.** Fix each new limited state by hand when it needs a chip. Effort: Small.
  - **B.** Give every reader of the workspace tree one coverage that the workspace state selects. Pass it to `findEntry` and `mockupEntry` through a context that `WorkspaceScreen` sets, with the complete data as the default. Pass it to `rowMenuOf` and to `composerFor`. The strict build must show no change to the saved pages of the complete example. Effort: Medium.
- **Left out:** A search of the full branch, because the decision of 23 November 2026 keeps one tree for mentions.
- **Wider fix:** B. Each reader then follows the workspace state.
- **Previous examples:** Commit `93bcefa91` gave the shared chat readers the mockup file tree.
- **Related:** None.
- **Recommendation:** B. It removes the mismatch for every reader.
- **Action:** fix after merge, apply B, because it reaches chat parts that many pages render and no page shows the mismatch yet.
