# Repositories that wait for a build

These pages are part of [the mockup catalogue](catalogue.md).

Repositories that wait for a build come from decisions 240 and 241 of
10 November 2026. A waiting repository is a chosen repository that the
cloud computer of the org does not hold yet. An added repository starts a
build, and a removed one leaves at the next build. The mockups draw it for
Acme, which adds acme/admin-dashboard and removes acme/marketing-site:

- `app/new-workspace/waiting-repository` has the open repository menu.
  acme/admin-dashboard keeps its place, off, with a note that says when it
  is ready, and the form holds the first ready repository. Its
  `kept-draft` variant has a kept draft in acme/admin-dashboard, with a
  notice over the composer and Cloud computer settings for an admin, and
  Send is off. Its `none-ready` variant has
  no chosen repository ready after a failed build, with Cloud computer
  settings for an admin, and its `member` variant has the same notice
  without the link. The dialog shows the same repository menu and the
  same notices, as the `repositories`, `repositoryMenu`, and
  `waitingBuild` controls of `app/new-workspace/dialog` show, so the
  dialog page gets no more variants.
- `app/org-settings/repositories` has the repository notice in each
  state: `building` while the build of an add runs, `build-failed` with
  Try again, and `removed` with Build computer. Its `member` variant has
  the notice of a failed build without a button. The notice names the
  repositories, so the rows of the list stay as they are.
- `app/org-settings/cloud-computer/repositories-changed` has the same
  notice under the intro while the build of an add runs. On this tab the
  notice has no button, also for an admin, because the build card under
  it has the same action. Its `build-failed` and `no-build` variants have
  the notice above the Try again and the Build computer of the card. Its
  `with-script` variant has a removal and a changed install script, each
  with its own notice, and the notice of the install script keeps its
  Build computer. `app/org-settings/cloud-computer/member/repositories-changed`
  has the notice of a member. `app/org-settings/cloud-computer/script-changed`
  keeps the notice of the install script, which shows only for a change
  of the install script.
