# New workspace notices

This doc holds the requirements and the decisions in force for two notices
of New workspace: the notice while the org has no good image, and the
notice of a repository that waits for its build. Each notice keeps Send
and Create off. This doc belongs to
[Create a workspace](create-a-workspace.md), which covers New workspace,
the create, the branch, and a failed first start. The terms are those of
the [architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Before the first good build

- A new workspace needs a good org image, because it starts from the org
  image (decision 13). While the org has no good image, such as during its
  [first build](org-image.md#the-first-build), New workspace
  shows a notice over the composer. Send and Create then stay off
  (decision 150 of PR #92).
- The notice shows the state of the newest build of the org:
  - While a build runs, it says that the cloud computer is being prepared,
    with the time since the build began.
  - After a failed build, it says that the cloud computer did not build.
  - With no build, it says that the cloud computer needs a build.
- In each state, an admin gets a link to the Cloud computer tab. After a
  failed build or with no build, the tab offers Try again or Build
  computer.
- While a build runs, the admin can set up the cloud computer on that tab,
  such as its install script. Such a change needs no Build computer, as
  [The first build](org-image.md#the-first-build) says. A link only after a
  failed build or with no build was rejected for that reason.
- A member who is not an admin gets no link. After a failed build or with
  no build, the notice says that an admin can build. Reason: only an admin
  builds and changes the settings of the cloud computer (decision 57).
- When a build succeeds, the notice goes, and Send and Create turn on.
- Once the org has a good image, New workspace shows no such notice, also
  during a later build or after a failed later build. New workspaces then
  start from the last good image (decision 9).
- A create that comes while the org has no good image, such as from an old
  tab, gets a refusal. While a build runs, the refusal says that the cloud
  computer is still being prepared. Otherwise, it says that the cloud
  computer needs a build. The composer keeps the message.
- Reason: the user learns the state before the send, in place of a refused
  create. A create that waits for the first build was left out for now
  (decision 152 of PR #92). Such a wait changes the start limit and the path that
  creates every workspace.

## Waiting repositories

- The repository picker lists each chosen repository, on the page and in
  the dialog (decision 240). A removed repository is not in the list.
- A [waiting repository](org-image.md#repository-changes) is off in the
  list, with a note that says when it is ready. The note follows the
  states of [The repository notice](org-image.md#the-repository-notice).
- Reason: the person learns of the wait before the send. A change of only
  the words of the refusal was rejected for that reason.
- The form picks the first ready repository. A kept draft keeps its
  repository, also when it waits. Reason: the form keeps the choice of the
  person.
- While the repository of the form waits, Send and Create stay off. A
  notice over the composer says when the repository is ready, and whether
  the person can choose another repository that is ready.
- In each state, an admin gets a link in that notice to the Cloud computer
  tab, as in the notice of the first build. When no build runs, the tab
  offers Try again or Build computer.
- While a build runs, the notice shows that build, and the admin can
  follow it on that tab. Such a build adds a repository, or an admin
  started it. A refresh never counts as a build that runs, as
  [The repository notice](org-image.md#the-repository-notice) says. While
  only a refresh runs, the notice follows its other states.
- Reason: the link then follows one rule in both notices. A notice with no
  link during a build was rejected for that reason.
- A member who is not an admin gets no link. When an admin can act, the
  notice tells the member so. Reason: only an admin builds (decision 57).
- When a build that holds the repository succeeds, the repository turns
  on in the picker. Its notice goes, and Send and Create turn on.
- A create in a waiting repository, such as from an old tab, gets a
  refusal that says that the repository is ready after the next build. A
  create in another repository that the org image lacks gets a refusal
  that says that the repository is not available.
- Both refusals have HTTP 404 and the code `repository_not_found`. The
  composer keeps the message.
- A create that waits for the build of its repository was rejected.
  Reason: such a wait changes the start limit and the path that creates
  every workspace, as for decision 152.
- A start that clones a waiting repository after the start from the org
  image was rejected, because the install script never prepares that
  repository.
