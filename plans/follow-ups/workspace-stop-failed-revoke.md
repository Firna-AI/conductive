# A workspace stop can leave its token valid

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32` (pull request #686), from the check of review finding 151, round 2.
- **Location:** `worker/lifecycle/workspace-actions.ts:76`, `worker/lifecycle/workspace-actions.ts:176`, `worker/machines/revoke.ts`, and `docs/protocol/host-connection.md`, section "The machine token".
- **Reason:** The code is Milestone 4 code of the own computers plan, on the base of the branch that found it.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Machine token:** the secret in the env of a sandbox that opens its host connection to its machine object.
  - **Warn mode:** the mode of `revokeMachineTokenOnStop` that writes a fixed warning when the revoke fails and lets the caller go on.
- **Background:**
  - `docs/protocol/host-connection.md`, "The machine token", says that a machine token stops working at each stop of its machine (own computer decision 11 B, 23 November 2026).
  - A Milestone 4 agent call of the own computers plan says that the Worker revokes the token just before each stop request, and at each physical stop that it observes, and that a failed revoke warns and lets the stop go on.
  - A workspace stop revokes in warn mode before the provider stop and again after it (`worker/lifecycle/workspace-actions.ts:76` and `:176`).
  - The build cleanups of Milestone 8 hold their deletes until a successful revoke (review finding 151).
- **Problem:** When both revokes of a workspace stop fail, the token of the stopped workspace stays valid until a later start gives the workspace a new token. The protocol does not say that a failed revoke can leave this window.
- **Impact if no action:** After a rare failure of the machine object, a copy of the token opens the host connection of a stopped workspace. The protocol and the code disagree on the end of the token.
- **Root question:** When does a workspace token stop working if every revoke of its stop fails?
- **Options:**
  - **A.** State the window in the protocol: a token stops at the stop, or at the next successful revoke when the revoke of the stop fails. Read both legal pages and every guide in full. Effort: Small.
  - **B.** Keep a pending revoke for the workspace after a failed stop revoke, and retry it from the workspace alarm until it succeeds. Effort: Medium.
  - **C.** Let the machine object accept a workspace token only while D1 shows a running computer for the workspace, as `plans/follow-ups/build-machine-token-lifetime.md` proposes for builds. Effort: Medium.
- **Left out:** Holding the stop until the revoke succeeds: a stop of a running workspace must not wait, because the stop saves the user's cost.
- **Wider fix:** C. One check then ends each token at the end of its machine run.
- **Previous examples:** Review finding 151 of pull request #686 held the build deletes until a successful revoke.
- **Recommendation:** B. It closes the window soon after the failure, and it keeps the stop fast.
- **Action:** ask the user, because A narrows the protocol text of own computer decision 11 B, and B and C change Milestone 4 code outside the branch that found it.
