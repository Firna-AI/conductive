# The app navigation gives no key for each visit

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from branch `calummoore/delft-i3g7`, the wider fix of a review finding of round 2.
- **Location:** `src/app/navigation.ts`, `src/shell/workspace/files/address-lines.ts`, `src/shell/workspace/files/tab-open-resume.tsx`.
- **Reason:** it changes the navigation of every screen, outside the purpose of the branch that found it.

- **Terms:**
  - **Visit:** each move of the address bar of the app, also to the same address, such as a second press on the same link.
  - **Line target:** a line or a range of lines at the end of a path, such as `src/app.ts:42`. A file chip with a line target opens the file tab at the address `?line=42`, which scrolls to the line.
- **Background:**
  - `Navigation` in `src/app/navigation.ts` gives the current address, `push`, `replace`, and `subscribe`. It gives no key for each visit.
  - A second press on a chip with a line target pushes the same address, so the address text does not change.
  - Two places count visits by hand with `subscribe`: `useAddressLines` in `src/shell/workspace/files/address-lines.ts`, so each press shows the lines again, and `ResumeOnTabOpen` in `tab-open-resume.tsx`, so each open of a file tab resumes a stopped cloud computer.
- **Problem:** Each screen that needs to know about a visit counts it again. A count can drift from the others, such as on a move back or forward.
- **Impact if no action:** A later feature that reacts to a visit adds a third counter.
- **Root question:** How does a screen tell a new visit of an address from a new render?
- **Options:**
  - **A.** Keep the counters. Effort: Small.
  - **B.** Give each history entry a key in the history state, with a `useAddressEntry` hook. `push` makes a new key. `browserNavigation` and `memoryNavigation` keep it. Move both counters to the hook. Effort: Medium.
- **Left out:** A nonce in the query, because it puts noise in an address that a member can share.
- **Wider fix:** B.
- **Previous examples:** `ResumeOnTabOpen` and `useAddressLines`.
- **Recommendation:** B. One key serves every screen.
- **Action:** fix after merge, apply B, because it changes the navigation of every screen.
