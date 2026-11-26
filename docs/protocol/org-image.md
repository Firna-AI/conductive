# Org image

This doc holds the requirements and the decisions in force for the org
image that every sandbox of an org starts from. It covers the builds and
the refreshes of the org image, and the first build of a new org.
[Repository changes of the org image](org-image-repositories.md) holds
the builds and the notices of a change of the repositories.
[Software image](software-image.md) holds the software image that a
first build starts from. It
belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md). The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An e2b
decision number names a decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says. A switch decision number names a decision of the change that adds
[Switch account](switch-account.md), as that doc says.

## The org image

- Each org has one org image (decision 13). The image holds a prepared
  copy of each repository that the org chose when the build of the image
  began.
- The org image lives in the provider account of the org, as
  [The account of an org](provider-accounts.md#the-account-of-an-org)
  says. Every build and every refresh of the org runs in that account
  (e2b decision 222). The one exception is the switch build of an
  operator, which members do not see, as
  [The switch build](switch-account.md#the-switch-build) says.
- One image for each repository was rejected, because each image costs
  its own saved snapshot and starts.
- The Repositories tab of the org settings chooses the repositories
  (decision 10). A change of the repositories takes effect at the next
  build, not at a refresh, as
  [Repository changes](org-image-repositories.md) says.
- The install script prepares the image. It is a script, not a terminal
  session, and it runs only in a build.
- Bash runs the install script.
- The Cloud computer tab lists the operating system and software that the
  base image includes before the install script runs.
- The base image holds the same operating system and software on each
  provider. Reason: the Cloud computer tab lists one base image for every
  org.
- "Build computer" starts a build. A build runs the install script on a
  copy of the image, with every chosen repository cloned (decision 12).
- A Build computer or a Try again during a switch build waits until that
  build ends (switch decision 2 D). Its time limit counts from then, as
  [What members see](switch-account.md#what-members-see) says.
- Done after an add of a repository also starts a build, as
  [Added repositories](org-image-repositories.md#added-repositories) says
  (decisions 240 and 295).
- The app also starts some builds by itself, as
  [The first build](#the-first-build) and
  [Added repositories](org-image-repositories.md#added-repositories) say.
- A build replaces the org image only when it succeeds. A failed build
  keeps the last good image (decision 9).
- While a build runs, its log streams on the Cloud computer tab. New
  workspaces keep starting from the last good image.
- The log names each step that a build or a refresh runs, as the step
  starts: the repository copies, the cloud computer software, the install
  script, and the save of the image. It also says when the image is
  saved. Reason: the log covers every action of the build, not only the
  output of commands.
- A failed build shows the end of its log and Try again. The Settings link
  of the sidebar then shows a mark.
- After a failed build, the app starts no new build by itself
  (decision 12). This also holds for the first build of an org. Reason: a
  broken install script fails again.
- The Cloud computer tab shows the install script notice while the saved
  install script differs from the script that the org image ran
  (decision 241). The notice asks for a build, because the script runs
  only in a build.
- While the org has no image, the script of the newest build takes the
  place of the script that the org image ran.
- A refresh does not end the notice, because a refresh does not run the
  script.
- A change of the repositories shows the
  [repository notice](org-image-repositories.md#the-repository-notice),
  not the install script notice. Reason: each notice then names the
  change that waits for a build.
- One notice with words that fit both changes was rejected, because the
  reader then does not learn which change waits.
- While the org has no good image and a build runs, the install script
  notice asks for no build. It says that one more build runs the script
  when that build succeeds, as [The first build](#the-first-build) says.
- The Cloud computer tab lists the builds, each with its time, its result,
  and its length.
- A push to the default branch of a chosen repository refreshes the org
  image, at most once in 30 minutes. A daily timer refreshes it too. Each
  automatic refresh needs an admin who is not suspended, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- A refresh fetches the new commits of each repository that the org image
  holds. It uses the saved name of each repository, as
  [Repository changes on GitHub](repository-changes-on-github.md#the-org-image)
  says. It does not run the install script, and it adds or removes no
  repository. It installs the newest release of the sandbox software, as
  [Installs in a build](sandbox-software.md#installs-in-a-build) says.
- Reason: a new workspace then needs only a small fetch. The limit of one
  refresh in 30 minutes saves starts, because each refresh is a start.

### The first build

- Create org starts the first build of the org by itself (decision 150 of PR #92).
  Create org requires at least one repository, as
  [Orgs](orgs-and-members.md#orgs) says, so every new org starts its first
  build at create (decision 151 of PR #92).
- Reason: a new org then gets its org image with no manual step.
- Create org starts the build before it answers. A build that the browser
  starts after the create was rejected, because a closed tab could then
  lose the build.
- The first build is a normal build. The person who creates the org, its
  first admin, is the starter of that build. Its log and its result show
  on the Cloud computer tab, as for every build.
- A build of an org without an org image starts from the software image
  of its account, when that account has a ready one. It copies the
  repositories, installs the newest release of the sandbox software, and
  runs the install script, as
  [The software image](software-image.md#the-software-image) says.
- When the first build cannot start, Create org still creates the org. An
  admin can then start a build on the Cloud computer tab, with Build
  computer or Try again. Reason: the org is valid without a build.
- An org has no org image until its first good build. The first good build
  is the earliest build of the org that succeeds. It can be the first
  build, or a build after a failure.
- Until the first good build, no workspace of the org can start.
  [Create a workspace](create-a-workspace.md#before-the-first-good-build) and
  [Get started](orgs-and-members.md#get-started) say what the app shows in
  that time.
- The repositories or the install script can change during the first good
  build. In that case, the app starts one more build by itself, the added
  build, when that build ends (decision 151 of PR #92).
- Reason: a build holds the repositories and the install script that were
  saved when it began. The added build takes in each change from any
  screen during the first good build. So such a change needs no Build
  computer.
- After the first good build, a build or a refresh gets an added build
  only for a waiting repository, as
  [Added repositories](org-image-repositories.md#added-repositories)
  says. A failed build gets none. Reason: Try again then builds the
  current settings.
- The added build runs for an admin who is not suspended, as an automatic
  refresh does. An org without such an admin gets no added build. Reason:
  one rule then covers each build that the app starts by itself.
- [Starts, stops, and builds](operator-actions.md#starts-stops-and-builds)
  states what a suspension does to each build.
- When the added build cannot start, the org keeps its first good image.
  The change then waits for the next build.
- After the first good build, a change of the install script and a
  removed repository start no build. They wait for the next build, which
  an admin can start with Build computer (decision 12). This also holds
  for such a change during an added build.
- An added repository starts a build at Done, as
  [Added repositories](org-image-repositories.md#added-repositories) says
  (decisions 240 and 295).
- A new name or a new default branch of a repository on GitHub starts a
  build too, as
  [Repository changes on GitHub](repository-changes-on-github.md#the-org-image)
  says.

## The software image

[Software image](software-image.md) holds the saved snapshot of the app's
own software that a first build starts from.

## Repository changes

[Repository changes of the org image](org-image-repositories.md) holds
the waiting and the removed repositories, the adds and the removals of
an admin, their builds, and the repository notice.
