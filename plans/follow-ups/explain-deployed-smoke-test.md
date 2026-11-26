# Explain deployed smoke test

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from the post-merge task of the Explain plan on `calummoore/highlight-and-prompt-mvmd`.
- **Location:** None.
- **Reason:** The test needs the merged change on the production deployment at `conductive.build`.

- **Terms:**
  - **Explain:** the button that shows over selected chat text. A press starts a session about that text, with a prompt that the app writes.
  - **Mark:** the lasting highlight on explained text in the parent chat.
  - **Popover:** the small panel by a mark that shows the chat of its explanation.
- **Background:** Explain merged with Worker tests and DOM tests. No test ran against a real cloud computer and a real agent.
- **Task:**
  1. In a workspace on `conductive.build`, select text in a finished agent answer and press Explain.
  2. Check that the popover opens, that a new tab opens at the end of the tab row, and that the answer arrives in the popover.
  3. Close the popover while the agent works. Check that the mark shows the running state.
  4. Press the mark. Check that the popover shows the chat again, and that Expand shows the tab.
  5. Stop the cloud computer, explain another passage, and check that the computer starts.
- **Impact if no action:** A fault that only real agents or a real cloud computer show stays unseen until a member meets it.
- **Needs:** The merged change, deployed to `conductive.build`.
- **Done when:** Each step above behaves as `docs/protocol/explain.md` says, or a new follow-up item records each difference.
