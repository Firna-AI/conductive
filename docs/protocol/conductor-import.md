# Import from Conductor

This doc holds the requirements and the decisions in force for the import
of local Conductor workspaces. Conductor is a Mac app for parallel coding
agents, at `conductor.build`. Its cloud workspaces, Conductor Cloud, go
read-only on 13 November 2026, and Conductor starts to delete their data
on 20 November 2026. Its Transfer to local moves a cloud workspace and its
chats into the Conductor Mac app, which keeps working until early 2027.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

These docs belong to this doc:

- [Import on the Mac](desktop-import.md): the entry points, the consent,
  the scan, the device operations, and the uploads of the Mac app.
- [Imported workspaces](imported-workspaces.md): the workspace that an
  import creates, its activation, and Archive before its activation.

## Terms

- **Conductor workspace:** one local workspace of the Conductor Mac app. It
  is a Git worktree with its branch, its sessions, and its records in the
  database of Conductor.
- **Local Conductor ID:** the ID of a Conductor workspace in the database
  of Conductor. Only this ID names a Conductor workspace, because folder
  names repeat across repositories and over time.
- **Memory file:** the own session file of the agent of one Conductor
  session, also a compressed one. The agent continues the session from it.
- **Importer:** the member who imports a workspace.

## Scope

- The import brings local Conductor workspaces into Conductive, with their
  work, their branch, their name, and their sessions (import decision 1).
- It covers each Conductor workspace that is not archived. This includes
  each cloud workspace that the user moved with Transfer to local.
- Only the Mac app imports (import decisions 1 and 9). The web app in a
  browser offers no import.
- Reason: Transfer to local puts the files, the branch, and the chats on
  the Mac. The Conductor API reads no files, and a transferred workspace
  keeps no link to its cloud ID.
- An import through the Conductor API, an upload of the Export data
  archive of Conductor, a Terminal command, and a browser with folder
  picks were rejected for these reasons.
- The import reads no data through the Conductor API.
- It imports no section, env var, or script of Conductor.
- A new workspace can also continue a branch that exists on GitHub, as
  [Continue a branch](continue-a-branch.md) says.

## Where an import goes

- An import puts each workspace in the current org of the Mac app. Each
  screen of the import names that org.
- Each member of an org can import into it. The importer is the workspace
  owner of each workspace that the import creates, as for each create.
- A suspended user can import nothing, and nobody can import into a
  suspended org, as [Operator actions](operator-actions.md) says for each
  create and each change.
- Each imported workspace goes to the section Import from Conductor
  (import decision 10). When the org has no section with that name, the
  import creates it at the top of the list. It is then an ordinary
  section, as [Sections](orgs-and-members.md#sections) says.
- Reason: the Mac holds no Conductor sections, and a transferred workspace
  keeps no cloud ID. Sections from the Conductor API, matched by name and
  branch, would be a guess. One section for each repository was rejected,
  because the user chose one section.

## The list

- The import screen lists each Conductor workspace that is not archived,
  from a scan of the Mac, as [The scan](desktop-import.md#the-scan) says.
- Each row shows the name, the repository, the branch, the number of
  sessions, and the size of the upload.
- The name of a row is the first of these that its Conductor workspace
  has: its cloud name, the title of its pull request, its branch, or its
  folder name.
- The imported workspace takes that name. So no automatic name replaces
  it, as [Workspace and session names](agents-and-sessions.md#workspace-and-session-names)
  says.
- A row matches a chosen repository of the org when its Git remote names
  that repository on GitHub.
- The Worker gives each row one state in the current org:
  - A row can import when it matches a chosen repository, and the org has
    no workspace and no reservation from its local Conductor ID.
  - A row that matches no chosen repository cannot import. It says that an
    admin can add the repository. An admin gets a link to the Repositories
    tab of the org settings.
  - A row that the org already imported shows as imported, with a link to
    its workspace. This holds also after an Archive of that workspace.
  - A row with a reservation shows as unfinished, as
    [Stopped uploads](#stopped-uploads) says.
- Reason: the person sees each workspace of the Mac, also the ones that
  cannot import, with the reason.
- The org keeps the local Conductor ID of each imported workspace, so that
  each later scan finds it.
- The person selects every row that can import, or single rows (import
  decision 1). The count and the upload size of the selection show before
  Import.

## What the Mac sends to the Worker

- The page in the Mac app has no bridge to the Mac app (decision 62). So
  the Mac app sends the list to the Worker, and the Worker relays it to
  the page of the same Mac app.
- For each row, the list holds only the local Conductor ID, the name, the
  repository, the branch, the number of sessions, and the upload size.
- The list holds no file, no file path, no message, and no session title.
- The Worker keeps no copy of the list. It stores only the rows that the
  person imports, in their reservations.
- A new open of the import screen asks the Mac for a new scan.
- The consent therefore never promises that the list stays on the Mac, as
  [Consent](desktop-import.md#consent) says.
- Each reservation also gets the title, the agent, the number of messages,
  and the day of each session that imports.
- The import result goes the same way. It names each file that stayed on
  the Mac, with its path in the workspace and its size. It also names each
  session that did not import, with its title. The Worker keeps no copy of
  either list.

## The stored work

- For each workspace, the import stores the work that GitHub does not hold
  (import decision 8):
  - a Git bundle of the commits of the branch that GitHub lacks
  - the changed and untracked files that Git sees
  - the `.context` folder
  - the memory file of each session
- Reason: Git in the cloud computer fetches the rest from GitHub at the
  activation. So the import keeps every commit and uploads little.
- A copy of the whole working tree, or of the whole repository with its
  history, was rejected, because it uploads far more. A copy of the files
  that differ from GitHub, by hash, was rejected, because it loses the
  commits.
- The import also stores one old document for each session, as
  [Old documents](#old-documents) says.
- The import copies a symbolic link as a link. It never follows one.
  Reason: a link to a large folder outside the worktree would upload that
  whole folder.
- A file that GitHub holds in Git LFS comes from GitHub at the activation.
  A changed Git LFS file goes as a changed file.
- A changed or untracked file over 100 MiB, or 104,857,600 bytes, stays on
  the Mac (import decision 11). This holds also in `.context`. The import
  result lists each such file.
- Reason: GitHub refuses a file over 100 MiB in a push, and such a file is
  usually data, not code. No limit, a question for a workspace over 1 GB,
  a box for each large file, and a byte total at the Worker were rejected.
- The rule never applies to the Git bundle, the memory files, or the old
  documents. Each of them always uploads in full. Reason: a session cannot
  resume from a part of its memory file.
- A session that has no memory file on the Mac does not import. Examples
  are a session that never started, and a session whose file its agent
  deleted. The import result names such a session.
- Reason: the import reads no message rows of the database of Conductor
  (import decisions 5 and 7). So such a session has no source.

### Old documents

- The Mac app turns the memory file of each session into one old document,
  in Markdown (import decision 7). It reads a compressed file too.
- The document holds the messages, the answers of the agent, and one short
  line for each tool step.
- It holds no thinking text of the agent, no tool output beyond that line,
  and no metadata of the provider.
- No memory file reaches the browser. Reason: no event type of an SDK or a
  provider reaches the browser, as [Events](chat-and-events.md#events)
  says.
- The app hides no secret value in an old document, as for file content.
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  states this risk.
- [Sessions from Conductor](chat-and-events.md#sessions-from-conductor)
  states how members read the documents.

## The import

- Import makes one reservation for each selected row (import decision 13).
  The reservation belongs to the org and to the importer.
- The Mac app then uploads the stored work and the old documents of each
  reservation, as [The uploads](desktop-import.md#the-uploads) says.
- No Worker request carries the bytes. Each part goes straight to the
  bucket, with a short-lived upload link, as
  [Import uploads](access-and-security.md#import-uploads) says.
- The Worker checks each stored part against the size and the SHA-256 that
  the Mac app gave for it. A part that does not match counts as missing.
- When each part of a reservation is stored and checked, the Worker creates
  its workspace, as [Imported workspaces](imported-workspaces.md) says. It
  ends the reservation in the same step.
- Before that, no member, no screen, and no route sees a workspace for the
  reservation. Reason: incomplete work never reaches a member, a screen,
  or an activation.
- A workspace that appears before its upload ends was rejected, with each
  way to guard it: an upload state, an activation that waits, the
  documents first, and an activation that fails.
- Each reservation completes on its own. While the upload runs, the import
  screen shows the progress of each row. Only a row whose workspace exists
  links to it.
- The stored work of one workspace always comes from one state of its
  Conductor workspace. Reason: the activation must restore the work
  exactly (import decision 8).

## Stopped uploads

- An upload that stops keeps its reservation and its stored parts (import
  decision 14). This holds when the Mac sleeps, when the Mac app quits, and
  when the network fails.
- The list of the importer then shows the row as unfinished. It shows how
  much is stored, the last day of the reservation, and Try again.
- Try again uploads only the missing parts. When the Conductor workspace
  changed since its reservation, Try again uploads all of it again.
- Nothing tries again by itself. Reason: the importer decides when the Mac
  uploads. A Try again by the Mac app itself was rejected, because it can
  resume an upload that the user stopped.
- A reservation and its stored parts expire 7 days after the import made
  the reservation. The app then deletes the parts, and the row can import
  again in full.
- Reason: the Mac still holds the source, so an expiry loses nothing.
  Unsent draft attachments use the same 7 days.
- A stopped upload never leaves a workspace in the org. A workspace with a
  mark of an incomplete upload, and a delete of such a workspace, were
  rejected.

## Performance

- The import moves only the work that GitHub does not hold.
- The heavy steps run on the Mac and in the cloud computer. The Mac app
  reads the data of Conductor and runs Git. The runner applies the work.
- Each Worker request handles the bytes of at most one part or one old
  document.
- Each reservation and each imported workspace keeps its data under its
  own prefix in the bucket. So imports run side by side.
- No cloud computer starts until a member activates a workspace.
