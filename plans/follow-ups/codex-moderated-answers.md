# The chat ignores the moderation of Codex answers

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the branch `calummoore/kyoto-votd`, which updated the pinned Codex from 0.167.0 to 0.170.0.
- **Location:** `runner/sdk-helper/src/providers/codex-events.ts`, `docs/protocol/chat-and-events.md`.
- **Reason:** The runner already showed every Codex answer before that branch, and no requirement says how the chat shows a moderated answer.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **App Server:** the JSON-RPC program `codex app-server` that the runner starts for each Codex session. The runner reads its `item/completed` notifications.
  - **Moderation field:** the new `moderation` field of an `agentMessage` item in Codex 0.170.0. Its shape is `{ moderated: boolean, display: AgentMessageDisplay | null }`.
- **Background:**
  - The App Server protocol of Codex 0.170.0 adds the moderation field. Codex 0.167.0 had no such field. The generated types come from `codex app-server generate-ts`.
  - `AgentMessageDisplay` has three modes. `show` can add a `wellbeingHelpline` annotation and trusted contacts. `hide` gives a replacement of the kind `wellbeingPromptHelpline`. `block` gives a block reason. Its comment says "How Chat should present a recovered answer."
  - `runner/sdk-helper/src/providers/codex-events.ts` builds the chat answer from the `text` of an `agentMessage` item. It does not read the moderation field.
  - No run with a real account showed a moderated answer. It is not known whether `text` holds the original answer when the mode is `hide` or `block`.
- **Problem:** When OpenAI marks a Codex answer as hidden or blocked, the chat can still show its text, and it does not show the helpline that OpenAI asks for.
- **Impact if no action:** A user in distress can see an answer that OpenAI meant to replace with a helpline. The chat also shows no reason when OpenAI blocks an answer.
- **Root question:** How does the chat show a Codex answer that OpenAI moderated?
- **Options:**
  - **A.** Change nothing. The chat shows `text` as it did with Codex 0.167.0. Effort: Small.
  - **B.** Carry the display mode in the answer event, add a protocol requirement, and show the helpline or the block reason in the chat in place of the text. This needs a mockup, a runner message change, and a Worker change. Effort: Large.
  - **C.** In the runner, replace the text of a `hide` or `block` answer with one fixed sentence that says that OpenAI held back the answer. Add a protocol requirement for the sentence. Effort: Medium.
- **Left out:** Drop moderated answers from the chat: the user then sees a turn with no answer and no reason.
- **Wider fix:** None, because this is one new field of one agent.
- **Previous examples:** None found.
- **Recommendation:** C. It respects OpenAI's moderation with a small runner change and no new chat parts. B gives the full experience if the moderation is common.
- **Action:** ask the user, because the options add new behaviour at the boundary that no requirement covers.
