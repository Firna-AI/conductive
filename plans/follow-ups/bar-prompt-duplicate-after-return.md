# Returning during a prompt can send twice

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from the source follow-through of review finding 6 on `calummoore/github-status-bar-actions`.
- **Location:** `src/github/barActions.ts`, `src/github/useBarControls.ts`, `src/chat/state/prompt-actions.ts`, and `src/shell/workspace/shown-workspaces.ts`.
- **Reason:** This rare navigation and request timing case has an independent browser fix that costs the same later.

- **Terms:**
  - **BarActions:** The action store created for one mounted workspace screen.
  - **Kept chat:** The conversation controller retained for the workspace after its screen closes.
  - **Client ID:** The message ID that the Worker uses to recognize a repeated send.
- **Background:** A press while a fixed prompt sends must do nothing. BarActions owns that guard in `prompting`. The kept chat owns the actual send and keeps it active after navigation. A new screen mount creates a new BarActions store.
- **Problem:** Press an agent action, leave while its request waits, return to the workspace, and press the same action. The new store has `prompting: false`. The prompt client-ID map stores only failed requests, so the still-pending first request has no cached ID. The second press gets a new ID. The Worker sees two different messages and accepts both.
- **Impact if no action:** One slow action can send duplicate agent requests and spend additional model work.
- **Root question:** How can one pending fixed prompt remain one message after the member leaves and returns?
- **Options:**
  - **A.** Keep the pending prompt operation in the app's retained workspace state. Each newly mounted bar reads the same operation, and stopping a screen ends only its navigation interest. This adds another retained owner to maintain. Effort: Small.
  - **B.** Keep the prompt guard and pending client ID in the kept chat that already owns the send. Set them before awaiting the request. Suppress the identical pending press, and preserve failed-send retry IDs and successful cleanup. Effort: Small.
- **Left out:** A per-mount guard loses ownership on navigation. A Worker-only change cannot know that the browser still awaits a reply, and existing server deduplication already works for the same ID. Cancelling accepted work breaks retained chat behavior. The two retained browser owners are the direct choices without a new acknowledgement protocol.
- **Wider fix:** B. The same owner holds the operation, guard, and client ID for its entire lifetime.
- **Previous examples:** The current prompt map already preserves the ID after a failed send. `plans/follow-ups/bar-prompt-completion-after-navigation.md` records a late navigation result from the same split between screen and send ownership.
- **Related:** The late-completion follow-up above shares the lifetime cause but has a different symptom and correction. Preserve chosen-page ownership when both fixes are implemented.
- **Recommendation:** B. It uses the retained owner of the authorized send and protects every bar caller.
- **Action:** fix after merge, apply B, because this rare browser-only timing fix is independent and costs the same later.

The source trace is concrete: BarActions `prompting` is per instance; `useBarActions` creates that instance per mount; OrgRoutes keys the screen by workspace; shown-workspaces retains the ChatController; `prompt-actions.ts` creates `context.newId()` while the failure-only map lacks a pending entry; `postMessage` tracks no pending prompt; and Worker `messages.ts` repeats only by message ID.

Add a held-reply regression that leaves and returns before the second press. Assert one accepted message and a stable ID, with the draft and uploads unchanged. Preserve normal deliberate sends after completion and the separate late-navigation rule. Add no sleep, retry, timeout increase, weaker assertion, or permanent repeat.
