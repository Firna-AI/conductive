# A late saved view loses the saved terminal

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from review finding 401 of the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `src/terminal/terminalRoute.ts:74`, `src/shell/workspace/tools/terminal-route.ts:39`, `src/terminal/OpenTerminals.tsx:104`, `src/shell/workspace/tools/TerminalAddress.test.tsx`.
- **Reason:** The bug needs a chat read that is slower than the terminal read, or a failed chat load and then Try again, and its fix does not get harder after the merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Saved view:** what the server keeps for each member in each workspace, such as the open tabs and the shown tool. It holds `terminal`, the ID of the shown terminal.
  - **TerminalRoute:** the value that gives the Terminal tool its address, the saved terminal, and the action that shows a terminal.
  - **Unknown address:** an address `terminal/<terminalId>` whose terminal is not in the list, such as an old bookmark.
- **Background:**
  - Terminal tabs decision 4 A: an unknown address shows the saved terminal, or the first, and the address then names the shown terminal. `docs/protocol/terminal.md` states it.
  - The chat reads the saved view. The Terminal tool reads its list after the workspace read. Normally the view arrives first.
  - While the view loads, `useTerminalRoute()` gives `saved: null`.
- **Problem:**
  - When the list arrives before the saved view, an unknown address shows Terminal 1, moves the address to it, and records it as the choice. When the view arrives with Terminal 3, Terminal 1 stays and the view saves it.
  - A failed chat load and then Try again saves the same fallback.
  - A bare `terminal` address shows and connects Terminal 1 before the saved terminal, so Terminal 1 keeps a hidden connection. Low impact.
  - Related: when `several` turns false while the list still holds more terminals, an address of Terminal 2 to 10 follows to Terminal 1 and saves it. The fix of review finding 402 removed the main trigger, a failed terminal step during a Restart. A real downgrade can still do it.
- **Impact if no action:** In rare timing, a member's saved terminal changes to Terminal 1, and a reload shows the wrong shell.
- **Root question:** What should the Terminal tool show, address, and save before the member's saved view is known, so that only a known view or a choice of the member decides the saved terminal?
- **Options:**
  - **A.** Delay the automatic fallback and the address move until the saved view settles. Keep the choices of the member immediate. Effort: Small.
  - **B.** Give `TerminalRoute` a pending state, and let the selection commit an automatic fallback only from a resolved view. Effort: Small.
  - **C.** Return the saved terminal with the terminal list from one Worker response. It changes both sides of an API. Effort: Medium.
  - **D.** Give `TerminalRoute` three states for the saved terminal:
    - Pending: an address of a listed terminal shows it at once. A bare or unknown address shows the "Opening the terminal" wait and opens no socket.
    - Known: apply decision 4 A.
    - Unavailable, after a failed load or with no view: show the first terminal, but do not move the address or record a choice.
    Only a tab, the +, and New terminal record a choice before the view is known. Do not follow an address of a terminal that the one-terminal view only hides. Add held-view cases for the bare and the unknown address, and one case for a failed view and then Try again. Effort: Small.
- **Left out:** Always Terminal 1, which decision 4 A rejected. Publishing the view before the other chat reads, because the list can still come first. Holding the terminal read until the view is known, because D waits only where the route needs the view.
- **Wider fix:** D. It covers a slow read, a failed read with Try again, and a short list.
- **Previous examples:** [`plans/follow-ups/session-click-overwrites-unread-view.md`](https://github.com/Firna-AI/conductive/blob/ec15a2f36cd448f10d17927a2fcf151f96071a06/plans/follow-ups/session-click-overwrites-unread-view.md) and [`plans/follow-ups/history-pages-change-saved-tabs.md`](https://github.com/Firna-AI/conductive/blob/a0d399b742d878da51cb32006d0c5db646bccaf3/plans/follow-ups/history-pages-change-saved-tabs.md) record provisional state that becomes a saved choice.
- **Recommendation:** D. It treats a pending or failed view as not known and opens no provisional socket.
- **Action:** fix after merge, apply D, because the bug is Rare, Medium, and its fix does not get harder after the merge.
