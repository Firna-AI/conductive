# Which Codex usage limits show a reset time

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Open finding. It waits for the user.
- **Added:** 2026-11-21, from review round 2 (finding 9) of branch `calummoore/gateway-long-429-ends-the-codex-turn-qh75`.
- **Location:** `runner/sdk-helper/src/providers/failure.ts` (`resetTime`), `runner/sdk-helper/src/providers/codex-events.ts`, `docs/protocol/model-gateway-long-waits.md`.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Long wait error:** the HTTP 429 with error type `usage_limit_reached` that the model gateway sends to Codex in place of an upstream 429 with a `retry-after` over 10 minutes.
  - **Usage limit cause:** the fixed chat text "The agent account reached its usage limit. Check your agent account." of the runner.
- **Background:** Codex 0.170.0 writes "Try again at <time>." for each usage limit error that has a reset time. This includes the long wait error, and also a real ChatGPT plan limit that OpenAI sends with `resets_at`. The runner used to show only the fixed usage limit cause. The branch adds the time of Codex to that cause for every Codex usage limit failure.
- **Problem:** The approved decision (decision 2 B) covers the reset time of the long wait error only. A real ChatGPT plan limit now also shows its reset time in the chat.
- **Impact if no action:** A ChatGPT sign-in that reaches its plan limit shows "Try again at <time> <zone>." This is new chat text that no decision covers. The time is the reset time that OpenAI gives.
- **Root question:** Which Codex usage limits show their reset time in the chat?
- **Options:**
  - **A.** Keep the current branch behaviour: every Codex usage limit failure with a reset time shows it. Write this in the long waits protocol doc. Effort: Small.
  - **B.** Show the time only for the long wait error. The gateway marks its error, for example with the `x-codex-promo-message` header that Codex 0.170.0 reads, and the runner adds the time only with the mark. Effort: Small.
  - **C.** Carry the source and the reset time as structured fields from Codex to the runner. This needs support from Codex. Effort: Large.
- **Left out:** A record of each gateway long wait on the turn, matched to the later failure, because concurrent model requests make the match unsure.
- **Wider fix:** C.
- **Previous examples:** `plans/follow-ups/failure-names-requested-model.md` records a similar loss of context when the runner reads only the error text.
- **Recommendation:** A. A user with a plan limit gets the same useful reset time, and B puts a hidden mark into a promotion field of Codex.
- **Action:** ask the user, because A changes the chat text of a plan limit, which no decision covers.
