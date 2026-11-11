# Late prompt failure changes the chosen page

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from checked review finding 6 on `calummoore/github-status-bar-actions`.
- **Location:** `src/github/useBarControls.ts`, `src/github/barActions.ts`, and `src/shell/workspace/github/bar-controls.ts`.
- **Reason:** This rare browser timing defect has a workaround, and its browser-only correction costs the same later.

- **Terms:**
  - **Fixed prompt:** The prepared chat message sent by an action such as Fix checks.
  - **BarActions:** The browser action store connected while its workspace screen shows.
  - **Kept chat:** The workspace conversation state that remains in memory after its screen closes.
- **Background:** An action on phone Checks sends a fixed prompt. A failed send opens its chat to show the cause. Leaving the screen does not cancel an already authorized chat send. Its notice and client ID remain in the kept chat.
- **Problem:** Start a prompt from Checks, choose another page, then receive a failed network reply. The old `useBarControls` continuation still calls `showChat`. The screen adapter pushes the earlier workspace's chat address after that screen has unmounted. Stopping BarActions cancels Merge, Continue, and questions but does not suppress this prompt result. On desktop, the same completion can select a session in hidden chat state.
- **Impact if no action:** A delayed failure takes the member away from the page they chose, or changes the session saved in a hidden workspace.
- **Root question:** How does a prompt that did not go out show its cause without moving a member who left its workspace?
- **Options:**
  - **A.** Give the `useBarControls` callback an effect lifetime. Ignore its result after cleanup. Add a held-reply navigation regression. Effort: Small.
  - **B.** Bind prompt completions to the current BarActions connection. Return null when that connection ends, so the caller skips navigation and session selection. Keep the accepted send, error, and retry ID in the kept chat. Add the held-reply regression. Effort: Small.
  - **C.** Check the current address before `showChat` navigates and allow it only from the originating workspace. The route check belongs to the screen adapter. Effort: Small.
  - **D.** Show failure under the bar with a chat link and remove the automatic move. This changes the settled design, mockups, and visible behavior, so it requires approval before selection. Effort: Medium.
  - **E.** Add an app-navigation push owned by its calling screen. It changes shared navigation outside this diff and does not prevent the desktop session selection. Effort: Small.
- **Left out:** Keeping the code still replaces the chosen page. Cancelling accepted work breaks kept-chat behavior. An app-wide drop of all late navigation would also break new-workspace creation, which opens an accepted workspace after its dialog closes.
- **Wider fix:** B. Each action checks one connection owner before applying its completion. It extends the current Merge and Continue ownership rule to prompt results.
- **Previous examples:** Merge and Continue already suppress stale connection outcomes in BarActions. `plans/follow-ups/get-started-reply-order.md` records another stale-reply ownership issue.
- **Recommendation:** B. It covers all action-store callers and the desktop selection while keeping authorized chat work.
- **Action:** fix after merge, apply B, because this rare browser-only fix costs the same later.

Preserve the current rule that failure opens chat while the member remains in that workspace. A return or branch change before completion can leave the error in the kept composer rather than opening it. Keep the notice, session-scoped client ID, draft, uploads, normal send rules, and actual accepted message. Do not add a Worker rejection or cancel agent work.

Use an explicitly held send reply and navigate before releasing its failure. Assert the exact retained page, kept error, and no late session selection. Preserve the existing same-screen failure assertions. Add no sleep, retry, timeout increase, weaker matcher, or permanent repeat.
