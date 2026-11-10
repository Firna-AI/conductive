# Repository folders

This doc holds the requirements and the decisions in force for the folder
and the shell variable of each repository in a sandbox. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
org image, the startup script, and the start of a workspace. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Folder names

- A build puts each chosen repository in its own folder, `~/code/<name>`,
  with the name of the repository on GitHub (decision 94). The folder name
  keeps the case, the dots, the underscores, and the hyphens of that name.
- When two chosen repositories have the same name, with case ignored, the
  folder name of each starts with its owner, such as `acme-storefront`.
- A folder name that is still in use gets `-2`, `-3`, and so on, in the
  order of the repository IDs.
- Reason: the mockups and their sample install script put each repository
  at `~/code/<name>`, and Conductor works the same way. The app's internal
  folders, with one variable for each repository, were rejected, because
  they do not match the mockups.

## Folder variables

- Each folder has a shell variable, `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR`.
  `<FOLDER>` is the folder name in uppercase, with an underscore in place
  of each character that is not an ASCII letter, a digit, or an
  underscore.
- A variable name that is already in use gets `_2`, `_3`, and so on before
  `_DIR`, in the same order. Such a collision does not change the folder
  name.
- The install script and the startup script get the folder variable of
  each repository. A workspace also gets `CONDUCTIVE_REPOSITORY_DIR`, with
  the folder of its own repository.
- The sandbox of a build or a refresh gets only the folder variables, which
  hold no secret. Only the Git command that copies a repository gets a read
  token, as [GitHub tokens](tokens-and-secrets.md#github-tokens) says.

## Folders over time

- A refresh keeps the folders and the variables of the org image.
- A build can move a repository folder to a new name. The move keeps every
  file of the folder, also untracked files such as installed dependencies.
- A workspace keeps the folders and the variables of the org image that it
  starts from. Each resume, and each restart near day 14 of a stop, uses
  them, also after a later build or a change of the chosen repositories.
