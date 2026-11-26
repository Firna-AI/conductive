# The mockup words of the Settings command differ

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2.
- **Location:** `docs/mockups/src/fixtures/shortcutCommands.ts`, the command `account-page`, and `src/app/shortcuts/commands.ts:56-59`.
- **Reason:** The review of the Settings branch came after its last fix round.

- **Background:** The shortcut command `account-page` has the label "Settings" since 20 November 2026. Its search words in the app are "account" and "preferences". The mockup fixture says that the words of a command are the words that its label lacks.
- **Problem:** The fixture keeps "settings" and "preferences". It repeats a word of the label and lacks "account".
- **Impact if no action:** The mockups and the app disagree on which words find the Settings command.
- **Root question:** How do the app and the mockups give the Settings command the same search words?
- **Options:**
  - **A.** Change the words of the fixture to "account" and "preferences". Effort: Small.
  - **B.** Put the words in one shared constant in the mockups, as `sendFeedbackWords` of `src/ui/components/feedback/feedbackCopy.ts` is. The fixture and `commands.ts` both use it. Effort: Small.
- **Left out:** The fixture reads the words from the app: the mockups are the spec, so the app takes shared copy from the mockups.
- **Wider fix:** B.
- **Previous examples:** `sendFeedbackWords` serves the app and the mockups.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the review came after the last fix round of the Settings branch.
