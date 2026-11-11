# The design of the cloud computer

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the time
limits of builds, refreshes, and starts, the first build of a new org, and
the repositories that wait for a build. It also gives the one name of the
app's own software, the builds and refreshes of the Cloud computer tab,
and the updates of an old workspace.

- A build or a refresh of the cloud computer runs for at most 60 minutes,
  and a start of a sandbox for at most 20 minutes. A build or a refresh
  that runs names its limit under its log. The start card does not name the
  limit of a start. A failed build, refresh, or start shows the message
  that the app saved for it, so a job that passed its limit names that
  limit, as
  `app/org-settings/cloud-computer/build-failed/time-limit`,
  `app/shell/error/time-limit`, and `app/new-workspace/time-limit` show.
- A new org has no image until its first build succeeds. Until then New
  workspace keeps Send off under a notice with the state of that build, as
  `app/new-workspace/first-build` shows. A notice of work that runs, such
  as that build, shows a spinner in place of its icon: `Notice` in
  `src/components/common/` takes `busy`.
- A chosen repository that the cloud computer does not hold yet waits for
  its build, from decisions 240 and 241. The repository menu of New
  workspace keeps it in place, off, with the note of when it is ready as
  the muted detail of its row. A form whose repository waits keeps Send
  off under a notice. `WaitingRepositoryNotice` in
  `src/components/new-workspace/waitingRepository.tsx` draws that notice,
  and `formWait` beside it says what the form waits for. The app shares
  that module. `RepositoryNotice` in `src/components/settings/`
  draws the notice of the Repositories and Cloud computer tabs, with a
  spinner while the build of an added repository runs. An admin gets its
  Try again or Build computer on the Repositories tab only, because the
  build card of the Cloud computer tab has the same action.
  `repositoryChangeCopy.ts` beside it holds the words of both, which the
  app shares, as `app/new-workspace/waiting-repository` and
  `app/org-settings/repositories` show.
- The app's own software in a cloud computer is the agent runner, the
  terminal, the port previews, and the helpers of git and GitHub. One name
  covers it: "the agent and terminal software". `updateCopy.ts` in
  `src/components/workspace/` holds the name and the words that use it,
  and imports no fixture, so the app can share it.
  - The build log shows "Installing the agent and terminal software" after
    the clones, only in a build or a refresh without a ready software
    image, as `app/org-settings/cloud-computer/building/fallback` shows. A
    job from the software image has no such step.
  - The start of a workspace with an earlier version shows the start step
    "Updating the agent and terminal software", right after the resume or
    the start from the org image, as `app/workspace-updates` shows.
- A build or a refresh with an empty install script has no install step,
  so its log shows no "Running the install script", as
  `app/org-settings/cloud-computer/first-build` shows.
- The Cloud computer tab shows each job of the org image: each build and
  each refresh, because each refresh is a clean build that runs the
  install script. `buildCopy.ts` in `src/components/settings/` holds the
  words, and imports no fixture.
  - The head names the newest job: "Last build" or "Last refresh" with its
    time and result, or, while it runs, "Building", "Refreshing after a
    push", or "Running the daily refresh" with its time. Build computer
    waits while any job runs.
  - Each row of the history names its job after its time: Build, Refresh
    after a push, or Daily refresh. The kinds line up in a column. A
    narrow history, such as on a phone, puts the kind under the time in
    each row.
  - A failed refresh shows the saved message, the end of its log, and Try
    again, as a failed build does. The Settings link of the sidebar shows
    its dot.
  - The notes name the job that new workspaces start from, a build or a
    refresh, and the 60-minute limit of the job that runs.
- A start step that fails while the start goes on ends with "failed" in
  the warning colour. `StartingCard` takes the step as `failedStep`.
- `SoftwareUpdateBar` in `src/components/workspace/` draws the warning
  after a failed update: an amber bar under the header with Dismiss, as
  the other warning bars under the header are. The workspace works, so
  the bar offers no action, and the next start tries the update again.
- `InstallScriptNotice` in `src/components/workspace/` draws the notice of
  a changed install script over the composer of a ready workspace, with
  Run install script. The run shows a spinner, and the output of the
  script streams in a box inside the notice. A finished run says that the
  workspace has the new setup, keeps the end of the output, and closes
  with Dismiss. A failed run turns the notice rose, keeps the end of the
  output, and offers Try again. `Notice` in `src/components/common/`
  takes `children`, which go under its text at the full width of the box.
