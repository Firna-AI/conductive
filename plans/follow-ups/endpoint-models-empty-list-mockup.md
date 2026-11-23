# No mockup draws an endpoint model list that names no model

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from Milestone 2b of the org agent login work on branch `calummoore/delft-zjk2`.
- **Location:** `src/ui/components/settings/EndpointModels.tsx:21-26` and `src/shell/account/EndpointModels.tsx:15-26`.
- **Reason:** the account pages that miss the state belong to `main`, and the org login branch only records the words of the org line.

- **Source:** Implementation. **Category:** Mockup.
- **Background:** The app shows a line when the model list of an own endpoint names no model of the app: "Your model pickers show ..., but this endpoint lists none of them." The mockup part `EndpointModels` draws only the line for hidden models. So no mockup page draws this state, on the account page or on the Agents tab of the org settings. On 17 November 2026 the org login work recorded the org words as a design call: "the model pickers on this login".
- **Problem:** The mockups do not draw every state of the app's part.
- **Impact if no action:** The visual spec misses one state, and a later change to its words has no mockup to follow.
- **Root question:** How do the mockups and the app agree on the line for a list that names no model?
- **Options:**
  - **A.** Draw the state in the mockup part, on the account page and on the Agents tab, with the words of the app. Effort: Small.
- **Left out:** Change nothing, because the mockups stay incomplete.
- **Wider fix:** A. The mockup part then holds every state of the app's part.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it changes account pages outside the org login change.
