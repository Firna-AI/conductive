# Back to a tool address keeps a stale tab

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the branch `calummoore/tab-selection-issue-qn9j`, re-review finding 1.
- **Location:** `src/shell/workspace/restore-tab.tsx`, the listener of `useChatAtBareAddress`. `src/shell/workspace/tab-visits.ts`, `tabAt`.
- **Reason:** the re-review found it after the last fix round of the branch, and the finish rules stop the fix rounds there.

- **Terms:**
  - **Saved view:** the open tabs and the active tab of one member in one workspace, which the server keeps. `src/shared/workspace-view.ts` gives its type.
  - **Bare address:** the address of the workspace alone, `/orgs/<org>/workspaces/<id>`, with no view part and no session.
- **Background:** On desktop, the centre of the workspace screen shows the chat, a file or diff tab, or a Preview tab. The address decides which one. A return to a workspace at its bare address shows the active tab of the saved view again, through `RestoreShownTab` of `src/shell/workspace/restore-tab.tsx`, as "The shown tab at a return" in `docs/protocol/tab-row.md` says. So that a return after the chat showed shows the chat, `useChatAtBareAddress` saves the shown session as the active tab at each move to the bare address, such as a move back in the browser history.
- **Problem:** A tool address, such as `.../terminal`, or a files list address, such as `.../files/changes`, also shows the chat in the centre on desktop. A move to such an address saves only the tool or the list, not the shown session. So the saved active tab can stay a file, diff, or Preview tab while the chat shows. Scenario: open workspace A from a `.../terminal` link, click the Preview tab of port 3000, press Back to `.../terminal`, go to workspace B, then click A in the sidebar. The Preview tab shows, not the chat.
- **Impact if no action:** In this rare history path, a return shows a tab that did not show when the member left. This breaks the first rule of "The shown tab at a return" in `docs/protocol/tab-row.md`.
- **Root question:** How does a return show the chat after any move that left the chat in the centre?
- **Options:**
  - **A.** In the listener of `useChatAtBareAddress`, save the shown session when the new address is in this workspace, names no session, and names no file, diff, or Preview tab. `tabAt` of `tab-visits.ts` already gives that tab key, so export it or a small helper. Add a test like "a move back to the address of the workspace from a tab saves the shown session" in `src/shell/workspace/RestoreShownTab.test.tsx`, with a `.../terminal` address. Effort: Small.
  - **B.** Keep the code. Say in `docs/protocol/tab-row.md` that only a move to the bare address saves the shown session. Effort: Small.
- **Left out:** A save of the active tab at every address change was left out, because the Files part and the Preview centre already save the tabs that they show, so it would add saves with no gain.
- **Wider fix:** A. It ties the save to what the centre shows, not to one address shape, so a new address kind that shows the chat is covered too.
- **Previous examples:** None found.
- **Recommendation:** A. It meets the rule of the protocol doc with a small change and one test.
- **Action:** fix after merge, apply A, because the re-review found it after the last fix round of the branch.
