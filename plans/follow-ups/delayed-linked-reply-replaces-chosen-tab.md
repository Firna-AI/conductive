# A late linked reply replaces the chosen tab

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-19, from branch `calummoore/follow-up-a-delayed-model-reply-leaves-lr8a`, found while that branch kept the Preview tab for a delayed model move.
- **Location:** `src/chat/state/linked-replies.ts:79`, the branch of `showTarget` that moves no draft. `src/chat/state/model-moves.ts:93`, the tab check of `applyMoves`. `src/chat/state/sessions.ts:45`, `viewShowing`.
- **Reason:** This defect is in the separate linked-reply path, and the branch that found it changes only the delayed model move.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Linked session:** a new session that the Worker opens for a message when the login of the session of the request cannot serve the sender.
  - **Fixed prompt:** a message of fixed text that an agent action of the pull request bar, or Merge latest of the command palette, sends.
  - **Session of the chat:** `activeSessionId` of the chat snapshot, the session that the member saw last, which stays while a file, diff, or Preview tab shows.
  - **Selected tab:** `view.activeTab` of the workspace view, which is a session, file, diff, or Preview tab, or null when no tab is selected.
  - **Preview tab:** a desktop tab of the centre row that shows the page of one port of the cloud computer.
- **Background:**
  - `showTarget` in `src/chat/state/linked-replies.ts` runs after each reply that names a linked session. `sendDraft` and `retryTurn` in `src/chat/state/message-actions.ts` call it, and so does `sendPrompt` in `src/chat/state/prompt-actions.ts`.
  - At line 72, `showTarget` stops unless the linked session is open and the session of the chat is still the session of the request.
  - The draft of the request can move only when all of these hold:
    - The request gave a draft ID. A fixed prompt never gives one.
    - The source still holds that draft, and does not send it now.
    - The linked session holds no unfinished work.
  - When the draft can move, `applyMoves` in `src/chat/state/model-moves.ts` moves it. At lines 93 to 96, it shows the linked session only when the selected tab is a session tab or null.
  - When the draft cannot move, line 80 calls `selectSession(context, target)` when the source draft holds no text, no files, and no send. This branch does not read the selected tab.
  - `selectSession` at `src/chat/state/session-actions.ts:21` calls `viewShowing`, stores the session of the chat and the view, and saves the view. `viewShowing` at `src/chat/state/sessions.ts:45` makes the tab of the session the selected tab.
  - The app selects a file, diff, or Preview tab through `ChatController.updateView` in `src/chat/state/controller.ts`. It changes only the view, so the session of the chat stays, and the check at line 72 still passes.
  - `sendPrompt` sends a fixed prompt to the session of the chat, also while a file or Preview tab shows. `useBarControls` in `src/github/useBarControls.ts` shows the chat only when a prompt did not go out.
  - The rule is in `src/chat/sessions.md:92-94`: "Only the tab that sent moves to the linked session, and only while it still shows the session of the request. A user who opened another tab during the send keeps that tab." The doc comment of `showTarget` says the same.
  - No protocol doc states which tab shows after a reply that names a linked session.
  - A read of the code gives this record. No test reproduced the defect. The existing linked reply tests passed when this item was added. No test of `src/chat/state/linked-replies.test.tsx` or `src/chat/state/prompt-actions.test.ts` selects a file, diff, or Preview tab.
- **Problem:** When the draft cannot move, the reply selects the linked session also while a file, diff, or Preview tab is selected. That view does not show the session of the request, so this breaks the rule. A fixed prompt sent from such a tab, or a send whose reply waits while the member selects such a tab, reaches it.
- **Impact if no action:** The reply takes the member away from the file, the diff, or the page of a port that the member chose to look at.
- **Root question:** How does a reply that names a linked session show that session only while the view still shows the session of the request?
- **Options:**
  - **A.** In the branch of `showTarget` that moves no draft, call `selectSession` only when the selected tab is a session tab or null. A view with no selected tab keeps its current path. This copies the check of `applyMoves`, so the two late paths can drift apart again. Effort: Small.
  - **B.** Add one shared check beside `viewShowing` in `src/chat/state/sessions.ts`. It is true when a session is the session of the chat, and the selected tab is a session tab or null. Use it in `applyMoves` in place of its own check, and before `selectSession` in the branch of `showTarget` that moves no draft. `applyMoves` still moves each draft before the check, so no draft move changes. A view with no selected tab keeps its current path. Effort: Small.
  - **C.** Record at the request whether the view shows the session of the request. Count each later change of the selected tab, because `tabChoices` in `src/chat/state/context.ts` counts only choices of a session tab. Show the linked session only when the view showed the source at the request and no choice came since. It adds state to each send. It also keeps the source when the member leaves it and comes back during the send, which the rule does not ask for. Effort: Medium.
- **Left out:**
  - Change nothing, and change the rule of `src/chat/sessions.md`. It fails the goal, because the reply still takes the member away from the chosen tab.
  - Keep the selected tab, but make the linked session the session of the chat. A later fixed prompt from the same tab would then go to the linked session. It breaks two requirements: a fixed prompt and Add to chat go to the session that the member saw last. Section Messages from the bar of `docs/protocol/messages-and-attachments.md` and section Add to chat of `docs/protocol/file-mentions.md` state them.
  - Return from all of `showTarget` while such a tab is selected. It also stops the draft move of the other branch. A and B fix the view without that cost.
- **Wider fix:** B. The delayed model move and the linked reply then share one check, so one late path cannot fall behind the other again.
- **Previous examples:** Commit `d1ec85ee7` of 8 November 2026 kept a newer selection of a session, file, or diff tab in `applyMoves` for a delayed model move. The branch of `showTarget` that moves no draft did not get that check. The branch that added this item extended that check to each tab whose kind is not `session`, such as a Preview tab.
- **Recommendation:** B. It fixes the view, keeps every draft move, and leaves one rule for both late paths, at the same effort as A.
- **Action:** fix after merge, apply B, because its fix changes the linked-reply path outside this branch's code scope.

Regression tests for the fix:

- Start `memberChat()` of `src/chat/state/linked-kit.ts`, whose Send reply names the linked session `LINKED`. Select a Preview tab with `chat.controller.updateView`, as `src/chat/state/model-moves.test.ts` does, then call `chat.controller.sendPrompt`. Expect the Preview tab to stay selected, the session of the chat to stay the source, and the prompt to wait in `LINKED`.
- Hold a Send with `memberChat({ hold: isSend })`, as `sendThatWaits` in `src/chat/state/linked-replies.test.tsx` does. Give `LINKED` a typed draft, so the draft of the request cannot move. Leave the source draft empty. Select a file tab, then release the reply. Expect the file tab to stay selected.
- Keep the tests of `src/chat/state/model-moves.test.ts` as they are. They must pass with the shared check.
