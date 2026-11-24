# No doc owns the close rules of popovers

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from the branch `calummoore/ask-explain-custom-message-7bnf`, the wider fixes of review findings 8 and 9 of round 1.
- **Location:** `docs/protocol/command-palette.md:34`, `docs/protocol/file-row-menu.md:67`, `docs/protocol/org-rail-order.md:128`, `docs/protocol/explain-popover.md`, `docs/protocol/fast-mode.md`.
- **Reason:** The change touches several protocol docs outside the Ask change, and their rules differ today.

- **Terms:**
  - **Protocol doc:** a file under `docs/protocol/` that holds the requirements and the decisions in force.
- **Background:** Each feature doc states its own rules for how a popover, a menu, a dialog, or a sheet closes, and where the focus goes after. Each start doc also restates the fast mode of the session that it starts. The `documentation` skill wants one owner for each shared rule.
- **Problem:** The close rules differ. The command palette returns the focus after a press outside, a file row menu returns it unless the press moved it, and the org rail leaves it where the person clicked. The Ask review found that its docs contradicted each other on the same rule. The speed of each session start is restated in several docs, and one of them left out a clause.
- **Impact if no action:** The next feature doc restates these rules in other words, and the docs drift apart again.
- **Root question:** Which doc owns the close and focus rule of every overlay, and which owns the speed of every session start?
- **Options:**
  - **A.** Give one doc each shared rule: the close and focus rule of every popover, menu, dialog, and sheet, and the speed of every session start in `docs/protocol/fast-mode.md`. Each feature doc then states only its exceptions and links to the owner. Each difference becomes a stated exception or a user decision. Effort: Medium.
  - **B.** Change nothing. Effort: Small.
- **Left out:** A lint for the words of the docs, because no tool can tell two restatements of one rule apart.
- **Wider fix:** A.
- **Previous examples:** `plans/follow-ups/escape-on-one-stack.md` unifies the Escape code of the same overlays.
- **Recommendation:** A. One owner stops the drift that the Ask review found.
- **Action:** fix after merge, apply A, because it changes protocol docs outside the Ask change. Do it next to `plans/follow-ups/escape-on-one-stack.md`.
