# A short own endpoint key damages the answers of the gateway

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, finding 76 of review round 2 on branch `calummoore/cli-proxy-setup`, first seen in the check of finding 14 of round 1.
- **Location:** `worker/model-gateway/headers.ts` (the header filter), `worker/model-gateway/redact.ts` (the error body filter), `src/shared/endpoint-address.ts` (the secret forms of a saved address), and the save of an own endpoint login in `worker/app-api/boot.ts`.
- **Reason:** It needs an unusual short key, and the fix is as easy after the merge.

- **Terms:**
  - **Own endpoint login:** an agent login that sends the model requests of an agent to a gateway or a proxy that the user chose, with the user's key, through the model gateway in the Worker.
  - **Error redaction:** the gateway replaces each echo of a saved secret in an error body and in the allowed response headers with `[redacted]`, so that no sandbox gets the key or the saved address.
- **Background:**
  - The protocol says that no cloud computer gets the key or the address of an own endpoint login, and the gateway hides each echo of them. The Privacy page, the Terms page, and the agent logins guide make the same promise.
  - The form and the save require a key. A user of an endpoint that checks no key types a placeholder, such as `x`.
  - The filters replace the key as a plain substring at any length. Path segments and query values of the saved address under 12 characters match only inside a whole form.
  - With the key `x`, both routes change `text/event-stream` to `te[redacted]t/event-stream`, "The model does not exist" to "The model does not e[redacted]ist", and `context_length_exceeded` to `conte[redacted]t_length_e[redacted]ceeded`. The changed error loses the code `agent_model_unavailable`, which the runner reads from the error text, so the turn fails with `agent_failed` in place of the cause that names the model.
  - The key `1` makes a JSON error body invalid, as in `"count":[redacted]`. The key `e` changes `x-should-retry: true`, and rewrites an earlier marker to `[r[redacted]dact[redacted]d]`, because the header filter applies each secret to the text that the previous secret already changed. The body filter replaces in one pass.
- **Problem:** A short key makes the filters change ordinary characters in the answers that Claude and Codex read.
- **Impact if no action:** A user with a placeholder key sees broken streams and wrong failure causes.
- **Root question:** How does the gateway tell a real echo of a saved key or address part from the same characters that occur by chance in an answer, so that each value that Claude or Codex reads stays unchanged, for a key of any length and content?
- **Options:**
  - **A.** Keep standard protocol values unchanged, and match a short key only at token boundaries in each filter. Cost: a boundary rule still changes `"param":null` to `"param":[redacted]` for the key `null`. Effort: Small.
  - **B.** Give both filters one shared redaction policy, built in one place. For a match under 12 characters, it leaves JSON structure, JSON literals and numbers, and each header with a fixed format unchanged, and it replaces in one pass. Keep the regressions of the address forms in `worker/model-gateway/endpoint-errors.test.ts`, and add the keys `x`, `1`, `e`, and `null`, the echo `Bearer x`, and a check of the turn cause. Effort: Medium.
  - **D.** Apply the 12-character rule of the address parts to the key: a key under 12 characters matches only inside its credential forms, such as `Bearer <key>`, `"api_key":"<key>"`, an `x-api-key` value, or `key=<key>`. Cost: an echo of a short key in other text, such as `Invalid key x`, reaches sandbox code, so the protocol, the Privacy page, the Terms page, and the guide narrow their promise. Needs the user. Effort: Medium.
  - **E.** Make the key of an own endpoint login optional, and refuse a key under 12 characters, with a refusal that says to leave the field empty when the endpoint checks no key. Without a key, the gateway and the model list read send no key header. Cost: a real short key, such as `sk-1234`, the sample master key of LiteLLM, can no longer connect. It adds a rejection, so it needs the user. Effort: Medium.
- **Left out:** A plain skip of short keys in the redaction, because D is better on every point. Removing the redaction, because it breaks the promise that no cloud computer gets the key.
- **Wider fix:** B, with its condition. Without it, a boundary rule stays a direct fix.
- **Previous examples:** Commit `216ed679`, which separated masked display text from operational identifiers in `src/shared/output-fields.ts`.
- **Recommendation:** B. It keeps each saved key and each public promise with no new decision. D is the choice only if the user accepts that a short key can show in other error text.
- **Action:** fix after merge, apply B, because the bug needs an unusual short key and the fix is as easy after the merge.
