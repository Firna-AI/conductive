# Switch account

This doc holds the requirements and the decisions in force for Switch
account. An operator uses it to switch an org to another provider account.
The doc covers the switch, the start of its build, Stop switch, and the
switch build. It also covers what members see, and the page of the org in
the operator section. It belongs to [Provider accounts](provider-accounts.md), which
holds the account of each org and of each workspace. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A switch decision number, such as switch decision 1, names the dated
record of one decision of the change that adds Switch account. Its plan
keeps these records while the change is open. Its pull request keeps them
after the merge. An e2b decision number names a decision of the change that
adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## The switch

- An operator can switch an org to another configured account, with
  Switch account on the [page of the org](#the-page-of-the-org). The user
  asked for it on 20 November 2026.
- Only an operator can switch an org, as
  [The operator](operator-actions.md#the-operator) says for each operator
  request.
- A switch acts on one org. It offers each configured account other than
  the account of the org.
- The switch builds the org image on the new account. This build is the
  [switch build](#the-switch-build).
- The account of the org changes when the switch build succeeds (switch
  decision 1 B). The same step makes its image the org image. Until then,
  new workspaces of the org start on the old account.
- A failed switch build leaves the org on its old account, with its last
  good image. The operator can then switch again.
- Reason: members never lose a new workspace to the switch, and a failed
  build keeps the last good image, as decision 9 asks. A change of the
  account at once was rejected, because new workspaces then fail until the
  switch build succeeds.
- Each existing workspace stays on its own account, as
  [The account of a workspace](provider-accounts.md#the-account-of-a-workspace)
  says. So after a switch, one org can have workspaces on two accounts.
- An org has at most one switch that waits or builds.
- An org with no good image gets no switch build, because it has no image
  to copy. When no job of the org runs, its account changes at once, and
  its next build runs on the new account. Reason: no workspace can start
  from an image that does not exist.
- When a job of such an org runs, such as its first build, the switch
  waits for that job, as for each other org. When the job ends, the switch
  goes on. It gets a switch build when the org then has a good image, and
  else its account changes at once.
- No check of the app keeps a real org off an account (switch decision 4).
  The operator keeps the rule of [Regions](provider-accounts.md#regions)
  and the steps of
  [Before a real org runs on E2B](../sandbox-provider-accounts.md#before-a-real-org-runs-on-e2b).
  Reason: E2B consented to the app's use. A mark or a refusal for an
  account that only test orgs may use was rejected for that reason.
- The app records each switch, with its time, its operator, the old
  account, and the new account, as it records each change of the weights.
  It also records when the account of the org changed.
- After the switch, the org image on the old account stays, and it gets no
  refresh. No new workspace starts from it. The delete of the org removes
  it, as [Delete org](delete-org.md) says.

## When the switch build starts

- A job is a build or a refresh of the org image, as
  [Repository changes](org-image.md#repository-changes) says.
- The switch build waits while one of these is true:
  - A job of the org runs.
  - The org is suspended.
  - The org is deleted.
  - The org has no admin who is not suspended.
- When none of these is true, the switch build starts. So it starts at
  once when none is true at the switch.
- When a job runs, the question of Switch account names it, and offers to
  end it (switch decision 3 D). With that choice, the job fails, and the
  switch build starts at once. Without it, the switch waits until the job
  ends.
- Reason: a switch of a real org must not end a good build of an admin for
  no gain. In an outage, the operator can still end a stuck build. A
  switch that always ends the running job was rejected for that reason.
- A refresh that runs follows the same rule as a build. A switch that ends
  a running refresh at once was rejected (switch decision 3 D).
- No build runs while the org is suspended, as
  [Suspend an org](operator-org-suspension.md#suspend-an-org) says. Lift
  starts the switch build.
- A suspension during a switch build ends that build, as it ends each
  build of the org. The switch then waits for Lift. Reason: one rule then
  covers each suspended org.
- A switch of a deleted org waits for Restore, and Restore starts the
  switch build, as Lift does. Reason: one rule then covers each org that
  runs no build. The switch spends no build on an org that may not come
  back, and it adds no refusal.
- The switch build runs for an admin who is not suspended, as an automatic
  refresh does. While the org has no such admin, the switch waits. Its
  build starts after the org has one again.
- A suspension of the admin that a switch build runs for ends that build.
  The switch then waits, and its build starts again for another admin who
  is not suspended. Reason: each suspension then follows one rule, and the
  switch stays.

## Stop switch

- While a switch waits or builds, the operator can stop it with Stop
  switch. The org stays on its account, and new workspaces still start
  there.
- Stop switch ends a switch build that runs. A switch that waits never
  starts its build.
- After the stop, the page of the org shows no switch.
- The app records each stop, with its time and its operator, in the record
  of the switch. Reason: the app records each other operator action in the
  same way.
- A switch that waits offers no later end of its job. To end that job, the
  operator stops the switch and switches again with the offer on. Reason:
  switch decision 3 D puts the offer in the question.

## The switch build

- The switch build is the one build of the org that runs outside the
  account of the org. It runs on the new account of the switch.
- It uses the inputs of the newest good image of the org: the install
  script, the repositories, and the folder of each repository. It takes no
  saved change that no build ran yet. Reason: members do not see the
  switch build, so it must not change their image.
- One exception: it copies each repository with its saved name and
  default branch, as a refresh does, as
  [The org image](repository-changes-on-github.md#the-org-image) in
  Repository changes on GitHub says. Each folder keeps its name. Reason:
  with the old name or branch, the copy fails, and so the switch fails.
- So the notices of the install script and of the repositories show the
  same state after the switch as before it.
- It starts as a build of an org without an org image does, as
  [The software image](sandbox-software.md#the-software-image) says. So it
  starts from the ready software image of the new account, or else from
  its base image. It is the one later build that does not start from the
  last org image.
- It never starts from an older image of the org on the new account.
  Reason: such an image got no refresh after the org left that account.
- It gets no added build, also when a repository waits. A waiting
  repository then waits for the next build, as
  [The repository notice](org-image.md#the-repository-notice) says.
- Its time limit is 60 minutes, as for each build.
- A push to the default branch of a chosen repository during the switch
  build also makes a refresh of the new image due. That refresh starts
  when the switch build succeeds. Reason: the new image then gets the
  commits of that push.

## What members see

- Members do not see the switch build (switch decision 2 D). The build
  list, the current build, and the build log of the
  [Cloud computer tab](org-image.md#the-org-image) leave it out. The
  Settings mark of the sidebar leaves it out too. Only the
  [page of the org](#the-page-of-the-org) in the operator section shows it.
- So a failed switch build gives members no mark and no Try again.
- Reason: a failed switch build is a problem of the operator, and the
  image of the members still works. A switch build that members see as
  their own, with the mark and Try again after a failure, was rejected.
  Admins would then see a failure that they cannot fix.
- After the switch, the Cloud computer tab keeps the newest good build
  that members see as the current build. That build holds the same inputs
  as the switch build, except the saved names and default branches that
  the switch build copies, as [The switch build](#the-switch-build) says.
- A Build computer or a Try again of an admin during a switch build waits
  until the switch build ends (switch decision 2 D). Then it runs on the
  account of the org at that time.
- The Cloud computer tab shows such a build as a build that runs. Its time
  counts from Build computer or Try again. The first line of its log is
  "Waiting for another update of the cloud computer to finish". Its steps
  follow when the wait ends.
- Reason: the tab and older copies of the Mac app know no state for a
  wait, and every copy of the app shows log lines. The words name no
  switch and no provider.
- Such a build begins when its wait ends. Its time limit of 60 minutes
  counts from then, as
  [Time limits of builds and starts](workspace-life.md#time-limits-of-builds-and-starts)
  says. Reason: a slow switch build then fails no build of an admin.
- An admin whose Done saves an add of a repository during a switch build
  gets one build that waits in the same way. So does an add from an older
  copy of the app. Reason: Done after an add starts a build when no job
  runs, as [Added repositories](org-image.md#added-repositories) says, and
  the switch build is hidden from members.
- The counts of the operator section leave out a build that waits, as
  [The counts](operator-overview.md#the-counts) says.
- A build or a refresh that the switch question ends fails, with the saved
  message "Another update of the cloud computer stopped this build. Try
  again." The Cloud computer tab shows such a build as a failed build,
  with Try again and the Settings mark.
- Reason: Try again then reads as the next step, and the words name no
  switch. The message of a build that a suspension ends was rejected,
  because nobody is suspended.
- A failed switch build stops no build that the app starts by itself after
  a change on GitHub, as
  [The org image](repository-changes-on-github.md#the-org-image) says.

## The page of the org

- The page of an org in the operator section has a Provider account box,
  between its details and its workspaces. The box gives the account of the
  org by its ID (e2b decision 221). Reason: the switch, its state, and its
  action then sit beside the account that they change.
- While a switch waits or builds, and after its switch build failed, the
  box also gives that switch:
  - Switch to: the new account, with the time and the operator of the
    switch.
  - Switch build: the state of the switch build, with a line that says
    why.
- A switch build that waits names what it waits for: the job of the org
  that runs, Lift, or an admin who is not suspended. For a build, the line
  also names its starter.
- A switch build that runs gives its time. Its line says that new
  workspaces start on the old account until it succeeds, and that each
  build has a 60-minute limit.
- A failed switch build gives its length and its cause. Its line says that
  the org stays on its account, where new workspaces still start. The
  failure stays until the next switch. Switch account is then the primary
  action of the box.
- The cause is in words for the operator. It is one of these:
  - The new account gave errors.
  - The install script failed.
  - The build passed its 60-minute limit.
- Reason: the saved message of a build is for members, and it asks them to
  read a log that the section does not show.
- The box shows the state of a switch build, never its log, as
  [What the section shows](operator-section.md#what-the-section-shows)
  says.
- After a switch, the box gives the last switch: the old account, the time
  when the account changed, and the operator. Reason: new workspaces move
  at that time.
- While the org has workspaces on more than one account, the box gives the
  number of workspaces on each account. The numbers include removed
  workspaces, so they add up to the workspaces by state. Reason: Orgs by
  account counts a deleted org in the same way.
- When no other account is configured, the box shows no Switch account.
  A line says that no other account is configured. Reason: the New orgs box
  of the Providers tab does the same with one account.
- Switch account sits at the bottom of the box, and it asks first. With
  one other configured account, the question names it. With more, the
  question offers each of them by its ID, as Create org does.
- The question says these things:
  - The switch builds the cloud computer of the org again on the new
    account, with the same repositories and install script.
  - New workspaces start on the new account when that build succeeds, and
    on the old account until then.
  - Existing workspaces stay on the old account.
  - When the build fails, the org stays on the old account.
  - Only this page shows the build.
- When a job of the org runs, the question names it and when it started.
  For a build, it also names the starter. It says that the switch build
  starts when that job ends.
- The question then offers to end that job now. The offer is off by
  default. It says that the job fails, that the switch build starts at
  once, and that an admin can try it again.
- When the switch build must wait for Lift or for an admin who is not
  suspended, the question says so. Reason: the operator then knows before
  the switch that its build does not start at once.
- While a switch waits or builds, Stop switch takes the place of Switch
  account, and it asks first. Its question says that the switch build on
  the new account stops, and that the org stays on its account, where new
  workspaces still start. For a switch that waits, it says only the second
  part.
- Reason: the org is still on its account, so the action names a stop and
  not a move.
- The question of Lift says when Lift starts a switch build, as
  [Suspend and Lift on a page](operator-section.md#suspend-and-lift-on-a-page)
  says.
