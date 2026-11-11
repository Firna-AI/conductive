# The design of builds and starts

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
time limits of builds and starts, a first start on a chosen branch, the
disk check of an activation, the first build of a new org, and a
repository that waits for its build.

- A build of the cloud computer runs for at most 60 minutes, and a start of
  a sandbox for at most 20 minutes. A build that runs names its limit under
  its log. The start card does not name the limit of a start. A failed
  build or start shows the message that the app saved for it, so a job that
  passed its limit names that limit, as
  `app/org-settings/cloud-computer/build-failed/time-limit`,
  `app/shell/error/time-limit`, and `app/new-workspace/time-limit` show. A
  first start on a chosen branch that is gone from GitHub names that branch
  and says to restore it before Try again, as
  `app/new-workspace/branch/gone` shows. A first start on a chosen branch
  that is there fetches it and checks it out with tracking, as
  `app/new-workspace/branch/start` shows. An activation of a workspace from
  Conductor first checks that its work fits the free disk, with room to
  unpack it. When it does not fit, the activation stops before it changes
  the checkout, and its saved message names both sizes, as
  `app/imported/failed/disk-space` shows.
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
