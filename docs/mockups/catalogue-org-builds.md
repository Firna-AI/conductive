# The catalogue: the first build and waiting repositories

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives the pages that draw the first build of a new
org in three places, and the repositories that wait for a build.

The first build of a new org shows in three places, from decision 150.
Create org starts it, and Create org needs at least one repository, from
decision 151. The mockups draw it for Firna, the first org of the sign-up:

- `app/orgs/new` draws the rule on Create org. The hint under Repositories
  says to add at least one, in each state. Its child page `no-repository`
  has the first org with a name and no repository chosen, and Create org
  is off. Its child page `no-access` has a GitHub App that reaches no
  repository: the list asks for access with Manage access, and Create org
  is off.
- Get started shows it in the org step. `app/sign-in/get-started/org-created`
  has the build that runs, with its time, while the person connects an
  agent. `preparing` has every step done while the build runs: Open Firna
  stays on, and the finish says that the cloud computer is still being
  prepared. `connected` has the good build, and the finish says that Firna
  is ready. `build-failed` has the saved message of a failed build, with
  Try again and a link to its log, and the finish does not say ready.
  `no-build` has an org with repositories and no build, such as after a
  first build that did not start, with Build computer.
- `app/new-workspace/first-build` has a notice over the composer with the
  time of the build, and Send is off. The notice shows only while the org
  has no good image. Its `ready` variant has the good build, without a
  notice. The running build, `failed`, and `no-build` link an admin to the
  Cloud computer tab, and `member` shows a failed build to a member,
  without the link.
- `app/org-settings/cloud-computer/first-build` has the Cloud computer tab
  of Firna: the first build with its log, then its `failed` and `no-build`
  variants. A new org has empty scripts and no env vars, and its history
  shows once a build has ended. Its `script-changed` variant has an install
  script that Cal saved during the first build. One more build runs it
  when the first build succeeds, so its notice has no Build computer.

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
