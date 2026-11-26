# Alt and an arrow in an open row menu move the row

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-22, from branch `calummoore/model-configuration-variations-v2-87rl`, the model favourites change.
- **Location:** `src/shell/ui/useListMoves.ts:55`, `src/shell/account/FavouriteParts.tsx:112`, `src/shell/settings/RepositoryOrder.tsx:163`
- **Reason:** The repository order on `main` has the same behaviour, so the fix belongs to the shared hook, not to the change that found it.

- **Terms:**
  - **Row move:** Alt with Up or Down on a focused row of an ordered list moves that row one place. `useListMoves` gives it to the repository order of the org settings and to the Favourites section of Preferences.
  - **Row menu:** a menu that a control inside a row opens, such as the model picker of a favourite.
- **Background:**
  - Each row of these lists handles its keys in `onKeyDown`, which calls `useListMoves().onKeyDown`.
  - That handler moves the row on Alt with Up or Down, and calls `preventDefault`.
  - A menu that a control of the row opens is part of the row in the React tree, so its key events reach the row handler too.
  - The agent that built the Favourites section saw this in Chrome on 20 November 2026: Alt with Up or Down inside an open model picker of a favourite moved the row. It reported the same for the repository order, because both use `useListMoves`.
- **Problem:** A key press that the person aims at the open menu moves the row behind it.
- **Impact if no action:** A keyboard user who presses Alt with an arrow in an open row menu changes the order of the list without meaning to. The list saves the new order at once.
- **Root question:** Which key presses may move a row of an ordered list?
- **Options:**
  - **A.** `useListMoves().onKeyDown` moves the row only when the event target is the row or one of its own controls, and not inside an open menu. A check of `event.target.closest('[role="menu"]')` is one way. Effort: Small.
  - **B.** Each menu that a row control opens stops the propagation of its key events. Each new menu must remember it. Effort: Small.
- **Left out:** Removing the Alt move: it is the keyboard form of the drag, which the lists need.
- **Wider fix:** A. One check in the shared hook covers every ordered list.
- **Previous examples:** None found.
- **Recommendation:** A. It fixes the class in the one hook that both lists use.
- **Action:** fix after merge, apply A, because the cause is in a shared hook on `main`, outside the scope of the change that found it.
