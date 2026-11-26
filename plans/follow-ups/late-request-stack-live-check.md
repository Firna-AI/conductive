# Check the request stack and tab mark live

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-26, from the post-merge task of the plan of branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`.
- **Location:** None.
- **Reason:** The check needs the deployed change on `conductive.build` and a real cloud computer.

- **Terms:**
  - **Request stack:** the region just above the composer of a session. It shows one open request at a time, as `docs/protocol/request-stack.md` says.
  - **Late secret request:** a secret request whose tool call stopped waiting, after 90 seconds or at the end of its turn, before a member answered it, as `docs/protocol/secret-late-answers.md` says.
  - **Needs-input mark:** the blue mark that takes the place of the icon of a session tab while its session holds an open request, as `docs/protocol/tab-row.md` says.
- **Background:** The change keeps each open request, also a late secret request, in the request stack until a member answers it or it ends. It also marks each session tab that holds an open request. The tests and the development fakes checked both. No check ran against the production Worker and a real agent.
- **Task:**
  1. On `conductive.build`, open a workspace with a long chat.
  2. Let an agent ask for a secret with `conductive secrets run`, and do not answer for more than 90 seconds, so the request turns late.
  3. Check that the late request stays in the stack above the composer, with its late line and its choices.
  4. Open another session tab. Check that the tab of the first session shows the needs-input mark.
  5. Answer the request. Check that it takes its place in its turn, and that the mark ends.
- **Impact if no action:** A defect that only the production Worker or a real agent shows stays unseen until a member meets it.
- **Needs:** The deployed change, and a workspace with a secret that an agent may ask for.
- **Done when:** Each step of the task shows the expected result, or a new follow-up item records each difference.
