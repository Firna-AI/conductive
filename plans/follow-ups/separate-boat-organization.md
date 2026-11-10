# The app shares a Boat organization with other work

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from decision 137 of `plans/boat-native-remote-workspaces.md`, during Milestone 16a.
- **Location:** `BOAT_ORG_ID` in `wrangler.jsonc`, the `BOAT_API_KEY` Worker secret, and "The app's Boat account" in `worker/sandbox/README.md`.

- **Terms:**
  - **Boat organization:** the account space at the sandbox provider that holds the cloud computers, and the API key that controls them.
- **Background:** The first deployment uses the existing "Firna" Boat organization and the current key, as the user chose on 8 November 2026 (decision 137 A). The deployment guide asks for an organization that holds only the app's sandboxes, and a key with only the 13 actions that the app uses, limited to one environment, for 365 days.
- **Problem:** The app's cloud computers share an organization with other Boat work, and the key can have more actions than the app needs.
- **Impact if no action:** A defect in a delete or stop path, or a leaked key, can reach sandboxes that are not the app's. The move gets harder as more workspaces and saved snapshots live in the shared organization.
- **Root question:** How do the app's cloud computers run in an organization of their own, with a key that can do only what the app does?
- **Options:**
  - **A.** Keep the shared organization, and state the risk in `worker/sandbox/README.md`. Effort: Small.
  - **B.** Make a separate organization and a key with the actions of the guide. Set `BOAT_ORG_ID` and `BOAT_API_KEY` to them before the first users arrive. Existing sandboxes and snapshots stay in the old organization until they are deleted. Effort: Small.
- **Left out:** A move of the existing sandboxes, because Boat gives no move between organizations, and a new start rebuilds each one.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/launch-capacity-boat-limits.md`: its option E is option B of this item, with a Boat plan that fits the launch peak.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the user chose A for now on 8 November 2026 (decision 137), and only the user can make the organization and the key.
