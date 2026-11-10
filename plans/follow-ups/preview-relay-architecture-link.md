# Preview relay links the wrong architecture page

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the CI base integration audit on `calummoore/github-status-bar-actions`.
- **Location:** `docs/protocol/terminal-previews-and-desktop.md`, Port previews, the Sandbox software link.
- **Reason:** The incoming main file already has this broken anchor, and the pull request action branch does not change it.

- **Terms:**
  - **Preview relay:** The program in a workspace's cloud computer that forwards preview requests to a local server port.
  - **Sandbox software:** The architecture section that lists the programs installed in each org image.
- **Background:** The Port previews protocol links to the architecture description of sandbox software. The description now lives in `docs/architecture/components.md`. The protocol file matches incoming main commit `3369dead6a28f1fb24cc05d57bf65a6e2f292242`.
- **Problem:** The link is `[Sandbox software](../architecture.md#sandbox-software)`. `docs/architecture.md` has no Sandbox software heading. `docs/architecture/components.md` has that heading.
- **Impact if no action:** Readers reach the wrong page section and must find the component description themselves.
- **Root question:** How should the preview protocol link to its current sandbox software description?
- **Options:**
  - **A.** Keep the label and change the target to `../architecture/components.md#sandbox-software`. Check that path and heading. Effort: Small.
- **Left out:** Removing the link loses navigation. Copying the section back duplicates its current home. Only one current section supplies the intended description.
- **Wider fix:** Already in force. The documentation skill requires correct relative paths and retained anchors. A new link gate would need approval and is not this repair.
- **Previous examples:** The architecture already uses linked component and flow pages. Its protocol index also moved to a linked page with old pointers retained.
- **Recommendation:** A. It points to the existing canonical section without changing a requirement.
- **Action:** fix after merge, apply A, because the upstream link is outside the pull request action diff.

Change no preview access, header, relay, provider, or public-guide behavior. Add no prose test or gate.
