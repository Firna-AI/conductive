# An older app drops the saved terminal

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from the second merge of `main` into the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `worker/app-api/workspace-view.ts`, `src/shared/workspace-view-wire.ts` (`viewFromWire`, `viewReply`), `docs/protocol/terminal.md` ("Terminal tabs", the saved view rule).
- **Reason:** The recommended option adds a rule for saves that have no `terminal`, which no requirement states.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **Saved view:** what the server keeps for each member in each workspace, such as the open tabs and the shown tool. Terminal tabs added an optional `terminal`, the ID of the shown terminal.
  - **Older app:** a Mac app build from before terminal tabs. It bundles the web app of its own version, which does not know `terminal`.
- **Background:** Each save sends the whole view, and the Worker stores what the save holds. A save without `terminal` therefore clears the stored terminal. For Preview tabs, main's PR #421 keeps the stored tabs when a save from an older app has none.
- **Problem:** Each save from an older app removes the member's saved terminal.
- **Impact if no action:** After a member used an older Mac app, the current app shows Terminal 1 instead of the member's last terminal at the next load. No terminal closes. The effect ends when the Mac app updates.
- **Root question:** What happens to the saved terminal when a save does not name one?
- **Options:**
  - **A.** Keep the rule: a save without `terminal` clears it. Effort: Small.
  - **B.** Keep the stored terminal when a save has no `terminal`, as the Worker does for Preview tabs of older apps. Add the rule to `docs/protocol/terminal.md` and one Worker test. Effort: Small.
- **Left out:** A version field in each save. It adds a contract for one optional field.
- **Wider fix:** None found beyond B. Main already uses the same rule for Preview tabs.
- **Previous examples:** The Preview tabs of PR #421.
- **Related:** `plans/follow-ups/older-app-save-moves-preview-tabs.md` covers the same kind of save for the kept Preview tabs, which can move by one place. No options conflict.
- **Recommendation:** B. It follows main's rule for older copies at a small cost.
- **Action:** ask the user, because B adds a rule at the saved view boundary that no requirement states.
