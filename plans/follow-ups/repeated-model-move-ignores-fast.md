# A repeated model move ignores fast mode

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-12, from Milestone 5 of the fast mode plan on branch `calummoore/bern-mapm`.
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
- **Left out:** A separate fast change after the move. It adds a request, and A is better on every point.
- **Wider fix:** C.
- **Previous examples:** The routine draft and the chat picker comparisons, fixed in Milestone 5 of the fast mode plan.
- **Recommendation:** C. With one helper, a new field of the choice cannot be missed again.
- **Action:** fix after merge, apply C, because the case is rare and the helper changes the shared choice type.
