# A late address change closes Settings

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `src/shell/workspace/session-address.tsx:27-37`, `src/shell/workspace/previews/preview-centre.tsx:78-81`, `src/shell/workspace/files/address-lines.ts:18-29`, `src/shell/settings/settings-view.tsx`.
- **Reason:** The review of the Settings branch came after its last fix round, and the fix changes workspace files outside that branch.

- **Terms:**
  - **Settings dialog:** on a desktop, every settings address, such as `/account/agents`, shows Settings as a dialog over the last page of the tab.
  - **Page below:** that last page. It stays mounted under the dialog, and it takes its route from its stored address, not from the address bar.
- **Background:**
  - `OpenSessionAddress` shows the session of a session address, and can first reopen a closed session over the network. When that ends, it replaces the current address with the workspace address.
  - The preview centre replaces the current address when the previews load.
  - `useAddressLines` reads the address bar, so Close counts as a new visit of a file address with lines.
  - A test reproduced it: open a session address of a closed session, hold the reopen, open `/account/agents`. After the reopen answered, the address was the workspace address, and Settings did not show. Before Settings, leaving the workspace unmounted it, which stopped the lookup.
- **Problem:** A late replace by the page below takes the address of Settings, so Settings closes on its own and leaves the history. Close also scrolls a file below back to its linked lines.
- **Impact if no action:** A person who opens Settings right after a session link or a preview link can lose Settings and must open it again.
- **Root question:** How does the page below finish the work of its own address without changing the address of Settings?
- **Options:**
  - **A.** Guard the two writers: each replaces the address only while the address bar still shows its own page, as `NewWorkspaceDialog.tsx` compares the address with the address where it opened. Add the reproduction as a test. Each new writer must repeat the guard. Effort: Small.
  - **B.** Give the page below its own address. `Signed` in `src/shell/Shell.tsx` provides it in a context: the stored address while Settings shows, else the address bar. A replace through it updates the stored address while Settings shows. `OpenSessionAddress`, the preview centre, `useAddressLines`, and `useTabVisits` read and write through it. Add the reproduction as a test. Effort: Medium.
- **Left out:** Unmount the page below while Settings shows: it drops the design call that the page stays mounted, which `src/shell/workspace/KeptWorkspace.test.tsx` guards. Stop the lookups when Settings opens: the session then never shows. A pause flag: B is better on every point.
- **Wider fix:** B. One source for the address of a page removes the case for every reader and writer.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/settings-hidden-chat-tests.md`, the same cause.
- **Recommendation:** B. It fixes both writers and the scroll of linked lines.
- **Action:** fix after merge, apply B, because it is a rare product bug of Medium severity and B changes workspace files outside the Settings branch.
