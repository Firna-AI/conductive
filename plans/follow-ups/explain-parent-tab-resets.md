# Parent tab of the Explain tab page resets

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, a problem outside the scope that the check of review finding 43 of round 1 found.
- **Location:** `docs/mockups/src/screens/workspaceTabs.ts:186`, the link of the first session tab in `tabsFor`.
- **Reason:** The link is on `main`, and the change that found it fixed only the links of the marked tabs.

- **Terms:**
  - **Catalogue:** the Mokly mockup site of `docs/mockups/`. Each page draws one fixed state, and a link opens a fixed page.
  - **Explain:** the feature that opens a separate session to explain selected chat text. A mark stays on the quote in the parent chat, and the session can have its own tab at the end of the tab row.
  - **Parent tab:** the session tab of the chat that holds the quote. In the catalogue, it is the first session, Address autocomplete.
- **Background:**
  - The catalogue page `app/chat/explain/tab` shows the tab of the answered explanation of Cal after Expand, at the end of the row. The parent chat keeps the mark of the quote.
  - `tabsFor` gives the first session tab the link `paths.app`, unless the state names another page, such as a linked session.
  - `parentPage` in `docs/mockups/src/screens/explainModel.ts:151` gives the page of the parent chat for an Explain state. The close button of the popover links there. For an answered explanation, it gives `app/chat/explain/marks`, which draws four explanations, and the one of Cal waits there.
  - `app/chat/explain/marks` already has five screens: its own page and four variants.
- **Problem:** On `app/chat/explain/tab`, a press on the parent tab opens `app`, the plain workspace page. That page has no Explain mark in the chat and no Explain tab in the row.
- **Impact if no action:** A catalogue reader sees the explanation disappear after one press on the parent tab.
- **Root question:** Where does the parent tab of an Explain page lead, so that the reader stays in the example?
- **Options:**
  - **A.** In `tabsFor`, give the parent tab the link of `parentPage(state)` when the state has an open explanation, as the close button of the popover does. The reader then sees four explanations, and the one of Cal waits. Effort: Small.
  - **B.** Draw no link on the parent tab of an Explain page that has no page of the parent chat in the same state. Effort: Small.
  - **C.** Add a child page of `app/chat/explain/marks` that draws the parent chat with the one answered explanation of Cal and its tab. Link the parent tab of `app/chat/explain/tab` there. Effort: Small.
- **Left out:** The link to `app` of today, because it drops the explanation.
- **Wider fix:** None here. `plans/follow-ups/mockup-link-state-check.md` holds the check that would find this class of link.
- **Previous examples:** `plans/follow-ups/masked-paths-list-links-reset.md` and `plans/follow-ups/saved-list-links-keep-notice.md` hold other links that leave their example.
- **Related:** `plans/follow-ups/mockup-link-state-check.md` asks for a check that finds such links. This item is one of the resets on `main` that the check would report, and the check does not fix it.
- **Recommendation:** C. The reader then sees the same explanation in the same state, and only the shown tab changes.
- **Action:** fix after merge, apply C, because the link is on `main` and outside the change that found it.
