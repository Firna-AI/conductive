# No requirement says when a run of tool calls folds

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the branch `calummoore/tool-calls-collapsing-issue`, which fixed the open and close cycle of a run of tool calls, decision 1 of that branch.
- **Location:** `docs/protocol/chat-and-events.md`, section "The work of a turn".
- **Reason:** Each option adds a requirement to a protocol doc, and only the user chooses a requirement.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Run of tool calls:** consecutive tool calls of the agent that the chat shows under one line, such as "9 tool calls". A click on the line opens or closes the list of calls.
  - **Turn:** one period of work by the agent. While it runs, the chat shows "Working" or "Thinking" at its end.
  - **Work fold:** the one line, such as "8 tool calls, 7 messages", that holds the work before the answer when a turn ends.
- **Background:**
  - The protocol doc says that each run of tool calls has its own line that folds it while a turn runs. It does not say when a run opens or folds on its own.
  - Before 10 November 2026, the chat showed the calls of a run only while one of them ran. Between two calls, the run folded, and the next call opened it again. So the run opened and closed in a cycle while the agent worked.
  - The user reported it: "tool calls get collapsed before the end of the agent work", and the run "opens again at the next tool call, in a cycle". Those words can mean option B.
  - The fix keeps the newest run of a running turn open while the agent can still add calls to it. A message that waits for the turn does not end that run. The run folds when other work follows it, such as a message or a Mac command card, or when the turn ends. Each other run shows its calls only while one of them is not done. `src/chat/transcript.md` gives the rule of the code.
  - The mockup of a running turn, `app/chat/turns`, shows an earlier run folded after a message, and the current run open.
- **Problem:** The repository rules ask for the missing requirement when a bug reaches the user. The protocol doc still does not say which runs show their calls while the agent works.
- **Impact if no action:** A later change can bring the cycle back, and a review has no requirement to check it against. The behaviour of earlier runs also stays a guess.
- **Root question:** While the agent works, which runs of tool calls show their calls, and when does a run fold on its own?
- **Options:**
  - **A.** The newest run shows its calls while the agent can still add calls to it, also between two calls. A run folds on its own when other work follows it, such as a message, or when the turn ends. The code does this now. Add the requirement to the protocol doc. Effort: Small.
  - **B.** Every run of a running turn shows its calls until the turn ends. Nothing folds on its own while the agent works. Change the code in `src/chat/components/transcript-entries.ts`, the running mockup, the first test in `src/chat/components/WorkFold.dom.test.tsx`, and the docs. A long turn gets long while it runs. Effort: Small.
- **Left out:** A fold after a short pause with no new call fails the goal, because a longer pause still folds the run. A run that never opens on its own hides the work that the user watches, which the user rejected on 8 November 2026 when they chose the work fold. No requirement at all breaks the rule that a protocol doc states what a user sees.
- **Wider fix:** None. The code already takes the open state from whether the run can still grow, not from the moment between two calls.
- **Previous examples:** On 8 November 2026, the user chose to fold the work of an ended turn into one line, and to keep the runs of a running turn as they were.
- **Recommendation:** A. It fixes the cycle and keeps the chat of a long running turn short, as the running mockup shows. Choose B if nothing should fold until the agent stops.
- **Action:** ask the user, because each option adds a requirement to a protocol doc, and only the user chooses a requirement.
