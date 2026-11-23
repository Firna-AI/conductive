# Browser sends do not share one start rule

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from review finding 1 of `calummoore/highlight-and-prompt-mvmd`, and its problem outside the scope.
- **Location:** `worker/chat/router.ts` (the `SENT_MESSAGE` list of browser sends), `worker/chat/explain-session.ts`, `src/chat/components/transcript-inputs.ts`, and `docs/protocol/stop-and-resume.md`.
- **Reason:** The user chose B on 2026-11-21 and asked to keep it as follow-up work, outside the Explain branch.

- **Terms:**
  - **Cloud computer:** the sandbox of a workspace. It stops after 30 minutes without activity.
  - **Start rule:** the cases in which a request starts a stopped cloud computer, as `docs/protocol/stop-and-resume.md` lists them.
  - **Browser send:** a request from the app that accepts a message: a message, a Try again, or Explain.
- **Background:**
  - The open of a workspace, the open of a file or diff tab, a tool message, a late secret answer, and the written prompt of Explain each start a stopped cloud computer.
  - Each of these starts calls one shared start step in the Worker. Each new entry point must remember to call it.
  - A message from the composer cannot be sent while the computer is stopped, because a bar with Resume takes the place of the composer.
  - Try again on a failed turn stays usable in a stopped tab. Its message waits in the queue, and nothing starts the computer.
- **Problem:** No single place in the Worker applies the start rule to every browser send. So Try again in a stopped tab waits with no start, and a new send path can miss the start, as Explain first did.
- **Impact if no action:** A member who presses Try again in a stopped tab sees nothing happen until they press Resume.
- **Root question:** Which sends from the app start a stopped cloud computer, and where does the Worker decide that once?
- **Options:**
  - **A.** Hide or disable Try again while the computer is stopped, as the composer is. No start rule changes. Effort: Small.
  - **B.** Let the outer Worker run the shared start step after each successful browser send in `SENT_MESSAGE`. Add Try again to the start list of `docs/protocol/stop-and-resume.md`. Effort: Medium.
- **Left out:** A start for every queued message in the lifecycle code was left out, because it also starts the computer again after a failed start that left work in the queue.
- **Wider fix:** B. One place applies the start rule to every browser send.
- **Previous examples:** Explain first missed the start, in review finding 1 of `calummoore/highlight-and-prompt-mvmd`.
- **Recommendation:** B. A press that asks the agent for work should start the computer, as Explain does.
- **Decision:** The user chose B on 2026-11-21. The branch that applies it adds Try again to the start list of `docs/protocol/stop-and-resume.md` and checks the guides and the legal pages for sentences that restate the start rule.
- **Action:** fix after merge, apply B.
