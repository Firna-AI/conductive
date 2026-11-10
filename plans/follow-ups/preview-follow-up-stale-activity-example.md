# Preview follow-up has a stale terminal example

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during documentation integration on `calummoore/github-status-bar-actions`.
- **Location:** `plans/follow-ups/preview-polling-activity.md`, its Previous examples and Related fields.
- **Reason:** The historical example is unchanged by the pull request action change. Main repaired its links but left its current-tense claim.

- **Terms:**
  - **Port preview:** A server in a workspace cloud computer that the app shows through its preview domain.
  - **Terminal reply:** Data that the browser terminal sends automatically in response to terminal output, without user input.
- **Background:** The preview polling follow-up asks which preview use counts as activity for the idle stop. The user deferred that choice on 8 November 2026. Its current rule counts every authorized preview request and socket handshake. The item names automatic terminal replies as an earlier case of activity without user input.
- **Problem:** Its Previous examples field still says automatic terminal replies "also count as activity without input of the user". Its Related field describes two pending fixes. The current terminal transport reports no frame activity. `worker/lifecycle/routes.md` and `worker/lifecycle/README.md` state that current behavior. The example does not distinguish the earlier defect from the current product.
- **Impact if no action:** A reader can think the terminal defect remains open. The preview choice then uses an inaccurate description of related work.
- **Root question:** How should this follow-up describe its resolved terminal example?
- **Options:**
  - **A.** Check the current terminal activity code and describe the earlier case as history. Keep the valid history permalinks and state the related work's correct status. Preserve the preview question and every option. Effort: Small.
- **Left out:** Restoring a removed terminal item can duplicate completed work. Dropping the example loses decision context. Changing preview activity is a separate deferred user choice.
- **Wider fix:** Already in force. The plans skill requires self-contained follow-up items. The documentation and Git skills distinguish current facts from history.
- **Previous examples:** Main deleted `terminal-replies-count-as-activity.md` in commit `f4eb5351`. It later replaced both broken relative links with history permalinks at `517671aee868206b101912455f4f5802b5900130`.
- **Recommendation:** A. It keeps the decision context without reopening or changing other work.
- **Action:** fix after merge, apply A, because this existing example is outside the pull request action diff.

The relative-link problem is already fixed. Do not repeat that repair. Read `worker/terminal/service.ts`, `worker/lifecycle/input-activity-owner.ts`, and the Input activity guide before changing the example's tense or status. Preserve the chosen preview rule and the user's deferred decision. This task changes no activity behavior.
