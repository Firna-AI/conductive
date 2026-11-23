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
cloud computer of the org does not hold yet. Done after an add starts a
build, as decision 295 of 18 November 2026 says, and a removed one leaves
at the next build. The mockups draw it for
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
  Try again, and `removed` with Build computer. Its `unsaved-add` variant
  has an open edit that adds acme/admin-dashboard before Done, and the
  notice points to Done with no button. Its `member` variant has
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

## The skills repository

The Skills section of the Cloud computer tab comes from decisions 1 to 3,
6, and 7 of the org skills repository plan, of 13 and 16 November 2026.
It names one public GitHub repository, and the agents of every workspace
use its skills. At Save and at each load, the section looks up the
repository on GitHub. It lists the skills that it finds, or it shows a
notice in place of the list. It is the last section of the tab, after the
environment variables:

- `app/org-settings/cloud-computer` has acme/agent-skills in the field of
  an admin, with the switch "Trust this skills repository" off under the
  field, and Save repository off until the field or the switch changes.
  Its 12 skills show under the switch.
- `app/org-settings/cloud-computer/skills` has Acme before an admin chose
  a repository, with the placeholder in the empty field and no trust
  switch. Its child pages show the other states of the section:
  - `trust` has a trusted repository, from decision 403 of the skills
    trust plan, of 17 and 18 November 2026. The hint of the switch says
    what the value does, and "How trust works" opens the guide. Its
    `unsaved` variant has the switch turned on before Save, its
    `replaced` variant has acme/team-skills typed in place of the trusted
    repository, with the switch off, and its `member` variant has the
    choice as read-only text.
  - `pasted-link` has a link from GitHub in the field, with the trust
    switch off and Save repository on.
  - `private` has the notice of a private repository.
  - `not-found` has the notice of a repository that GitHub does not find.
  - `invalid` has the same notice for saved text that is not owner/name,
    without a trust switch.
  - `without-skills` has the notice of a repository without skills, which
    says where the skill folders go.
  - `incomplete` has the list from a file tree that GitHub cut short,
    with the note that the list can be incomplete.
  - `lookup-failed` has the notice of a list that did not load, with Try
    again.
- `app/org-settings/cloud-computer/member` shows the repository and its
  trust choice as text to a member, with the same list. Its `no-skills` variant has the empty text
  of a member. Its `private-skills` and `skills-not-found` variants have
  the notices of a member, which say that an admin can act. The other
  notices read the same for a member as for an admin.
- A new org has no repository, as `app/org-settings/cloud-computer/first-build`
  shows.
