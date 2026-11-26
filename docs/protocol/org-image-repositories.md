# Repository changes of the org image

This doc holds the requirements and the decisions in force for a change
of the chosen repositories of an org: the waiting and the removed
repositories, the adds and the removals of an admin, their builds, and
the repository notice. It belongs to [Org image](org-image.md), which
covers the org image, its builds and its refreshes, and the first build
of a new org. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A row-remove decision number names a decision of the change that
adds Remove to the row menu of a chosen repository, as
[Repository order](repository-order.md) says.

- A job is a build or a refresh of the org image. One job runs at a time
  in each org.
- A waiting repository is a chosen repository that the org image does not
  hold yet. Each other chosen repository is ready.
- A removed repository is a repository that the org image holds, but that
  the org no longer chose.
- Before the first good build, no repository counts as waiting or removed.
  Reason: no workspace can start in that time, and the notices of
  [The first build](org-image.md#the-first-build) already say why.

## Added repositories

- An admin adds and removes repositories on the Repositories tab,
  between Edit and Done. Add and Remove change only the open edit. Done
  saves the edit (decision 296).
- Outside Edit, an admin can also remove one chosen repository with Remove
  in its row menu. Remove asks first, and the removal saves when the admin
  confirms it (row-remove decision 1 E), as
  [Remove in the row menu](repository-order.md#remove-in-the-row-menu)
  says.
- Reason: the org then gets only the changes that the admin confirms, with
  Done or with the question of Remove.
- When no job runs, Done starts one build when it saved an add
  (decision 295). The admin who selects Done is the starter of that
  build.
- Reason: an admin can add many repositories in one edit. One build at
  Done then holds all of them, with no build that each later add makes
  old.
- The repositories are then ready after one build, with no wait for an
  admin who finds Build computer (decision 240).
- Done starts no build when the edit added no repository, also after a
  removal. A repository that the edit added and then removed again counts
  as not added, and Done saves nothing for it.
- The Repositories tab tells an admin that Done starts a build after an
  add. The new build shows at once on the Cloud computer tab and in the
  [repository notice](#the-repository-notice).
- Done starts its build also when the newest build failed. Reason: Done
  of an admin starts it, as Try again does. The app still starts no build
  by itself after a failed build (decision 12).
- When the build cannot start, the added repositories stay saved. They
  then wait for the next build.
- A change that Done cannot save stays in the open edit, and the edit
  stays open. Done then tries it again. The other changes of the edit
  save, and an add among them starts the build.
- An edit that ends without Done, such as another tab or a closed
  window, saves nothing and starts no build (decision 296). The edit has
  no Cancel. Reason: leaving the edit already drops its changes.
- An add from an older copy of the app, which has no Done step, still
  starts a build at once. Reason: older copies of the app keep working.
- While a job runs, Done starts no second job.
- When a job succeeds, and the repositories of that job lack a chosen
  repository, the app starts one added build by itself (decision 240). It
  does so only when the newest build succeeded. A switch build gets none,
  as [The switch build](switch-account.md#the-switch-build) says.
- So the adds during a job share one added build after that job. Reason:
  without it, a repository that an admin adds during a job never builds.
- A failed build gets no added build. A refresh after a failed build gets
  none either. Reason: the app starts no build by itself after a failed
  build (decision 12), and Try again builds the current choice.
- So an add during a refresh after a failed build waits for Try again.
- A job gets at most one added build. So an add during the first good
  build gets one added build, not two.
- A refresh with a request of Build computer starts one build, which
  takes in the adds, as [The org image](org-image.md#the-org-image) says.
- The added build runs for an admin who is not suspended, as the added
  build of [The first build](org-image.md#the-first-build) does.
- A build at each add was replaced (decision 295). Reason: a burst of
  adds made a build that the next add made old.
- A delay that groups several adds into one build was rejected. Reason:
  Done already marks the end of the adds, with no wait after it.
- A save at each Add with a build at Done was replaced (decision 296).
  Reason: an edit that ended without Done then left saved repositories
  that waited for Build computer.
- A refresh that clones a waiting repository into the org image was
  rejected. Reason: the image would then hold a copy that the install
  script never prepared (decision 13).
- [Waiting repositories](create-a-workspace.md#waiting-repositories) says
  how New workspace shows a waiting repository.

## Removed repositories

- A removal starts no build (decision 240). The org image keeps the
  removed repository until the next build.
- Reason: a removed repository leaves only an unused folder in new
  workspaces until the next build.
- New workspace does not offer a removed repository.
- A build at each removal and at each change of the install script was
  rejected (decision 241). Reason: such a change blocks no new workspace,
  and each build is a start.
- A removed repository that the install script still uses can fail the
  next build. The log of that build then shows the error.
- A warning at the removal, and a sentence about the install script in
  the repository notice, were rejected. Reason: the log of the failed
  build shows the cause.

## The repository notice

- The repository notice shows on the Repositories tab and on the Cloud
  computer tab, for admins and members (decision 241).
- It shows while a repository waits, or while the org image still holds a
  removed repository. So it shows only once the org has an image.
- Its title names the waiting repositories, or the removed ones when no
  repository waits. After a failed build, the title names the failure, as
  the first state below says.
- While an open edit of the Repositories tab adds repositories, the
  notice of that admin names them and says to select Done to add them and
  start a build (decision 297). It has no button. It takes the place of
  the states below until Done.
- Reason: no build starts before Done, and the admin learns that Done
  starts it.
- The first state that applies gives its words and its action:
  1. No build runs, and the newest build failed. The title says that the
     last build failed. The body says that the change waits for a build
     that succeeds. An admin gets Try again. The user chose this title on
     24 November 2026 (repository load decision 3). Reason: the waiting or
     removed repositories then do not read as the cause of the failure.
  2. A build runs, and a repository waits. The notice says that the
     waiting repositories are ready after the build. It has no button.
  3. In each other case, the notice says that the change waits for the
     next build. An admin gets Build computer. This case covers a running
     refresh, a removal alone, and a build that could not start.
- A refresh never counts as a running build. Reason: a refresh adds no
  repository and does not run the install script, so a waiting change
  still waits for a build.
- The words say "after the build", not "after this build". Reason: an add
  during a build waits for the added build that follows it.
- On the Cloud computer tab, the notice has no button, also for an admin.
  Reason: the build card under it has the same action. The Repositories
  tab keeps the button.
- A member who is not an admin gets no button. When an admin can act, the
  notice tells the member so. Reason: only an admin builds (decision 57).
- A mark on each row of the repository lists was rejected, because the
  notice names the repositories.
