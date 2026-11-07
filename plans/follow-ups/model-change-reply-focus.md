# A model reply changes a newer tab

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-07, from the second-pass check of finding 2 on branch `conductor/boat-native-remote-workspaces-milestone-7w`.
- **Location:** `src/chat/state/model-moves.ts`, `applyMoves`, and the model-change actions under `src/chat/state/`.
- **Reason:** the model-change path already has this behavior before the session-login change, so its fix belongs on a separate branch.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Session:** one agent conversation in a workspace, shown as a tab.
  - **Model change:** a model pick in the composer. A model of another agent opens a new session and moves the draft there.
- **Background:** A model change can wait for its HTTP reply or event. The user can select another tab while it waits. The chat tracks the pending model change by its new session ID and applies its draft move when that session appears.
- **Problem:** `applyMoves` always selects the new session when its move is open. It does not check whether the user selected another tab after the pick. A late result therefore replaces the user's newer selection.
- **Impact if no action:** The chat interrupts work in the tab that the user selected. Later keystrokes or actions can affect the wrong session.
- **Root question:** How does a pending model change respect the user's latest selected tab?
- **Options:**
  - **A.** Move the draft, but select the target only while the source remains selected. This adds one condition to the existing move. Effort: Small.
  - **B.** Open model-change targets in the background. The user must select the new tab after each pick. Effort: Small.
  - **C.** Record a navigation intent for each automatic selection. Manual selection cancels it. Use it for asynchronous session actions. Effort: Medium.
- **Left out:** Always selecting the new session is the defect. Disabling manual navigation while a pick waits removes an existing user action.
- **Wider fix:** A. The shared model-move helper can preserve manual selection for both reply and stream paths.
- **Previous examples:** `src/chat/state/linked-replies.ts` had the same selection hazard for linked sends. Its checked fix preserves the user's draft and manual selection.
- **Related:** `plans/follow-ups/chat-client-stale-records.md` also covers newer client state. Its server-order fix cannot determine a user's navigation intent.
- **Recommendation:** A. Its shared default preserves the normal draft move and the user's newer tab with a small change.
- **Action:** fix after merge, apply A, because this existing path is outside the session-login diff.

Reproduction through the public chat controller:

1. Start a chat with two open sessions and a draft in the first.
2. Hold the reply of a model pick for the other agent.
3. Start that pick, then select the second existing session.
4. Release the model reply with its new session record.
5. Check the selected session. It becomes the new model session instead of the second existing session.

The recorded proof failed with `expected 'client-1' to be 'debounce'`.
Its values before and after the reply were `debounce` and `client-1`.
The code should keep the draft's move while preserving the newer manual selection.
