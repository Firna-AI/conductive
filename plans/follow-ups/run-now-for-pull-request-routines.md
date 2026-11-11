# Run now cannot test a pull request routine

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, decision 510 of `plans/routines.md`. The user chose C now and B as a later follow-up.
- **Location:** `src/shell/routines/RunNow.tsx`, the routine page that shows it (`src/shell/routines/RoutineEditor.tsx`), the rule `offersRunNow` in `docs/mockups/src/components/routines/triggerCopy.ts`, the Run now route in `worker/routines/run-route.ts`, the run record in `worker/routines/run-record-data.ts`, and `docs/protocol/routines.md`.
- **Reason:** The user chose to hide Run now on pull request routines first, and to add this test later.

- **Terms:**
  - **Routine:** a saved prompt that starts an agent run on a schedule, on a GitHub pull request event, or with Run now. Each run creates a new workspace.
  - **Run now:** the button on the routine page that starts one run by hand. Only the owner of the routine can use it.
  - **Pull request run:** a run that a pull request event starts. It creates its branch from the head commit of the pull request, and its base branch is the head branch of the pull request.
- **Background:**
  - A Run now run has the trigger "Run now" and no pull request.
  - On 9 November 2026 the user chose option C of decision 510 for now: Run now does not show on a routine whose triggers are all pull request triggers. A routine with a schedule, or with no trigger, keeps Run now.
  - The same day, the user chose option B as this follow-up.
  - Decision 506 C: only a pull request that a member of the org opened, and only an event that a member caused, start a run. An author filter with "is" and "is not" lists can narrow or widen that. A pull request from a fork never starts a run.
- **Problem:** The owner of a review routine cannot try it on a chosen pull request before a real event.
- **Impact if no action:** The owner tests such a routine only on live events, for example with a draft pull request.
- **Root question:** How does the owner try a pull request routine on a real pull request, at a time that the owner chooses?
- **Options:**
  - **A.** Keep option C of decision 510: no Run now on such a routine. Effort: Small.
  - **B.** When the routine has a pull request trigger, Run now asks for a pull request number and an event: opened, pushed, or merged. The run then works as a run of that event does, with the same branch, base branch, and trigger facts. It applies the fork rule and the author rule of decision 506 C. Effort: Medium.
  - **C.** Run again, for the owner, on any pull request run of the Runs list, at the current head of its pull request. A first test still needs one real event. Effort: Medium.
- **Left out:** A preview of the first message for a chosen pull request. It shows the text, not the work of the agent.
- **Wider fix:** None, because this item changes one action.
- **Previous examples:** None found.
- **Recommendation:** B. The user chose it on 9 November 2026.
- **Action:** fix after merge, apply B, because the user chose C now and B as a later follow-up on 9 November 2026.
