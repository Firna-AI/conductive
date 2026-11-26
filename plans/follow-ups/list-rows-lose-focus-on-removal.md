# List rows lose focus when a render removes them

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-22, from branch `calummoore/model-configuration-variations-v2-87rl`, review finding 31, the wider fix of that finding and two problems outside its scope.
- **Location:** `src/shell/ui/lost-focus.ts`, `src/shell/automations/TriggerList.tsx:83`, `src/shell/automations/LoginField.tsx:49`
- **Reason:** The model favourites change fixed its own list in the Favourites section with a rule local to that section, and the two automation lists have the defect on `main` already.

- **Terms:**
  - **Lost focus:** the browser moves the keyboard focus to the page body when a render removes the focused control.
  - **`useLostFocus`:** a hook in `src/shell/ui/lost-focus.ts`. An open layer, such as a menu, uses it to take the focus back after a render. It moves any focus that fell to the page, so it suits a layer that owns the focus, not a list on a page.
- **Background:**
  - The Favourites section of Preferences removes a row at once on ×, and also when a save reply drops a copy or an add fails.
  - The model favourites change, on 22 November 2026, added a rule in that section only: when a render takes the focus from the list, the section gives it to the same control at the same place, else to that control in the last row, else to Add a favourite. It moves nothing when the focus was outside the list.
  - The trigger list of an automation removes its focused × button on a press, at `src/shell/automations/TriggerList.tsx:83`. Nothing gives the focus back.
  - The login chips of an author filter on a computer remove their focused × button on a press, at `src/shell/automations/LoginField.tsx:49`. Nothing gives the focus back.
- **Problem:** Each list that removes a focused row must solve lost focus on its own, and two lists on `main` do not.
- **Impact if no action:** A keyboard user who removes a trigger or a login chip loses the focus, and must find the list again from the top of the page.
- **Root question:** How does each list on a page keep the keyboard focus when a render removes its focused control?
- **Options:**
  - **A.** Give the trigger list and the login chips their own local rule, as the Favourites section has. Effort: Small.
  - **B.** Add a region form of the rule beside `useLostFocus` in `src/shell/ui/lost-focus.ts`. It gives the focus back only when a render took it from inside the region, and the owner gives the target. Move the Favourites section, the trigger list, and the login chips to it, with tests, and document it in `src/app/key-code-layers.md`. Effort: Medium.
- **Left out:** A list with one tab stop and arrow keys between rows: it changes the Tab order and the Alt with Up or Down moves of the ordered lists.
- **Wider fix:** B. One rule then serves each list.
- **Previous examples:** Commit `1be509bef`, "fix(menus): recover focus when menu actions leave", added `useLostFocus` for open layers, for the same class of defect.
- **Related:** `plans/follow-ups/resume-bar-drops-focus.md` holds the same class in the chat footer: the stopped bar leaves while its Resume button has the focus. Its wider fix is option B here, with the chat footer as a region, so one branch can build the rule for both items.
- **Recommendation:** B. It fixes both lists on `main` and keeps one rule for every later list.
- **Action:** fix after merge, apply B, because the change that found it fixed its own list, and the other two lists are outside its scope.
