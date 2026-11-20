# Mockup composer hides Stop for a Mac command

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/finding-old-actions-oc8k`.
- **Location:** `docs/mockups/src/screens/composerFor.ts` lines 37-45 and 161.
- **Reason:** The fix changes the picture of the Mac app on the marketing site, which needs its own capture and review.

- **Terms:**
  - **Mac command request:** an agent asks to run a command on the Mac of the sender of the turn. The turn runs while the request waits.
- **Background:** The composer of a mockup shows Stop and the steer text while a turn runs. `runningConversations` in `composerFor.ts` lists the conversations whose turn runs. `docs/protocol/secret-requests.md` says that the composer keeps Stop while a request waits, because the turn runs.
- **Problem:** The conversations with a waiting Mac command request are not in `runningConversations`. So their mockups show "Working" in the chat but a composer with no Stop, for example `app/secret-requests/several/mac-command`.
- **Impact if no action:** The mockups, the visual spec, disagree with the protocol. An implementor who copies them can drop Stop.
- **Root question:** Does the composer of a mockup with a waiting Mac command show Stop?
- **Options:**
  - **A.** Add the conversations with a waiting Mac command to `runningConversations`, then capture the marketing pictures again with `npm run marketing:pictures`. Effort: Small.
  - **B.** Derive the running state from the conversation fixture, so that no list must name it. Effort: Medium.
- **Left out:** no change, because the mockup then contradicts the protocol.
- **Wider fix:** B. It removes the hand-kept list.
- **Previous examples:** None found.
- **Recommendation:** A. It is the smallest fix, and the list is the current mechanism of every other running state.
- **Action:** fix after merge, apply A, because it changes the marketing pictures, outside the purpose of this branch.
