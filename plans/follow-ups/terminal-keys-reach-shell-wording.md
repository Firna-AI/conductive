# Two docs say that every key reaches the shell

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the protocol docs milestone of the branch `calummoore/oslo-xo4l`, which adds find in the shown tab.
- **Location:** `docs/protocol/workspace-tools.md:242`, `src/marketing/docs/terminal-and-previews.md:61`
- **Reason:** Both sentences came from the terminal history change on `main`, and the find branch does not change which keys the terminal keeps.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Terminal tool:** the shell of the cloud computer in the right column of a workspace.
- **Background:**
  - The section "Where a key goes" of `docs/protocol/keyboard-shortcuts.md` says that the terminal keeps every key that a program in it can read. On a Mac, a key with ⌘ goes from the terminal to the app, so ⌘K opens the command palette there. On Windows and Linux, the terminal keeps every key. The code follows this rule.
  - The Terminal section of `docs/protocol/workspace-tools.md` says: "Each key reaches the program in the shell. The terminal has no key commands and no status line of its own, so Ctrl-b reaches the shell. The user accepted this on 13 November 2026." The user accepted that the terminal has no tmux keys of its own, so Ctrl-b reaches the shell.
  - The public Terminal guide, `src/marketing/docs/terminal-and-previews.md`, says: "Every key goes to the shell, also Ctrl-b."
  - Find in the shown tab adds one more key that goes from the terminal to the app on a Mac: ⌘F opens the find bar.
- **Problem:** On a Mac, both sentences are wrong for each key with ⌘, such as ⌘K and ⌘F.
- **Impact if no action:** A reader expects ⌘K and ⌘F to reach the shell on a Mac. Two protocol docs contradict each other.
- **Root question:** How do the Terminal section and the Terminal guide say which keys reach the shell on each system?
- **Options:**
  - **A.** Limit both sentences to the keys that the app does not take, and link to "Where a key goes". Keep the fact that Ctrl-b reaches the shell. Effort: Small.
  - **B.** Remove both sentences. The docs then lose the fact that Ctrl-b reaches the shell. Effort: Small.
- **Left out:** Change nothing, because the sentences stay wrong. Send every Mac key to the shell, because that breaks the rule that ⌘K opens the palette from everywhere.
- **Wider fix:** None. The `documentation` skill already covers drift between docs.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the Ctrl-b fact that the user accepted and states the rule that the code follows.
- **Action:** ask the user, because two protocol texts conflict, and the user decides which one is right.
