# Agent session writes reach unactivated imports

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from pull request #223, branch `calummoore/conductor-import-option`. The integration of `main` at `89ff2747863f75f259f05716f3f6f2d0306f257c` into head `cfbf916c6a4c4da3c953f0df368ea858fa2a8fb2` found it at the merge commit `51bbebd064463071049595c7ecfd3ce5309d6925`, finding 37. It includes the independent finding check and the root outcome of the same day.
- **Location:** The lines are at the merge commit `16a4f76c`, tree `f810e562a0f18ce5725a507d19e2b5de6aa08a10`.
  - `worker/tools/workspace.ts:54-85`, `writeAgentSession`, whose authorize step at `:57-83` checks the org, the record, the archived mark at `:74-79`, and the sender, but not the state `inactive`.
  - `worker/chat/browser-authorization.ts:45-53`, the browser guard that refuses each write in a Not active import.
  - `worker/chat/tool-session-write.ts:134-172` and `worker/chat/messages.ts:83-117`, where the tool write stores a session, a queued message, a turn, and a runner command.
  - `worker/tools/session-write-composition.ts:22-67`, the call into the workspace object and the `resume` reply.
  - `docs/protocol/session-calls.md:43-46`, the refusal of an archived workspace by the two writes. `worker/tools/README.md:82`, the checks of the real object.
- **Reason:** The import review used both of its source fix rounds, and this Rare Medium product bug loses no data and grants no new access.

- **History:** 2026-11-11, root integration record. The Location field now points to `16a4f76c`. The detailed static trace keeps its reviewed source citations. The reviewed Location field was:

> The lines are at the merge commit `51bbebd0`, tree `116f25ec0d63451b0fb569343388aaea8dd10c46`.
>   - `worker/tools/workspace.ts:37-68`, `writeAgentSession`, whose authorize step at `:40-66` checks the org, the record, the archived mark at `:57-62`, and the sender, but not the state `inactive`.
>   - `worker/chat/browser-authorization.ts:45-53`, the browser guard that refuses each write in a Not active import.
>   - `worker/chat/tool-session-write.ts:134-172` and `worker/chat/messages.ts:83-117`, where the tool write stores a session, a queued message, a turn, and a runner command.
>   - `worker/tools/session-write-composition.ts:22-67`, the call into the workspace object and the `resume` reply.
>   - `docs/protocol/session-calls.md:43-46`, the refusal of an archived workspace by the two writes. `worker/tools/README.md:82`, the checks of the real object.

- **Source:** Implementation. **Category:** Product bug.
- **Grade reasons:**
  - Severity is Medium. A visible defect breaks a stated requirement. No data is lost, and no access is granted.
  - Likelihood is Rare. Normal delegation targets a workspace that an agent made or that a member names, and a member activates an import before work there.
  - Confidence is High. A static trace reads each step of the merged source. No runtime probe ran, and nobody rendered the page.
  - Harder later is No. The tool API comes from `main`, and the fix adds no stored format. The project is not in production.
- **Terms:**
  - **Not active import:** an imported workspace whose first activation has not started. Its record has the state `inactive`, and the app shows it as Not active.
  - **Tool write:** a `create_session` or `send_message` call of the workspace tools that agents use.
  - **Admission owner:** one function that decides whether the chat accepts a write for one workspace record.
- **Background:**
  - Conductive imports local Conductor workspaces into cloud workspaces. An imported workspace has old documents, but no session, until its first activation.
  - `docs/protocol/imported-workspaces.md:24-25` says that the workspace "has no first message and no session until its activation". `:43-46` says that its chat asks Activate in place of the composer, so that no message goes before the activation, because the person chooses when the cloud computer starts.
  - `docs/protocol/messages-and-attachments.md:78-80` says that an imported workspace accepts no message before its activation starts. `:73-74` says that a message from the agent tools follows these rules. `docs/architecture.md:41-42` repeats the no-session rule.
  - After a failed or stopped activation, the app accepts messages, which wait for Try again, at `messages-and-attachments.md:75-77`.
  - The agent tools of `main` let an agent in one workspace create a session and send a message in each live workspace of its org. `docs/protocol/session-calls.md:43-46` makes both writes refuse an archived workspace with HTTP 409 `workspace_archived`. `:174-176` says that a call without a first message makes an empty session "as "+" does". `:189-192` says that a tool message follows the Messages rules "as a message of its sender does".
  - The user's decisions of 10 November 2026 on the agent tools set the reach of the session calls. They also make a tool message start a cloud computer in the same cases as an open by a member. A failed first start still waits for Try again.
  - The import's user decision of 9 November 2026 chose a design in which the app asks to activate when the person opens the workspace. It did not choose a first message that starts the workspace.
  - The browser guard refuses each request other than `GET` and `HEAD` for a workspace in the state `inactive`, with HTTP 409 `workspace_not_active` and the message "Activate this workspace to start a session.", at `worker/chat/browser-authorization.ts:45-53`. The test at `worker/conductor-import/workspace-data.test.ts:138-149` checks that "+" gets this refusal.
- **Problem:**
  - The tools handler takes the caller from its workspace token, at `worker/tools/handler.ts:54-62`. `writeSessionsFromTool` needs a running calling turn, at `worker/tools/session-routes.ts:170-204`. So the caller is always another workspace.
  - `writeSessionFromTool` calls `writeAgentSession` on the target workspace object, at `worker/tools/session-write-composition.ts:22-26`. The import class of the object does not override the method.
  - Inside the chat queue, the authorize step at `worker/tools/workspace.ts:40-66` checks the org, the record, the archived mark, and the sender. `findChatWorkspace` returns the state, but the code does not read it. No later step checks it, at `worker/chat/workspace-operations.ts:44-63`, `worker/chat/tool-session-write.ts:35-173`, or `worker/chat/messages.ts:57`.
  - `acceptToolSessionWrite` creates the session, at `tool-session-write.ts:134-172`. With text, `acceptMessage` stores a `queued` message, a turn, and a runner command, at `messages.ts:83-117`. The store publishes the events to each open tab.
  - A Not active import has no session of its own, as `worker/conductor-import/workspace-data.test.ts:102-115` shows. So `send_message` reaches only a session that a tool `create_session` made. Each other session ID gets `session_not_found`.
  - `resumesAtOpen` returns false for an import that awaits activation, at `src/app/first-start.ts:56`, and the state `inactive` is not `error`. So the reply gives `resume.state: not_needed`, at `worker/tools/session-write-composition.ts:29-67`. No start is queued.
  - A Not active import has no workspace token, so no runner connects, as `workspace-data.test.ts:124-128` shows. After a later successful activation, the delivery gate holds turn and message commands until `activation_completed_at` is set and the startup is prepared, at `worker/chat/runner-delivery.ts:104-108`, `worker/chat/workspace-lifecycle-hooks.ts:43-51`, and `worker/lifecycle/import-activation-data.ts:19-33`. Then the held tool turn runs at once for its sender.
- **Impact if no action:**
  - An agent can put a session, and a queued message, into a Not active import. The chat state of each member gets them, because no code in `src/chat` filters live sessions for a Not active workspace.
  - The calling agent reads that no start is needed. Its task waits until a member activates, which can be never.
  - The member who activates then starts a task that this member did not send.
  - The merged rules above say that none of this can happen.
- **Evidence:**
  - The tool path files have the same blob on `main` and on the merge. The merge changed `workspace-operations.ts` only to add `seedImport`. The import change adds the state `inactive`, its rules, and the browser guard, but it does not guard the tool path of `main`. So the problem exists only in the composed tree.
  - Commit `80401a06` of `main` made the same kind of change as an agent call: "A create or a send refuses an archived workspace with the existing `workspace_archived` error. Reason: an archived chat is read-only."
  - This is a static trace of the merged source. Nobody rendered the page, so the claim that members see the session rests on the chat event stream and on the absence of a filter in `src/chat`.
- **Root question:** What may an agent session call do to an imported workspace whose first activation has not started?
  - The first words asked what an agent tool write does to an imported workspace before its activation. The finding check replaced them on 2026-11-11, because the import rules accept messages during and after a failed activation, so the question must name the start of the first activation.
- **Options:**
  - **A.** Change nothing. The code and the merged docs stay in disagreement. Effort: Small.
  - **B.** Refuse `create_session` and `send_message` there with HTTP 409 `workspace_not_active`, as the browser routes do. Key the check on the state `inactive`, as the browser guard does. Add the rule to `session-calls.md` with a test. Effort: Medium.
  - **C.** Let a tool write start the activation. This drops the import rule that the person chooses when the cloud computer starts. It changes the import's user decision of 9 November 2026, which chose an Activate question over a first message that starts the workspace. Effort: Medium.
  - **D.** Accept the tool session and message, and hold them until a member activates. The runner already holds the turn until the activation completes. D changes the reply to `waiting`, drops the no-session and no-message rules from three docs, and needs a drawn Not active state with held sessions. It repeats the wait that the user rejected for stopped workspaces on 10 November 2026. Effort: Large.
    - The first words graded D Medium. The finding check corrected D to Large on 2026-11-11.
  - **E.** Give chat writes one admission owner. Effort: Medium.
    - One function in `worker/chat` takes the workspace record. It refuses an archived workspace with `workspace_archived`, and a Not active import with `workspace_not_active`, with the existing messages.
    - The browser write path and `writeAgentSession` call it in place of their own state checks. Keep each current code, message, and method rule.
    - Keep the reads: the two session reads still reach the import.
    - Keep message acceptance during and after a failed or stopped activation. Key the refusal on the state `inactive` only.
    - Add the Not active case to the existing refusal test at `worker/features/agent-session-writes.test.ts:113`.
    - Add the refusal to `docs/protocol/session-calls.md:43-46` and to `worker/tools/README.md:82`. Read both legal pages and all public guides in full. Update the write exceptions at `src/marketing/docs/security.md:65-68` and `src/marketing/docs/sessions-and-chat.md:72-73`.
    - Cost: two current call sites move to the helper, with no change of codes.
  - **F.** Keep the refusal of B, and give agents an explicit Activate call: an MCP call, a CLI command, and a route that starts the activation for the sender of the calling turn. This changes the import's user decision of 9 November 2026, where the app asks the person to activate. It adds a public call, its docs, the guides, the tool descriptions, and an image rebuild. Effort: Large.
- **Shared assumptions checked:**
  - Reads keep reaching the import. Source: the user's decision on the reach of the session calls, and `docs/protocol/imported-workspaces.md:50-52`. Kept.
  - The line is the start of the first activation, which is the state `inactive`. Source: `messages-and-attachments.md:75-80` and `imported-workspaces.md:39-41`. Kept. A guard on "awaits a successful activation" would break it.
  - A tool write starts a cloud computer only in the same cases as an open. Source: the user's decisions of 10 November 2026 and the import decision of 9 November 2026. Kept. C and F drop it.
  - A tool write acts for the sender of the calling turn, and can do what that member can do. Source: the Reach and The sender sections of `session-calls.md`. Kept. D drops it, because a member cannot write in a Not active import.
  - The check lives in the tool route. Source: the text of B. It is not a requirement. E drops it.
- **Left out:**
  - HTTP 404 for tool writes. It breaks the org-wide reach of the session calls, and reads still find the workspace. B is better on every point.
  - A session with no message. It breaks the requirement of no session until the activation, which stays.
  - A guard on each import that waits for a successful activation. It breaks the Messages rule that accepts messages during and after a failed activation.
- **Wider fix:** E. One admission owner for chat writes keeps one copy of the state checks, so a later write entry cannot miss the Not active state. B adds one more copy. The first words named no wider fix and said that a shared check is the same change as B. That does not hold.
- **Previous examples:**
  - The browser guard at `worker/chat/browser-authorization.ts:45-53` covers the same state for the browser routes.
  - Commit `80401a06` of `main` applied the archived refusal to these tool writes as an agent call.
  - Commit `4ee00ef8` of the import change fenced Not active writes entry by entry.
- **Related:**
  - [conductor-import-unstarted-archive.md](conductor-import-unstarted-archive.md): the same class of state rules for an import that never started. No conflict, and neither fix waits for the other. If that item chooses a Restore of the stored work, its Restore must put a never-started import back in Not active, so that E refuses tool writes there again. One later owner of the import phases could serve both that Restore rule and this write rule.
  - [conductor-import-bar-before-activation.md](conductor-import-bar-before-activation.md): the same class, and a shared wider fix. That item decides which actions the pull request bar offers before an activation, an open user question. Its recommended option uses the same Not active boundary for the agent actions of the bar. Its wider option, one message capability for every write control of the workspace, pairs with E here on the server. E waits for no answer there.
  - [legal-agent-message-state.md](legal-agent-message-state.md): the same rule in the Terms. The Terms tools sentence says that agents send messages in every workspace of the org. That item restates the refusals that the protocol requires and that E, deferred, will apply to the code. The Terms restate the protocol, so neither item waits for the other.
  - [conductor-import-terms-message-state.md](conductor-import-terms-message-state.md): the same message rule in the Terms. That record corrects the member sentence. E here remains deferred, and no user answer is pending for that code fix. The Terms describe the required rule, so neither record waits for an answer from the other.


- **Adjacent source observations, not fixed by E:**
  - **The reply status after a stopped activation.** Confidence: medium, static trace only.
    - `worker/tools/session-write-composition.ts:65` returns `waiting` only for the state `error`. An import whose activation started and then stopped has the state `stopped`, and `failedFirstStart` at `src/app/first-start.ts:37-38` treats it as a failed first start. `resumesAtOpen` returns false for it. So the reply keeps `not_needed` from `:29`.
    - `worker/tools/README.md:102` says that `waiting` means that no new start was queued, including a failed first start that still needs Try again.
    - The message is accepted and waits for Try again, so the agent reads a status that the README does not give for this case.
    - E refuses only the state `inactive`, so it does not change this reply. A later owner of the import phases and their reply status can take it. Check it with its own regression before any change.
  - **An attachment upload to a Not active import.** Confidence: high for the code, and no broken requirement found.
    - `worker/chat/attachment-routes.ts:44` checks only the archived mark, so the upload route accepts a file for a Not active import.
    - `docs/protocol/message-attachments.md:24-25` says that an upload works also before the cloud computer of its workspace exists. `:100-101` deletes an unsent file 7 days after its upload. `docs/protocol/imported-workspaces.md:43-46` forbids messages before the activation, not uploads.
    - The Not active chat shows Activate in place of the composer, so only a direct request uploads there. The file stays unsent until a message uses it after the activation starts, or the app deletes it after 7 days.
    - So the observation breaks no stated requirement. Its only cost, unsent files kept for 7 days, is the class of [draft-attachment-quota.md](draft-attachment-quota.md).
    - This item adopts no rule for such uploads. A refusal would be a new refusal, which needs the user's decision.
- **Recommendation:** E. It applies the settled refusal to tool writes with the existing code, and one owner keeps a later write entry from missing the Not active state. B is the direct fix.
  - The first words recommended B. The finding check of 2026-11-11 changed the recommendation to E.
  - The root kept E on 2026-11-11, with the existing inactive-only `workspace_not_active` and archived refusals. It found that the Messages rule already covers tool messages, and that an empty create acts as "+".
- **Action:** fix after merge, apply E, because this Medium product bug has the likelihood Rare, its fix does not get harder after the merge, and both historical source fix rounds are used.
  - Existing requirements settle E. The merged Messages rule refuses each message to a Not active import, and the rule of `main` makes tool messages follow it. E applies that refusal with the existing code and changes no requirement. No user question remains.
  - The first words' Action was: "ask the user, because B adds a new rejection, which the always-on rules and the brief reserve for the user. This merge applies no option." The finding check and the root found that E applies a settled refusal to a new caller, so it adds no new rejection.
- **Validation of the fix:**
  - Through the tool route, call `create_session` with and without text, and `send_message`, for a Not active import. Assert HTTP 409 `workspace_not_active`, no stored session, and no stored message.
  - Assert that the same calls still work after a failed and after a stopped activation, and that both reads still reach a Not active import.
  - Assert that an archived import still gets `workspace_archived`.
  - See each new refusal case fail first with the current code.
