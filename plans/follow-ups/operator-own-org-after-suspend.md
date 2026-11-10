# The operator's own org looks active after a suspend

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from finding 52 of branch `calummoore/admin-section-brainstorm`, round 1, and its check.
- **Location:** `OperatorTarget` in `src/app/operator-target.ts`, the shared org state of `AppModel` in `src/app/app-model.ts`, and "Lift a suspension" in `docs/protocol/operator-actions.md`.
- **Reason:** Only an operator who is also a member of the org meets it, and the best option changes a line of the protocol, which the user must approve.

- **Terms:**
  - **Operator:** a person in the Worker setting `OPERATOR_GITHUB_IDS`. Only an operator suspends or lifts.
  - **Org summary:** the record of each org of the user that the web app reads at its start, from `GET /api/orgs`. The rail and the org screens read it, and its `suspension` field makes an org read-only.
  - **Refused orgs:** the set `refusedOrgs` of `AppModel`. A refusal with the code `org_suspended` adds an org to it, and nothing removes one.
- **Background:**
  - The operator section suspends and lifts an org from its page, through `OperatorTarget`. After the write, the page reads the target again.
  - The rest of the app learns of a suspension only from a refused write, and of a lift only at its next load, as "Lift a suspension" in `docs/protocol/operator-actions.md` says for an open page of a member.
  - The suspend reply gives the org ID and `suspendedAt`. The lift reply gives the org ID and the time of the lift.
- **Problem:** When the operator suspends an org that they belong to, its rail entry and its screens still offer changes and starts, until a write fails or the page reloads. After a lift, an org that a refusal marked stays read-only for the rest of the visit.
- **Impact if no action:** The operator sees actions that the server refuses, or a lifted org that looks read-only, until a reload.
- **Root question:** How does the app that sends a suspension or a lift of an org show the new state on its own screens of that org?
- **Options:**
  - **A.** Keep the behaviour. A reload shows the state. Effort: Small.
  - **B.** After a suspend of an org, mark it suspended in the shared state of the app, with a test of an org of the operator. A lifted org still waits for a reload. Effort: Small.
  - **D.** B, and also the lift, through the org summary. After a suspend, set `suspension` on the summary when the app holds the org. After a lift, remove `suspension` and remove the org from `refusedOrgs`. Do not add a missing org to the rail. Change the lift line of the protocol: the app that sends the lift shows it at once, and other open pages learn of it at their next load. Add one mounted test: suspend, see the org suspended in the rail and on its home, lift, and see it active. Effort: Small.
  - **E.** The shared org list follows the server: the app reads `GET /api/orgs` again after each operator write of an org, at each entry of an org, and on focus. Every server change of an org summary then reaches the screens. It costs a read at each entry and focus, and it changes the lift line of the protocol for every member. Effort: Medium.
- **Left out:** Waiting for a refused write, because it fails the goal. A reload of the whole app, because it loses the count of the cloud computers that are still stopping, which the page must show after a suspension. A push of org changes from the Worker, because the app that sends the write already has the reply.
- **Wider fix:** E.
- **Previous examples:** Commit `81ee4c8` connected the feature clients to the shared suspension signal of an org. Commit `3037806` fixed a missed refusal of an org action.
- **Related:** `plans/follow-ups/chat-open-edits-after-read-only.md` relies on the rule that an open page learns of a lift at its next load. The dev fake comment in `src/app/dev/operator-routes.ts` describes the same behaviour.
- **Recommendation:** D. It fixes both halves of the same state for the cost of B. E protects the codebase best.
- **Action:** ask the user, because D and E change the lift line of the protocol.
