# Check a later build on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, the post-merge task of the plan `plans/later-build-software-image.md`, branch `conductor/later-builds-from-software-image`.
- **Location:** None. The task runs on the deployed app.
- **Reason:** the task needs the merged change on the deployed app, a ready software image of the deployed version, and a real cloud computer.

- **Terms:**
  - **Software image:** one saved snapshot of the base image with the app's own software, for each version of that software. It holds no org data. `docs/protocol/org-image.md` gives its rules.
  - **Later build:** a build of an org that already has an org image. An example is a build from Build computer after a change of the install script.
  - **Software step:** the build step that installs the app's own software. The build log shows it as "Installing the cloud computer software."
- **Background:**
  - Before this change, a later build started from the last org image. It moved the old repository folders, ran the software step again, and ran the install script on top of the output of each earlier script.
  - Now each build pins the ready software image of its app software version in its provider account. It starts there, copies every chosen repository into a new folder, runs the install script, and saves the org image, with no software step.
  - Without such a software image, a build starts from the provider's base image and runs the software step after the copy. A missing software image slows a build and never fails it.
  - A refresh still starts from the last org image, fetches commits, and runs neither the software step nor the install script.
  - The tests use a fake provider and a local D1. No test shows the length of a real build.
  - On 10 November 2026, before this change, the Conductor workspace "Build Time Increase" measured real builds for Firna. The software step took 18 to 29 s. The repository step took 34 to 124 s, and it grows with the number of repositories. The sandbox start, the install script, and the save took about 20 s together.
  - These times are an observed baseline, not a promised saving.
- **Task:**
  - After the merge and the deploy, check that the deploy run ended with a ready software image of the deployed version.
  - Choose an org that already has an org image, such as a test org. As its admin, select Build computer on the Cloud computer tab.
  - Watch the build log. Check that it goes from "Updating the repositories." to "Running the install script.", with no "Installing the cloud computer software." line. Check that the build saves its image and succeeds.
  - Note the length of the build from the history, and the time of each step from the log. Compare them with the baseline above.
- **Impact if no action:** A fault that only the real provider shows can keep later builds slow or make them fail, and nobody notices. The time that the change saves stays unknown.
- **Needs:** the merged change on `conductive.build` with a ready software image, and an admin of an org with an org image.
- **Done when:** a later build on the deployed app runs no software step. It copies every chosen repository, runs the install script, and saves its image. The time of each step is recorded. Or each failure has its own follow-up item.
- **Related:** `plans/follow-ups/software-image-deployed-check.md` checks the deploy run and a first build on the deployed app. One session can run both items, and each keeps its own checks.
