# A repeated model move ignores fast mode

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-12, from Milestone 5 of the fast mode plan on branch `calummoore/bern-mapm`. Round 1 of its review raised it again as finding 2 on 2026-11-13, and its check added option F.
- **Location:** `src/chat/state/model-moves.ts:40` (`waitingMove`).
- **Reason:** The case is rare, and the wider fix touches the shared choice type that every reader of a choice uses.

- **Terms:**
  - **Choice:** the agent, the model, the effort, and the fast mode of a message. The type is `AgentChoice` in `src/shared/agents.ts`.
  - **Model move:** a pick of a model of the other agent, which opens a new session with the draft.
- **Background:**
  - When the request of a model move gets no answer, a second pick of the same model resends the same request, so only one session opens.
  - `waitingMove` treats two picks as the same when the agent, the model, and the effort match. It does not compare fast mode.
  - The routine draft and the chat picker had the same gap. Milestone 5 of the fast mode plan fixed both, each with its own comparison.
- **Problem:** A member can change fast mode between the two picks. The second pick then resends the old fast mode.
- **Impact if no action:** The new session can start at the wrong speed. The member can fix it with the switch.
- **Root question:** Which choice does a repeated pick of a model of the other agent carry?
- **Options:**
  - **A.** Compare fast mode in `waitingMove` too. If the first request worked, two sessions can open, as a changed effort can do today. Effort: Small.
  - **B.** Change nothing. Effort: Small.
  - **C.** Add one `sameChoice` helper in `src/shared/agents.ts`. Use it in `waitingMove`, in the picker, and in the routine draft. Effort: Small.
  - **F.** C, with a helper that reads a map with one equality for each field of `AgentChoice`, as `FieldEqualities` in `src/app/routine-draft.ts` does. The typecheck then names each comparison that misses a later field. Use it also in the Worker repeat checks of `worker/chat/model-changes.ts` and `worker/chat/messages.ts`, which first read a missing stored fast as false. Add the retry regression case to `src/chat/state/model-moves.test.ts`, because no test catches the stale fast mode today. Effort: Small.
- **Left out:** A separate fast change after the move. It adds a request, and A is better on every point.
- **Wider fix:** F. A hand-written field list in C can miss the next field again. The fast mode branch added fast by hand to seven comparisons and missed `waitingMove`.
- **Previous examples:** The routine draft and the chat picker comparisons, fixed in Milestone 5 of the fast mode plan.
- **Recommendation:** F. It costs the same as C, and the typecheck catches a missed field.
- **Action:** fix after merge, apply F, because the case is rare and the fix does not get harder after the merge.
