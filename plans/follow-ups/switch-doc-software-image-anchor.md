# Broken anchor in the switch account doc

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, a link check of the changed Markdown files.
- **Location:** `docs/protocol/switch-account.md` (the link `sandbox-software.md#the-software-image`).
- **Reason:** The link is broken on `origin/main` in a line that the branch did not change.

- **Background:** No command checks Markdown links in this repository, so each change checks its own links.
- **Problem:** `docs/protocol/sandbox-software.md` has no heading "The software image". Its headings are Releases, Updates, Installs at idle, and Installs in a build. The link opens the top of the page.
- **Impact if no action:** A reader does not reach the section that the sentence means.
- **Root question:** Where should the link point?
- **Options:**
  - **A.** Point the link to the section that describes the software image, probably `software-image.md` or `sandbox-software.md#installs-in-a-build`. Effort: Small.
- **Left out:** A link check gate needs the user, because it adds a new check.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the defect is outside the scope of the branch that found it.
