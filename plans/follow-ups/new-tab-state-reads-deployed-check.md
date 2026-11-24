# Check new tab state reads on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from the post-merge task of the plan for new tab workspace state reads, branch `calummoore/object-memory-new-tab-state-reads-cesn`.
- **Location:** None.
- **Reason:** The check needs the merged change deployed to `conductive.build` and a real workspace with a long history.

**Terms**
- **Cutoff:** the workspace event number through which a read gives the state. The workspace read gives it as `eventNumber` with a `seed`; each Files list read gives it in `stateRead.eventNumber`.
- **Read-state recovery:** the one-time rebuild of the stored read state of an older workspace, which the first read after the deploy waits for.

**Background:** Since the change, a new tab, a reload, and the first show of a workspace in a tab read the current state of the workspace and of both Files lists, then open the workspace stream and the Files stream after their cutoffs, as `docs/protocol/workspace-events.md` says. Before, each stream replayed the whole stored history from event 0. Older Mac apps keep the full replay. Tests, a local smoke test on the dev pages, and a local stress proof on a history of 5,529 events covered the change. No check ran against production data.

**Task:**
1. Open a workspace with a long history on `conductive.build` in a new tab, with the browser developer tools open.
2. In the network log, check that the workspace GET reply has `seed` and `eventNumber`, that the tree and changes replies have `stateRead`, and that the workspace events socket and the Files events socket each open after those cutoffs, not after 0.
3. Note the time of the first workspace read of a workspace that nobody opened since the deploy (it waits for the recovery), and of a second read.
4. Keep an older tab of the same workspace open from before the deploy, or use an older Mac app. Compare the header notices of failed repairs, the Preview port list, the `/` skill list, All files, and Changes between the two.

**Impact if no action:** A difference between the reads and the full replay on real data, or a slow first read, stays unknown until a user reports it.

**Needs:** The deployed change, and a workspace with a long history.

**Done when:** Both streams of a new tab start after their read cutoffs on the deployment, and the notices, the port list, the skill list, and both Files lists match the older tab. Record the first and second read times.
