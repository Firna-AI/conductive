# Two protocol docs disagree on the E2B desktop

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from the options check of the plan `plans/terminal-open-command.md` on branch `calummoore/open-mockup-file-n5l4`, new problem 13.
- **Location:** `docs/protocol/terminal-previews-and-desktop.md:212-214`, `docs/protocol/agent-tools.md:250-254`.
- **Reason:** The terminal open change does not touch the Desktop section, so this wording fix waits for its own change.

- **Terms:**
  - **Desktop stream:** the Desktop tool of the app, which shows the screen of the cloud computer to a member.
  - **Computer tools:** the MCP server `computer`, which lets an agent use the screen, the mouse, and the keys of the cloud computer.
- **Background:**
  - The Desktop section of `docs/protocol/terminal-previews-and-desktop.md` says: "A sandbox on E2B has no desktop, and the Worker gives it no desktop URL."
  - `docs/protocol/agent-tools.md` says that agents on E2B get the computer tools, which act on display `:0` with Chrome, as on Boat.
  - `image/e2b/README.md`, in Computer services, starts Xvfb on `:0`, Openbox, and Chrome in each E2B template.
  - So an E2B cloud computer has a desktop for the agents, but no desktop stream for members.
- **Problem:** The Desktop section says that an E2B sandbox has no desktop, which is false for the agents.
- **Impact if no action:** A reader can plan a feature on the false fact, as the brainstorm of the terminal open change did.
- **Root question:** What must the Desktop section say about an E2B cloud computer?
- **Options:**
  - **A.** Change the sentence to say that an E2B sandbox has no desktop stream, and that its agents still use a desktop on display `:0`. Link the computer tools rule of `docs/protocol/agent-tools.md`. Effort: Small.
  - **B.** Change nothing. Cost: the two docs keep disagreeing. Effort: Small.
- **Left out:** A change to the code: the code already matches the facts, and only the words are wrong. Fewer than three approaches are real, because the fix is one sentence.
- **Wider fix:** None. The `documentation` skill already says that a change of a fact updates each doc that restates it.
- **Previous examples:** None found.
- **Recommendation:** A. It makes the two docs agree with the code.
- **Action:** fix after merge, apply A, because the terminal open change does not touch the Desktop section.
