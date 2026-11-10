# Preview follow-up links to a deleted item

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during documentation integration on `calummoore/github-status-bar-actions`.
- **Location:** `plans/follow-ups/preview-polling-activity.md`, its Previous examples and Related fields.
- **Reason:** Main deleted the referenced item before this branch integrated it. The two links are unchanged by the pull request action change.

- **Terms:**
  - **Port preview:** A server in a workspace cloud computer that the app shows through its preview domain.
  - **Terminal reply:** Data that the browser terminal sends automatically in response to terminal output, without user input.
- **Background:** The preview polling follow-up asks which preview use counts as activity for the idle stop. The user deferred that choice on 8 November 2026. Its current rule counts every authorized preview request and socket handshake. The item names automatic terminal replies as an earlier case of activity without user input.
- **Problem:** Its Previous examples and Related fields both link to `terminal-replies-count-as-activity.md`. That file no longer exists. Main deleted it in commit `f4eb5351`. The two links remain, so the follow-up loses its related context.
- **Impact if no action:** A reader cannot open the cited example. The text does not tell the reader whether the terminal work remains open or has completed.
- **Root question:** How should this follow-up retain its context after its related item disappears?
- **Options:**
  - **A.** Check the current terminal activity code and the deletion commit. Copy the needed example facts into the preview item. Give the example its correct current status and replace the broken references with live paths or a history permalink. Effort: Small.
- **Left out:** Restoring the removed item can duplicate completed work. Deleting the example without preserving its facts loses context. A new link gate requires approval and does not repair these links.
- **Wider fix:** Already in force. The plans skill requires self-contained follow-up items. The documentation and Git skills require working references and history permalinks when needed.
- **Previous examples:** Both broken links refer to the same deleted terminal item. No other missing target was found in the plan link check.
- **Recommendation:** A. It keeps the decision context without reopening or dropping other work.
- **Action:** fix after merge, apply A, because these existing plan references are outside the pull request action diff.

The two affected fields currently say that automatic terminal replies also count as activity without input. They link the terminal case to the same activity rule and the Input activity section of `worker/lifecycle/README.md`.

Preserve the preview question, every option, the chosen activity rule, and the user's deferred decision. This task repairs context and links only. It does not change which preview requests count as activity. Read `worker/terminal/service.ts`, `worker/lifecycle/input-activity-owner.ts`, the current Input activity guide, and the deletion commit before changing the terminal example's tense or status.
