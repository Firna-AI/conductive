# A lost file inside a part can stay unseen

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sandbox-start-issue-secrets-q3is`, review round 2, the wider fix of finding 8.
- **Location:** `crates/cnd-cli/src/update/presence.rs`, `crates/cnd-release/src/parts.rs`, and the parts file that each deploy writes in `.github/workflows/deploy.yml`.
- **Reason:** the branch checks the entry files of each part role, and a full file list needs a change to the release format with a compatible path.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Release part:** one archive of the sandbox software, unpacked under `/opt/conductive/parts/<sha256>/`.
  - **Entry file:** a file of a part role that the program, the runner unit, or the installer calls, such as `bin/node`, `sdk-helper.mjs`, `runner-start.sh`, or `install-system.sh`.
- **Background:**
  - Since this branch, a part counts as present when its folder has the `complete` marker and the entry files of its role. A missing part downloads again at the start.
  - On 2026-11-20, a disk restore kept newer files and lost older ones in one sandbox. The SDK helper part holds about 794 MB of files, mostly packages.
- **Problem:** A lost file that is not an entry file, such as one SDK helper package, leaves the part present. The repair then does not run, and agent turns fail.
- **Impact if no action:** Such a loss needs a manual repair or a new release with another digest for that part.
- **Root question:** How does a start find a part that lost any of its files?
- **Options:**
  - **A.** Change nothing. The entry files cover the launch and the installer. Effort: Small.
  - **B.** Record the file list of each part when it unpacks, and check it before reuse. Parts that exist today keep the entry-file check until their digest changes. Effort: Medium.
  - **C.** Ship the expected file list, with file sizes, in the release metadata, and check each listed file and its size. Cost: a release format change, and each start reads thousands of entries of the Node and SDK helper parts. Effort: Large.
- **Left out:** A content digest of each file at each start, because it reads about 1 GB.
- **Wider fix:** C, because every part gets the same authoritative list from its first release with the list.
- **Previous examples:** Commit `4f9071df6` records the risk of disk damage after a machine failure.
- **Recommendation:** C. Sizes come from the same `stat` call, so they add no reads.
- **Action:** fix after merge, apply C, because it changes the release format.
