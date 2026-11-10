# Imported workspaces

This doc holds the requirements and the decisions in force for a workspace
that an import from Conductor creates. It covers its record, its state
before the activation, the activation, a failed activation, and Archive
before the activation. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md).
[Import from Conductor](conductor-import.md) states the import itself, and
[Sessions from Conductor](chat-and-events.md#sessions-from-conductor)
states how its old sessions show. The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Import from Conductor](conductor-import.md#terms). A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The workspace

- The Worker creates the workspace when each part of its reservation is
  stored and checked (import decision 13). It creates it at once, with no
  cloud computer (import decision 4).
- The workspace has the repository, the branch, and the name of its
  Conductor workspace. It goes to the section that
  [Where an import goes](conductor-import.md#where-an-import-goes) gives.
- It has an old document for each session that imported. It has no first
  message and no session until its activation.
- Its owner is the importer. It gets the next number of its org, as each
  workspace does.
- Its record keeps its local Conductor ID, and whether an activation
  succeeded.
- The header shows the flag From Conductor, also after the activation.
- Every member of the org sees the workspace, as each workspace of the
  org.
- Reason: the user's design creates each workspace at once with its name
  and its sessions. A read-only import with a new linked workspace was
  rejected.

## Before the activation

- Until its first activation starts, the workspace shows the state Not
  active, with a mark of its own. During an activation, it shows starting,
  and after a failed activation, error, as for each start.
- Reason: the state Stopped would say that a cloud computer existed.
- Opening the workspace starts no cloud computer. Its chat asks Activate
  this workspace, in place of the composer.
- So no message goes before the activation. Reason: the person chooses
  when the cloud computer starts.
- The files and the tools show Not active, with Activate. Changes shows no
  count, and All files lists no file. After a failed activation, they say
  that the activation failed and that the work is kept, with Try again.
- The old documents stay readable, as
  [Sessions from Conductor](chat-and-events.md#sessions-from-conductor)
  says.

## The activation

- Activate starts the first start of the workspace (import decision 4).
  Each member who can send messages in the workspace can activate it.
- The activation is a start. The rules of each start hold for it: the
  start steps, the time limit of 20 minutes, and Try again after a
  failure. So do the refusals, such as for a suspended owner, as
  [Starts, stops, and builds](operator-actions.md#starts-stops-and-builds)
  says.
  [Life of a workspace](workspace-life.md#time-limits-of-builds-and-starts)
  gives these rules.
- The activation starts a cloud computer from the newest good org image.
  An activation while the org has no good image gets the refusal of a
  create, as
  [Before the first good build](create-a-workspace.md#before-the-first-good-build)
  says.
- In that cloud computer, the activation first installs the current runner
  and the workspace tools of the app. Reason: the runner of an older org
  image can lack the receiver and the checked delivery of the stored work,
  and the activation has no first turn.
- This holds only for the first activation. Ordinary starts keep the runner
  of their org image. The org image does not change, and the workspace keeps
  the version pin of its org image, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- Git fetches the branch of the workspace from GitHub. When GitHub does not
  have the branch, Git fetches the default branch instead.
- These fetches use the GitHub user token of the member who activates.
  Reason: the first start of a new workspace uses the token of the sender
  of its first message, as
  [The branch and the name](create-a-workspace.md#the-branch-and-the-name)
  says.
- Before it changes the checkout, the activation checks that the stored
  work fits the free disk of the cloud computer, with room to unpack it
  (import decision 11).
- When it does not fit, the activation fails before it changes the
  checkout. Its cause names the space that the work needs and the space
  that the disk has.
- The Worker copies the stored work into the cloud computer. The cloud
  computer gets no credential for the bucket. The copy holds the exact
  bytes of each part.
- The runner then puts the work in place:
  - It fetches the commits of the Git bundle. It checks out the branch at
    the newest commit of the Mac.
  - The branch tracks its branch on GitHub, when GitHub has it.
  - It copies the changed and untracked files and `.context` over the
    checkout.
  - It puts the old documents in `.context/conductor/`, one file for each
    session.
  - It adds the root rule `/.context/` to the local exclude file of the
    clone, as [The context folder](repository-folders.md#the-context-folder)
    says. So Git ignores the folder, and no push sends it.
  - It puts each memory file where its agent finds the sessions of the
    folder of the repository.
- Each imported session then becomes a session of the workspace, with its
  title and its agent. Its starter is the importer (import decision 5).
- The session continues with the memory of its agent, as
  [Sessions from Conductor](chat-and-events.md#sessions-from-conductor)
  says.
- The activation also opens one new session, which shows Untitled until
  its first message. Its starter is the member who activates.
- The agent gets no message of the workspace before the work is in place.
  A message during the activation waits, as during each start.
- After a successful activation, the app deletes the stored work. It keeps
  the old documents.
- Once an activation has started, the workspace never shows Not active
  again.

## A failed activation

- A failed activation keeps the workspace, its old documents, and its
  stored work. It shows its cause and Try again, as
  [A failed first start](create-a-workspace.md#a-failed-first-start) says.
- The app deletes the cloud computer of the failed start, as after each
  failed first start.
- Try again starts a new activation from the newest good org image.
- A failure for a disk that is too small also says that the work is kept.

## Archive before the activation

- Before a successful activation, its Archive question asks with no check.
- The question says that the workspace cannot be activated while it is
  archived, and that its old documents stay readable.
- The question says neither that the work is pushed, nor that a cloud
  computer will be deleted.
- After that Archive, the workspace shows the day of the archive, and that
  its old documents stay readable. It names no deleted cloud computer.
- An archived workspace cannot be activated. Archive deletes no stored
  work, as [Import uploads](access-and-security.md#import-uploads) says.
- Reason: the rules of [Archive](workspace-life.md#archive) and of the
  storage settle this case. They keep the old documents readable, as they
  keep the chat of each archived workspace.
- After a successful activation, Archive follows the rules of
  [Archive](workspace-life.md#archive).
