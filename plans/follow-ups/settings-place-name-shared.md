# Give Account settings one shared name

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, the wider fix of a review finding.
- **Location:** `worker/chat/session-login.ts:163`, `src/shell/settings/settings-tabs.ts`, the title of the Account group, and `src/app/palette/palette-rows.ts`, the label of the Account group of the palette.
- **Reason:** The shared name changes Worker and shared code outside the files of the Settings branch.

- **Terms:**
  - **Account settings:** the Account group of Settings, which holds the tabs General, Agents, Preferences, Keyboard shortcuts, and Stats, as `docs/protocol/settings.md` says.
  - **Failed-turn cause:** the text that the chat shows when the Worker refuses to run a turn.
- **Background:** Settings replaced the Account page on 20 November 2026. The Settings branch renamed every text by hand, also the failed-turn cause of an own endpoint without a public host, which now says "Update the login in Account settings." The code writes the name in several places: the Worker text, the group title of Settings, and the group label of the palette.
- **Problem:** A text in code names the place of the account settings with its own string. The rename missed the Worker text at first, and a later rename can miss one again.
- **Impact if no action:** A later change of the name can leave a text that names a place that no longer exists.
- **Root question:** How does every text in code name the place of the account settings in one way?
- **Options:**
  - **A.** Change nothing, and keep the search that the `documentation` skill asks for at each rename. Effort: Small.
  - **B.** Add one constant for the name in `src/shared/`, as `src/shared/brand.ts` gives the product name. The Worker text, the group title of Settings, and the palette label use it. Docs, guides, legal pages, and test names keep their prose. Effort: Medium.
- **Left out:** A link to the Agents tab inside the failed-turn cause. It changes a recorded chat field, so it needs the user, and B meets the goal without it.
- **Wider fix:** B.
- **Previous examples:** `src/shared/brand.ts` holds the product name for all code, so one change renames the product.
- **Recommendation:** B. A later rename then changes every text in code at once.
- **Action:** fix after merge, apply B, because it reaches Worker and shared code outside the files of the branch.
