# Copy tests miss a late clipboard write

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open decision of the deleted keyboard shortcuts plan (decision 200). Its source was review round 5, finding 16, of `calummoore/keyboard-shortcuts-settings`.
- **Location:** `src/shell/shortcuts/shortcut-test-kit.tsx`, the shared test kits in `src/test-support/`, and the `copy` fakes of `src/shell/workspace/WorkspaceKeys.test.tsx:199`, `src/shell/workspace/CopyLink.test.tsx:45` and `:100`, and `src/chat/components/TranscriptCopy.dom.test.tsx:45`.
- **Reason:** Options B and C add a test for a whole class of bugs, which needs the user's approval.

- **Terms:**
  - **Copy fake:** the `copy` service that a test passes to the app. It records the text that the app copies.
- **Background:** Copy link, the two copy commands of the keyboard shortcuts, and their buttons and menu items must start the clipboard write during the key press or click. `docs/protocol/session-transcripts.md` gives the reason: a browser such as Safari can refuse a write that starts long after its press. The copy fakes of the tests keep only the resolved text. More test files have copy fakes too, such as `src/chat/components/SessionLinkCopy.dom.test.tsx`, `src/chat/components/CodeBlock.dom.test.tsx`, and `src/chat/device/LiteralText.dom.test.tsx`.
- **Problem:** No test sees when a write starts. A copy that starts after the press passes every copy test. The review of the keyboard shortcuts branch found this gap in its two copy key tests. The tab menu and label button tests have it too.
- **Impact if no action:** A later change can delay a write. Safari then refuses the copy, and no test fails.
- **Root question:** How does each copy key and copy control keep starting its clipboard write during its press, also after later changes?
- **Options:**
  - **A.** Fix only the two copy key tests: a recorder in the shortcut test kit that tells whether the write started during the press. Effort: Small.
  - **B.** A, and the shared test kits get one clipboard recorder in place of the separate `copy` fakes. Every copy test moves to it. It is a test for the class. Effort: Medium.
- **Left out:** A copy kind of offer in the shortcut layer: it protects only the keys, not the buttons and menu items, and it adds a second way to run a command. A browser test: the gate has no browser harness for the web app. Option C of the plan, B inside the shortcuts pull request, ended when that pull request merged.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. It catches a late start in every copy test, also in the next copy feature.
- **Action:** ask the user, because B adds a test for the class, which needs the user's approval.
