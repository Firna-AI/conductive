# No rule forbids the reuse of a preview ID

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #11, branch `conductor/boat-native-remote-workspaces-milestone-12`, the wider fix C of round 2 finding 2. Raised to the user as item 86.
- **Location:** `src/shared/previews.ts` and `src/shared/README.md`.
- **Reason:** the rule adds a requirement at the API boundary, which the user reviews.

- **Terms:**
  - **Preview ID:** the ID of one opened port preview in the API. The Preview tool hides a preview after its `preview.revoked` event, by its ID.
- **Background:** The development fake gave each open of a port the same preview ID, so a revoked port could not open again on the development page. The fix gives each open a new ID in the fake. The contract does not say whether the real API can give out a revoked ID again.
- **Problem:** If the API reuses a revoked ID, the Preview tool hides the new preview of that port.
- **Impact if no action:** A later backend change could reuse IDs, and the reopened preview would not show.
- **Root question:** How does a reopened port always show its new preview?
- **Options:**
  - **A.** Change nothing, and rely on the backend to make new IDs. Effort: Small.
  - **C.** Add the rule to the contract: each open gives a new ID, and the API never gives out a revoked ID again. Add a case for it to the Milestone 11 tests. Effort: Small.
  - **D.** Hide revoked previews by their address, not by their ID. The access protocol already makes the address new for each open. This changes the shared event contract. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** round 2 finding 2 of PR #11.
- **Recommendation:** C.
- **Action:** ask the user, because C adds a rule at the API boundary.
