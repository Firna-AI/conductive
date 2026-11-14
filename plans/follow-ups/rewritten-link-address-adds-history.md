# A press on a rewritten link address adds history

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-14, from `calummoore/riga-m3j3`, review round 2, the check of finding 7.
- **Location:** `src/shell/workspace/link-opening.tsx`, the port opener. `src/previews/previewActions.ts`, `leavePort`. `src/shell/workspace/session-address.tsx`, `OpenSessionAddress`.
- **Reason:** The fix needs the Preview tool to give the screen the port of its shown preview, which is new wiring outside the review fix.

- **Terms:**
  - **Link opener:** `src/shell/ui/text-links.tsx` with the values of `src/shell/workspace/link-opening.tsx`. It opens a link of chat text or of the file preview.
  - **Port address:** `preview/port/<port>` after a workspace address. It opens the port in the Preview tool. After the open, the tool replaces it with the address of the preview.
- **Background:**
  - A press on an app link to the current address replaces the history entry, as `AppLink` does. The review fix of 14 November 2026 applied this rule to app links of chat text and of the file preview.
  - Two addresses change after the press. The Preview tool replaces a port address with the address of its preview. `OpenSessionAddress` replaces a session address of the shown workspace with the workspace address.
- **Problem:**
  - On desktop, a second press on a local address whose preview already shows pushes the port address, then the tool replaces it with the preview address. Two equal entries stay.
  - A session link of the shown workspace, in inline code or in a file, leaves two equal entries the same way.
- **Impact if no action:** Back seems to do nothing once after such a press.
- **Root question:** How does a press on a link add a history entry only when the page that shows changes?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** At the press, map the address to the address that the screen settles on: a session address of the shown workspace to the workspace address, and a local address whose preview is open to the address of that preview. Replace when the mapped address is the current address, and push otherwise. The Preview tool gives the screen the port of its shown preview. Add mounted tests for a second press on a local address and for a session link in code. Effort: Medium.
  - **C.** Make the app navigation replace an equal address for every caller, as `plans/follow-ups/repeated-file-click-adds-history-entry.md` proposes. Cost: it does not cover an address that changes after the press. Effort: Small.
- **Left out:** Skip the navigation when the page shows: a press on a file link then no longer resumes a stopped sandbox. Remove the extra entry with `history.back()`: it runs late and leaves a Forward entry that opens the port again.
- **Wider fix:** C covers the equal-address class for every caller. B covers the rewrite shape.
- **Previous examples:** `plans/follow-ups/repeated-file-click-adds-history-entry.md`. Commit `4fb76331f` added the current-address rule of `AppLink`.
- **Related:** `plans/follow-ups/repeated-file-click-adds-history-entry.md`: the same symptom for an equal address. The workspace and session chips of the chat open through `useGo`, which always pushes, so a chip of the shown workspace adds an equal entry too. Its option C covers them.
- **Recommendation:** B. It is the only option that fixes a second press on a local address, the common shape of this symptom.
- **Action:** fix after merge, apply B, because it needs new wiring from the Preview tool to the screen.
