# Org image

This doc holds the requirements and the decisions in force for the org
image that every sandbox of an org starts from. It covers the builds and
the refreshes of the org image, the first build of a new org, and the
software image that each build starts from. It
belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md). The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The org image

- Each org has one org image that holds a prepared copy of every
  repository that the org chose (decision 13).
- One image for each repository was rejected, because each image costs
  its own saved snapshot and starts.
- The Repositories tab of the org settings chooses the repositories
  (decision 10). A change of the repositories takes effect at the next
  build.
- The install script prepares the image. It is a script, not a terminal
  session, and it runs only in a build.
- Bash runs the install script.
- The Cloud computer tab lists the operating system and software that the
  base image includes before the install script runs.
- "Build computer" starts a build. A build runs the install script with
  every chosen repository cloned (decision 12). Each build starts on a
  clean computer, as [The software image](#the-software-image) says.
- The app also starts some builds of a new org by itself, as
  [The first build](#the-first-build) says.
- A build replaces the org image only when it succeeds. A failed build
  keeps the last good image (decision 9).
- While a build runs, its log streams on the Cloud computer tab. New
  workspaces keep starting from the last good image.
- A failed build shows the end of its log and Try again. The Settings link
  of the sidebar then shows a mark.
- After a failed build, the app starts no new build by itself
  (decision 12). This also holds for the first build of an org. Reason: a
  broken install script fails again.
- After the user saves a changed install script, the tab asks for a build,
  because the script runs only in a build. While the org has no good image
  and a build runs, the tab asks for no build. It says that one more build
  runs the script when that build succeeds, as
  [The first build](#the-first-build) says.
- The Cloud computer tab lists the builds, each with its time, its result,
  and its length.
- A push to the default branch of a chosen repository refreshes the org
  image, at most once in 30 minutes. A daily timer refreshes it too. Each
  automatic refresh needs an admin who is not suspended, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- A refresh fetches the new commits of every chosen repository. It does
  not run the install script.
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
- Like each build, a build of an org without an org image starts from the
  software image. It copies the repositories and runs the install script,
  with no install of the app's own software, as
  [The software image](#the-software-image) says.
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
- Only the first good build can get an added build. A failed build gets
  none. Reason: Try again then builds the current settings.
- The added build runs for an admin who is not suspended, as an automatic
  refresh does. An org without such an admin gets no added build. Reason:
  one rule then covers each build that the app starts by itself.
- [Starts, stops, and builds](operator-actions.md#starts-stops-and-builds)
  states what a suspension does to each build.
- When the added build cannot start, the org keeps its first good image.
  The change then waits for Build computer.
- After the first good build, each change of the repositories or of the
  install script waits for Build computer (decision 12). This also holds
  for a change during the added build.
- A build at each save was rejected, because the Repositories tab saves
  each repository on its own. Such a build could start with only part of
  the choice.

## The software image

- The software image is a saved snapshot of the base image with the app's
  own software installed: the agent runner, its private Node, the terminal
  service, the agent tools, the git credential helper, and the GitHub CLI.
- It holds no org data and no secret, because every org uses it.
- One software image belongs to each version of the app's own software. A
  change of any install step of that software makes a new version.
- Each build starts from the ready software image of the current version.
  It copies every chosen repository fresh, then runs the install script.
  It does not install the app's own software. A refresh starts from
  the last org image.
- Reason: a build from the software image waits for no app software install.
  The install script always runs on a clean machine. No output of an
  earlier org install script stays.
- A skip of the parts that each org image already holds was rejected,
  because it does not make a first build faster.
- Later builds on the last org image were rejected, also in these forms:
  - with a check that skips the software step when the image holds the
    current software
  - with an install script that must be safe to run more than once
  - with a variable for the kind of build, or with a "Clean build" choice
- Without a ready software image of the current version, a build starts
  from the base image. It copies the repositories, installs the app's own
  software, then runs the install script. A missing software image slows a
  build and never fails it.
- Each deploy run asks the Worker to build the software image of the
  deployed version, and waits for the result. A deploy run whose version
  has a ready software image waits for nothing.
- A Worker cron job that builds it by itself, and a build at the first org
  build after a release, were rejected. Reason: the deploy run then shows
  the result.
- The deploy run proves itself with a token of its own, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
- The deploy run fails unless the software image is ready when its wait
  ends. The new Worker stays live. Reason: one rule covers a failed build,
  a wait that ends first, and a refused request. A warning in the summary
  of the run was rejected, because it hides the failure.
- One software image build runs at a time. A build of a newer version ends
  an unfinished build of an older version.
- A failed build starts again only for a later deploy run. So a re-run of
  the deploy builds again.
- A software image build has a time limit of 60 minutes. A build that
  outlasts the wait of its deploy run goes on until it ends or reaches
  that limit.
- When a new software image is ready, the app deletes each older one that
  no running build still starts from. A rollback of the Worker then finds
  no software image of its version, so builds install the app's own
  software until the next deploy run builds one.
