# Verify gateway replies to credential read faults

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from the independent check of finding 8 on `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/model-gateway/codex-auth.ts:23-33`, `worker/model-gateway/route.ts:113-120`, and `worker/model-gateway/errors.ts:34-37`.
- **Reason:** Main owns this existing public reply. The review confirmed the mapping but did not establish its intent or the client's retry behavior.

- **Terms:**
  - **Model gateway:** The Worker service that forwards an agent's model requests to OpenAI or Anthropic.
  - **Turn check:** A trusted workspace call that verifies whether a turn can continue.
  - **Renewal:** The exchange that replaces an expiring ChatGPT token.
- **Background:** The gateway's `readCurrent` catch maps credential-read failures to terminal HTTP 403. A raw D1 failure or rejected turn check can reach that catch before any renewal fails. No reconnect cause is then saved. The review did not prove whether the current terminal reply is intended for those raw faults. Main commit `d970f263` owns the behavior. The reporting branch keeps it unchanged.
- **Task:**
  1. Read the model-gateway and token requirements for temporary faults, terminal login errors, and current reply mapping.
  2. Use the existing fake D1 and turn-check seams to reproduce both raw failures before renewal.
  3. Confirm the current HTTP 403 response and absence of a saved reconnect cause.
  4. Inspect the pinned runner's handling of that reply. Determine whether it retries or stops the turn and requests a sign-in.
  5. Establish the intended reply from the requirements and existing client behavior. If a requirement is missing or a public change is needed, ask the user before changing code.
  6. Keep the current response while implementing missing telemetry. Record a separate approved correction if the status should change.
- **Impact if no action:** The intended retry behavior remains unverified. The review cannot establish whether a temporary backend read fault can unnecessarily stop Codex work.
- **Needs:** The code and local test fixtures. No live OpenAI credentials are needed for the reproductions. A user decision is needed only if the intended contract remains unsettled or changes.
- **Related:** `plans/follow-ups/codex-credential-failure-reports.md` reports the hidden raw fault while preserving HTTP 403. That task does not depend on this reply investigation.
- **Done when:** The intended reply and client effect are established. Keep and document the current behavior, or record and implement a user-approved correction. Then delete this item.
