# Check the build free storage on real providers

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-26, from branch `calummoore/check-remaining-storage-9qb7`.
- **Location:** `STORAGE_COMMAND` and `measureImageStorage` in `worker/lifecycle/image-storage.ts`, called from the snapshot phase in `worker/lifecycle/image-build-steps.ts`.
- **Reason:** the check needs the deployed change and real Boat and E2B sandboxes.

- **Terms:**
  - **Free storage:** the size and the "Avail" bytes of the disk of the home folder `/home/user`, which a build of the org image measures with `df` just before it saves the image. The build card shows it, such as "31.2 GB free of 50.1 GB".
- **Background:** The tests use a fake provider that answers the `df` command with fixed output. No test runs `df --block-size=1 --output=size,avail -- /home/user` on a real sandbox. The home folder is assumed to be on the main disk on both providers. Boat gives a 51 GB disk, and the E2B project gives about 15 GB.
- **Task:** After the deploy, start Build computer for an org on Boat and for an org on E2B. Check that each good build shows a free storage text on the Cloud computer tab. In a new workspace of each org, run `df -h ~` and compare it with the card. Check the Worker logs for the `image_storage_unmeasured` warning.
- **Impact if no action:** A provider whose `df` output or disk layout differs shows no number, or a number for the wrong disk, and nobody notices.
- **Needs:** The deployed change, an org on each provider, and access to the Worker logs.
- **Done when:** Both providers show a free storage text that matches `df -h ~` in a new workspace within rounding, and no `image_storage_unmeasured` warning appears for those builds.
