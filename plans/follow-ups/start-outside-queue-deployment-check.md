# Check chat loads during a start on the deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-2d` and its plan "Start calls outside the chat queue".
- **Location:** None
- **Reason:** The check needs the change on the test deployment at `conductive.build`, which deploys each push to `main`.

- **Terms:**
  - **Chat queue:** `ChatStore.run` in `worker/chat/store.ts`, the one serial queue of a workspace Durable Object. Chat requests, runner messages, and lifecycle changes run in it, one at a time.
  - **History request:** one browser request that reads stored events of one session. Its path comes from `chatHistoryPath` in `src/shared/events.ts`.
- **Background:** Before the change, the alarm moved a sandbox start forward about once a second, and each step made D1 queries and Boat calls while it held the chat queue. So each history request that arrived during a start waited for the step. After the change, each progress phase of a start makes its D1 and Boat calls outside the chat queue, with a guard after each call. The integration tests hold a fake Boat reply and show that a history read settles during the held reply. No test runs against the real provider.
- **Task:** On the test deployment, stop a workspace, then open its chat so that it resumes. In the Network tab of the browser, watch the `history` requests while the start steps run. Confirm that each history request ends while the start steps still run, and that the chat shows the history before the start ends.
- **Impact if no action:** A difference between the fake provider and the real provider, such as slower replies, stays unseen until a user meets it.
- **Needs:** The merged change on `conductive.build`, and a member account with a workspace that can stop and resume.
- **Done when:** A resume on the deployment shows the history requests ending during the start steps, and the result is recorded in this item or its pull request.
