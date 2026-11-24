# Workspace tools page passes its length target

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, Milestone 2 of the runner file report limits plan.
- **Location:** `docs/protocol/workspace-tools.md`.
- **Reason:** Cal's release of that milestone forbade a second split of this page from old content, and the page stays under the repository's 300-line split limit.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspace-tools.md`, about 280 lines.
- **Terms:**
  - **Picture rules:** The requirements for how a file tab shows an image, with its zoom bar and expanded view, in the Files and changes section.
- **Background:** The documentation skill keeps a protocol page near its length target, and the repository splits a file that passes 300 lines. Pull request #675 already moved the report requirements from this page to `docs/protocol/file-reports.md`. The runner file report limits change added about 28 lines of panel totals and notices to the Files and changes section.
- **Problem:** The page grew from 252 to about 280 lines, past the documentation skill's target.
- **Impact if no action:** The page is slower to read and review, and the next addition passes 300 lines.
- **Root question:** How does the Files and changes page get back near its length target?
- **Options:**
  - **A.** Move the picture rules, about 45 lines, to a linked child page such as `docs/protocol/file-pictures.md`. Keep a link at the old heading, so inbound anchors survive. Effort: Small.
  - **B.** Shorten the panel bullets. This drops facts that the panels need. Effort: Small.
- **Left out:** Another split of the report rules, because `file-reports.md` already holds them.
- **Wider fix:** None. The documentation skill already sets the rule.
- **Previous examples:** Pull request #675 split the report rules from the same page.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the release of the limits documentation forbade a second split of this page.
