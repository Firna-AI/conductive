# Row focus comment may give a wrong reason

- **Severity:** Low. **Effort:** Small. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-22, from branch `calummoore/model-configuration-variations-v2-87rl`, the fix of review finding 31.
- **Location:** `src/shell/list/useRowFocus.ts:53`
- **Reason:** The comment is on `main` already, and the model favourites change did not touch `useRowFocus`.

- **Terms:**
  - **`useRowFocus`:** the hook that keeps the keyboard focus on a workspace row of the list when a render moves or removes the row.
- **Background:**
  - The `blur` handler of `useRowFocus` waits for the check after a render before it forgets the focused row.
  - Its comment says that a browser can blur a control while a render takes it out, before that check.
  - The agent that fixed review finding 31 read React 19: React ignores DOM events while a commit changes the DOM (`_enabled = false` in `commitBeforeMutationEffects` of `react-dom-client`). If that holds, `blur` never runs for such a removal. Nobody checked this in a real browser.
- **Problem:** The comment may give a reason that does not hold. The code works either way.
- **Impact if no action:** A reader may keep or copy a guard for a reason that is not real.
- **Root question:** Does a browser blur a control during a React 19 commit that removes it?
- **Options:**
  - **A.** Check it in Chrome and in the Electron app. If React suppresses the event, rewrite the comment to give the real reason for the wait, or remove the wait with its test. Effort: Small.
  - **B.** Keep the comment and the guard as they are. Effort: Small.
- **Left out:** None. The question has two answers.
- **Wider fix:** None.
- **Previous examples:** `src/shell/account/favourite-focus.ts` uses the same wait, for an open picker menu and a background window, which hold also when the comment's reason does not.
- **Recommendation:** A. A short browser check settles it.
- **Action:** fix after merge, apply A, because the comment is outside the scope of the change that found it.
