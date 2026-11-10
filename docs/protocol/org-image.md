# Org image

This doc holds the requirements and the decisions in force for the org
image that every sandbox of an org starts from. It covers the builds and
the refreshes of the org image, and the first build of a new org. It
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
- "Build computer" starts a build. A build runs the install script on a
  copy of the image, with every chosen repository cloned (decision 12).
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
