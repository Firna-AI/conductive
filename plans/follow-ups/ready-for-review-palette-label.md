# Palette label of Ready for review needs a decision

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from branch `calummoore/header-button-action-s2vj`, review finding 4.
- **Location:** `src/app/shortcuts/commands.ts:167`, `docs/protocol/keyboard-shortcuts.md:82`, and `docs/mockups/src/fixtures/shortcutCommands.ts:251`.
- **Reason:** The label changes a rule of a protocol doc, and only the user can approve that change.

- **Terms:**
  - **Command:** an entry of the command palette and of the Keyboard shortcuts tab. A person can give it a key.
  - **Pull request bar:** the bar at the top of the right column of a workspace. A draft pull request there shows the button Ready for review.
- **Background:**
  - On 17 November 2026 the user chose "Ready for review" as the label of the button, the words of GitHub.
  - "The actions of the pull request bar use the labels of its buttons" in `docs/protocol/keyboard-shortcuts.md`. Only Merge PR, Continue after merge, and Open PR on GitHub add words, each for a stated reason.
  - The branch named the command of the button "Mark PR ready for review", and it added the command to those exceptions in the protocol doc.
- **Problem:** The label changes a rule of a protocol doc, and no user decision covers that change.
- **Impact if no action:** The protocol holds a rule change that the user did not review.
- **Root question:** What does the palette call the command of the Ready for review button?
- **Options:**
  - **A.** Keep "Mark PR ready for review", and record the user's approval of the exception. Effort: Small.
  - **B.** Name the command "Ready for review", as the rule says. Remove the exception from the protocol doc, and change the command and the mockup fixture. Effort: Small.
  - **C.** Name the command "Mark ready for review". Change the command, the protocol doc, and the mockup fixture. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because the rule itself is the guard.
- **Previous examples:** "Merge PR" adds words for a stated reason.
- **Recommendation:** A. A palette entry needs a verb and the pull request, as "Merge PR" does.
- **Action:** ask the user, because the label changes the rule in force that bar commands use the labels of their buttons.
