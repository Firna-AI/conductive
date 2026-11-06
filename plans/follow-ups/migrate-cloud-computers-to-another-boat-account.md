# An org cannot move to another Boat account

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from `calummoore/conductor-alternative-architecture`, plan decision 56.
- **Location:** The Boat key screen in the org settings, and `docs/protocol/orgs-and-members.md`, section "The Boat key".
- **Reason:** The user chose to refuse a key of another Boat account for the first release on 6 November 2026, and asked for a better way after it, probably a move of the old cloud computers.

- **Terms:**
  - **Boat key:** the API key of the Boat account that runs all cloud computers of one org. An org owner adds it.
  - **Org image:** the saved snapshot that every new cloud computer of the org starts from.
  - **Saved snapshot:** a named copy of a cloud computer's disk in one Boat account. Boat can share it with another Boat account.
- **Background:**
  - Each org runs on one Boat key, as plan decision 46 says. The org image and every cloud computer of the org live in that key's Boat account.
  - Decision 56 accepts a new key only when it reaches the same Boat account.
  - Boat can share a saved snapshot with another account, and can download the last snapshot of a stopped cloud computer.
- **Problem:** An org cannot move to another Boat account, for example when a company changes its Boat organization. The owner must create a new org and start again.
- **Impact if no action:** Moving to another Boat account loses the org's workspaces, their unpushed work, and their image.
- **Root question:** How does an org move its image and its workspaces to another Boat account?
- **Options:**
  - **A.** Keep the refusal of decision 56. Effort: Small.
  - **B.** For each workspace and for the org image, save a saved snapshot in the old account and share it with the new account. Then create each cloud computer again in the new account from its shared snapshot, and delete the old ones. The old key must stay valid until the move ends. Effort: Medium.
  - **C.** Share only the org image. Create new cloud computers in the new account, and move each workspace's unpushed work by a backup branch on GitHub. Effort: Medium.
  - **D.** Download each cloud computer's last snapshot to the app's own storage, and restore its home folder into a new cloud computer in the new account. Effort: Large.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. Boat moves each disk exactly as it was, and the app copies no user code.
- **Action:** fix after merge, apply B, because the user asked on 6 November 2026 to handle it after the first release.
