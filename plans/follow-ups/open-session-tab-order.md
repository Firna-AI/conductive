# No rule sets the order of the open session tabs

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #6, branch `conductor/boat-native-remote-workspaces-milestone-7`, a new problem of the round 2 check of finding 5. Raised to the user as item 77.
- **Location:** `docs/protocol/chat-and-events.md:45` and `worker/chat/http-routes.ts:67`.
- **Reason:** it is a spec gap, and the user reviews each new requirement.

- **Terms:**
  - **Session tab:** one open chat session of a workspace, shown as a tab above the chat.
- **Background:** The chat protocol sets the order of the closed sessions in the history: the last closed first. It sets no order for the open session tabs. The route and its test use the creation order.
- **Problem:** No requirement covers the order of the open session tabs.
- **Impact if no action:** A later change can reorder the tabs, and no rule says which order is right.
- **Root question:** In which order do the open session tabs show?
- **Options:**
  - **A.** The creation order, as the code does now. A new session opens as the last tab. Effort: Small.
  - **B.** The order of the last activity. The tab with the newest message shows first. Effort: Small.
- **Left out:** an order that the user sets by drag, because no mockup shows it.
- **Wider fix:** None. This item sets one rule.
- **Previous examples:** None found.
- **Recommendation:** A. Tabs that keep their place are easier to find.
- **Action:** ask the user, because the rule adds a requirement to the chat protocol.
