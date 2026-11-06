# A lost snapshot reply leaves an untracked org image copy

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, round 1 finding 15.
- **Location:** `worker/lifecycle/image-builds.ts:175`.
- **Reason:** it needs a lost reply after a successful save, and the name stays derivable from the build ID.

- **Background:** An org image build asks Boat to save a snapshot, then records the snapshot's name. Build cleanup and Delete org find snapshots through these records.
- **Problem:** The build records the name only after `saveSnapshot` returns. When Boat saves the snapshot but its reply is lost, no record names it.
- **Impact if no action:** Untracked snapshots keep using the org's Boat storage, and Delete org cannot remove them.
- **Root question:** How does every resource that the lifecycle asks Boat to create stay findable, also after a lost reply?
- **Options:**
  - **A.** Derive the requested name in the cleanup of a failed build, and delete the snapshot when it exists. Effort: Small.
  - **B.** Save the requested name before the save, and reconcile it after an uncertain result. Effort: Small.
  - **C.** One shared intent record before each provider call that creates a resource, across the lifecycle modules. Effort: Medium.
- **Left out:** A daily sweep of all saved snapshots, because it needs a new Boat route, and a fault in it can delete a live image. A loop test over every lost reply, because a test for the whole class needs the user.
- **Wider fix:** C. A new call that creates a resource then gets the same protection.
- **Previous examples:** None found.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because it needs a rare lost reply.
