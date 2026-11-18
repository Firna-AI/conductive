# Removed workspaces stay in the list payload

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/quito-q38c`, the plan for archived workspace removal.
- **Location:** `worker/app-api/shell-data.ts:53`
- **Reason:** The removal change needs the rows in the payload so that chips resolve. A smaller payload needs a new way to find a chip target by ID.

### 1. Removed workspaces stay in the list payload

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Performance.
- **Location:** `worker/app-api/shell-data.ts:53`
- **Terms:**
  - **Removed workspace:** an archived workspace whose 14-day Restore window ended. The app keeps its data but leaves it out of the workspace list. Cal chose this on 13 November 2026.
  - **Chip:** a link to a workspace or a session in a chat message, shown with its name and state (`src/chat/links/workspace-links.ts`).
- **Background:** `GET /workspaces` returns every workspace of the org, archived and removed ones included. The app hides removed rows where it builds the list groups (`groupWorkspaces` in `src/app/sections.ts`). Chips resolve only the workspaces in this payload, so a chip to a removed workspace needs its row there. An open list reads the payload again every 5 to 30 seconds.
- **Problem:** The payload grows with each archived workspace, with no end. Most of those rows are never shown.
- **Impact if no action:** Large orgs send and parse more data on each list read over time. Nothing breaks.
- **Root question:** How does the app resolve a chip to a removed workspace without sending every removed row in each list read?
- **Options:**
  - **A.** Keep the rows in the payload. Effort: Small.
  - **B.** Leave removed rows out of `GET /workspaces`. Resolve a chip target that the list does not hold with a read by ID, and cache it. Effort: Medium.
  - **C.** Send removed rows in a separate, rarely read list. Effort: Medium.
- **Left out:** Plain-text chips for removed workspaces break the rule that a link to a removed workspace still opens it.
- **Wider fix:** B. It removes the dependence of chips on the full list.
- **Previous examples:** None found.
- **Recommendation:** B, when an org has enough archived workspaces that the list read is slow.
- **Action:** Fix after merge, apply B. The current payload already holds every archived row, so the removal change does not make it worse.
