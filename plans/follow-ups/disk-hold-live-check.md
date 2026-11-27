# Check the disk hold on a real workspace

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, the post-merge task of the plan for the workspace disk hold.
- **Location:** `image/conductive-disk-hold.service`, `image/conductive-disk-hold.timer`, `image/conductive-disk-hold.path`, `crates/cnd-cli/src/disk_command/`
- **Reason:** the check needs the deployed Worker and a released sandbox software version.

- **Terms:**
  - **Disk line:** the used size of the disk of `/` where every write stops. On Boat it is 72,000,000,000 bytes, which the Worker sends as `CONDUCTIVE_DISK_LINE_BYTES`.
  - **Hold:** the ext4 setting `/sys/fs/ext4/<device>/reserved_clusters` that the root unit `conductive-disk-hold` sets, so that writes stop at the line.
- **Background:** The change adds a root unit that runs `conductive disk hold` at boot, every 5 minutes, when the restore marker `/run/conductive-terminal/restore-ended` changes, and after each workspace command. A throwaway Boat sandbox with the release binary held the line at 71,999,991,808 bytes used. That test ran the binary by hand, with no Worker and no installed release.
- **Task:** After the deploy and the next sandbox software release, start or resume a workspace on Boat. In its terminal:
  - Run `cat /sys/fs/ext4/vda1/reserved_clusters` and check that it is about 2,979,526, not 4096.
  - Run `systemctl status conductive-disk-hold.timer conductive-disk-hold.path` and check that both are active.
  - Run `sudo ls -l /var/lib/conductive/runner-reserve` and check a 268,435,456-byte file.
  - Check the Worker logs for disk hold warnings.
- **Impact if no action:** A packaging or install problem can leave every workspace without the hold, and nobody notices until a disk fills again.
- **Needs:** The deployed change, a released sandbox software version, and a Boat workspace.
- **Done when:** A Boat workspace shows the hold value near 2,979,526, both units are active, and the reserve file exists.
