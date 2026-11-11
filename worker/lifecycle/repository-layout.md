# Repository layout

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code puts each chosen repository into the org image and
into a workspace sandbox. The org image is the saved snapshot that every
new sandbox of an org starts from.
[Repository folders](../../docs/protocol/repository-folders.md) gives the
folder names and the variable names that the code must make.
[GitHub tokens](../../docs/protocol/tokens-and-secrets.md#github-tokens)
gives the rules for the read token of each copy.

## The folder map

A folder map gives each repository of an image its folder and its shell
variable, in the fields `repositoryId`, `directory`, and `variable`.

`repositoryLocations` in [`repository-locations.ts`](repository-locations.ts)
makes the map of a new build from the chosen repositories. It puts each
folder under `/home/user/code/`. It also makes each name safe for a path:

- It puts a hyphen in place of each character that is not an ASCII
  letter, a digit, a dot, an underscore, or a hyphen.
- It uses `repository` in place of an empty name, `.`, or `..`.
- It keeps at most 100 characters of the owner and of the name.

`readRepositoryLocations` checks each stored map. It refuses a folder that
is not one safe name directly under `/home/user/code/`, other than the
older folder of the same repository. It also refuses a repeated
repository, folder, or variable.

D1 keeps each map as JSON. The migration
`202611070004_repository_locations.sql` adds these nullable columns for
the folder map:

| Column | Value |
| --- | --- |
| `image_build_jobs.repository_locations_json` | The map of the image that the job makes. |
| `image_build_jobs.previous_repository_locations_json` | An empty map for each new build and refresh, because both start on a clean machine. |
| `workspace_creation_plans.repositories_json` | The repositories of the published image that a creation claim captures. |
| `workspace_creation_plans.repository_locations_json` | The map of that published image. |
| `workspace_runtime.repository_locations_json` | The map of the workspace. |

## Capture

- A build makes a new map with `repositoryLocations` in `startImageBuild`,
  and an empty previous map, because it starts on a clean machine. A
  refresh copies the map of the newest successful build and stores an
  empty previous map too.
- The plan statement of `claimCreation` copies the repositories and the
  map of the published image. It runs in the same D1 batch as the claim.
  So a later build or a later change of the chosen repositories cannot
  change the map of that create.
- The records step of the start writes the map to `workspace_runtime`.
- `workspaceRepositoryLocations` in
  [`repository-location-data.ts`](repository-location-data.ts) reads the
  map for each resume and each disk retention restart. It reads the
  workspace map first, then the map of the creation plan, and then the
  older layout. It never reads the current choice of repositories.

## The variables of a sandbox

- Build and refresh sandboxes get only `repositoryEnvironment` of the map.
- A workspace start and a disk retention restart give the org env vars
  first, then the folder variables of the workspace map, and then the
  app's own variables, such as `WORKSPACE_TOKEN`. A later value wins on a
  name collision.
- `repositoryLocation` gives `CONDUCTIVE_REPOSITORY_DIR`, the folder of
  the workspace's repository in the workspace map. The
  [image README](../../image/README.md#start-in-a-workspace) says which
  commands start in that folder.

## The source loader

`createGitHubImageSourceMaterializer` in [`image-sources/materialize.ts`](image-sources/materialize.ts)
loads the repositories into the folders of the job's map, as the required
`prepareSources` of `ImageRuntime`. Each call starts or polls one detached
command in the build sandbox through `input.commands`, a [`SourceCommandPort`](image-sources/source-commands.ts)
that has only `start` and `status`. It returns `false` while native work or a
revocation is pending, and `true` when every repository is done. So the
work continues across alarms, and each call reads its state from D1.

[`image-sources/source-data.ts`](image-sources/source-data.ts) keeps that
state in the `image_source_jobs` table of migration
`202611070005_native_image_sources.sql`: the phase, the repository index,
the process, the output offsets, the grant hash, and the encrypted token.
The phases are `layout`, `ready`, `fetch`, `revoke`, `finalize`, and
`done`. The table has no cascading key to the build or the org, so the
encrypted token stays owned until its revocation.

1. The first command makes the folder moves below.
2. For each repository, the [shared App credential flow](../github/README.md#public-boundaries)
   signs a JWT with `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, and the injected clock.
   It gets an installation
   token that can only read the contents of that repository. It stores the
   token encrypted, bound to the org, the build, the sandbox, the
   repository, and the source index, with the hash of a new one-use build
   grant. When that store fails, it revokes the token at once.
3. The fetch command from
   [`image-sources/native-command.ts`](image-sources/native-command.ts)
   starts with an empty environment, uses absolute paths for `curl` and
   Git, and discards its output. The build log gets only fixed progress
   text. Its `curl` skips any `.curlrc`, accepts only HTTPS, follows no
   redirect, and has time limits. It sends the grant to
   `handleImageSourceCredential`, as the
   [machine route](README.md#machine-route) says. An inline credential
   helper gives Git the token from the process environment only. Git makes
   a bare clone in a staging folder, with no checkout, hook, filter, or
   submodule. No helper or token stays in a Git config.
4. When the command ends, the Worker uses the shared revocation through
   [`revokeInstallationToken`](image-sources/github-app.ts). A 204 or a
   401 reply from GitHub confirms that the token is inactive. Any other
   reply keeps the encrypted token, and a later alarm tries again. No local
   clock releases the token. The loader goes on only after that proof.
5. The finalization command then copies the branches and the tags from the
   token-free bare clone into the repository folder. A new folder starts
   with the object format of that clone. An existing folder keeps its local
   Git settings, and the command sets only the URL and the fetch rule of
   `origin` and the upstream of the default branch. It keeps untracked
   files, such as installed dependencies, and resets the tracked files to
   the captured default branch. An empty repository gets an unborn default
   branch. A repository that has refs but not that branch fails. The command
   then deletes the staging folder.

A command succeeds only with exit code 0 and no reported timeout. A
missing timeout flag is not a timeout. A missing process, or a start with
no confirmed reply, fails closed, and the next alarm revokes the token. A
transient Boat error of a poll keeps the source record for the next alarm, within the [retry window](image-builds.md#provider-retries).

`handleImageSourceCredential` in
[`image-sources/credential.ts`](image-sources/credential.ts) accepts only a
`POST` to `IMAGE_SOURCE_CREDENTIAL_PATH`, `/v1/internal/image-source/credential`,
on the HTTPS machine origin, with no cookie and no `Origin` header. One D1
statement consumes the grant and checks that the build still runs, that the
org exists, and that the repository is the captured one. The handler then
returns the decrypted token as text, in a private response with no CORS
header. A used, unknown, or invalidated grant gets HTTP 401. The handler
throws an `HttpError` for each refusal, so its caller must use the private
error response wrapper.

After a terminal failure, `cleanupBuildImageSources` in [`image-sources/cleanup.ts`](image-sources/cleanup.ts)
invalidates the grant and revokes the token before it deletes the source
record. [`image-sources/cleanup-data.ts`](image-sources/cleanup-data.ts) holds those
writes. The build cleanup runs it before it deletes the build sandbox, also
when Boat refuses the app's Boat key. `cleanupOrgImageSources` does the
same for each build of an org. The image coordinator calls it before it
stops for an org that is gone. Each terminal failure of the loader gives
one fixed error, because Boat output and Git errors can hold a credential.

The composition root passes the Members lifecycle hooks through
`withImageSourceCleanup(env, fetch, hooks)` from
[`image-sources/members.ts`](image-sources/members.ts). The wrapper changes
only `suspendOrg`. Before the existing suspension, it runs
`cleanupOrgImageSources` with the lifecycle ownership of the Members call.
The suspension goes on only after that cleanup is complete. That ownership
fences each cleanup statement with the current org generation, and the
cleanup renews its lease. A failed revocation keeps the encrypted token, so
the org purge waits until a retry revokes it. The existing suspension still
drains the jobs, fences the lifecycle writes, stops the timers, and keeps
the sandbox IDs and snapshot names for Members.

## Folder moves

Before it loads any repository, the source loader runs `sourceLayoutCommand`
from [`image-sources/layout-command.ts`](image-sources/layout-command.ts). It
acts only on each repository whose folder differs between the previous map
and the new map, or that the new map does not hold. So a build and a refresh
move no folder, as [Capture](#capture) says. The command does these steps:

1. It moves each old folder to a staging folder under
   `/home/user/conductive/source-relocation/<build ID>/`, and writes a
   marker for each move. It stages all old folders before it writes any
   new folder, so two repositories can swap their names.
2. It moves each staged folder to its new folder. When the new folder
   already exists, the command fails, and so does the build.
3. It deletes the staged folder of each repository that the new map does
   not hold.

A move keeps every file of the folder, also untracked files such as
installed dependencies. The markers make a repeat of an interrupted
command safe.

## The older layout

Image jobs and creation plans from before the migration have no map. They
use the older layout: `legacyRepositoryDirectory` gives
`/home/user/conductive/repositories/<encoded repository ID>`. The folder
variables still get the names of the new layout, and they point to the
older folders.

- A refresh of an older image keeps the older folders.
- The next explicit build copies the repositories into the new layout.
- A job that started before the migration moves no folder.
- A workspace without a stored map keeps the older folder of its
  repository.

The migration rewrites no snapshot path and no user file.

## The default branch at a create

The fetch step of a create runs `defaultBranchCommand` from
[`default-branch-command.ts`](default-branch-command.ts).
`workspacePhaseCommand` in [`start-command.ts`](start-command.ts) gives it
the repository folder of the workspace map, the captured default branch,
the ID of the first turn, and the trusted sender of the create. Without
that sender, the step fails.

The command exports the turn ID as `CONDUCTIVE_TURN_ID`. So the
[git credential route](README.md#machine-route) gives each Git request a
fresh GitHub user token of that sender. The command holds no token, and
it writes no token to a Git config or a file. It needs the `origin` remote
and the credential helper of the image.

1. `git ls-remote origin` reads every ref of the remote. A failed read
   fails the step.
2. When the remote has no ref, the command makes an empty root commit with
   `git mktree` and `git commit-tree`. It does not read the index, so no
   file of the folder goes into the commit. The author and the committer
   are the sender: the display name, or else the GitHub login, with the
   email `<GitHub ID>+<GitHub login>@users.noreply.github.com`. The message
   is `Initialize empty repository`.
3. It pushes that commit to the default branch without force. When the
   push fails, it reads the remote refs again. When the remote is still
   empty, the step fails with the status of the push. Otherwise another
   push came first, and the step continues.
4. Each successful path ends with a fetch of the default branch. The
   branch step then creates the workspace branch from `FETCH_HEAD`.

A remote with any ref gets no commit, also when it has no default branch.
The fetch then fails, and the start fails.

## Development

The source tests run the production source loader with native Git and
`/bin/sh`. `native-process-test-support.ts` maps the sandbox home to a
temporary folder under `.context/`. It refuses each command that still
holds `/home/user`, `/run`, or `/opt`. It reads each status with the
production `readCommandStatus`, and its replies omit `timedOut`, as Boat's
can. `NativeGitHubAccess` in `native-github-test-support.ts` stands in for
the GitHub token mint and revoke, and it tracks the scope and the life of
each token.

- `image-sources/local-materialize.test.ts` clones default history and tags,
  reloads captured folders, and clones an empty repository. The source
  loader can keep dependencies and local Git settings in an existing
  folder. Image jobs give it fresh folders. The test fails when
  a checkout starts while a token is active.
- `image-sources/credential.test.ts` checks the one-repository read token,
  a replayed or concurrent grant claim, the current owner, and the private
  response with no cookie, `Origin`, or CORS.
- `image-sources/materialize.test.ts` covers denied access, wrong owners,
  a failed clone, a lost process, an uncertain start, and kept revocation
  ownership across actor restarts. It also refuses a remote that has refs
  but no captured default branch.
- `image-sources/deadline.test.ts` returns each alarm while Git runs, and
  allows the install only after revocation. It keeps the last good image
  after a failure, and revokes when Boat refuses the app's Boat key.
- `image-sources/members.test.ts` runs the real org delete and cleanup with
  the wrapper. The purge waits until a failed revocation succeeds.
- `repository-names.test.ts` checks the folder names, the variable names,
  and their collisions.
- `repository-layout.test.ts` loads token-free sources with the native
  finalization command. It runs the sample install script of the mockups
  in the named folders, and reinstalls dependencies on a clean refresh.
  The folder variables reach the install command only through a
  private `env.sh` file, as in a real build sandbox.
- `repository-capture.test.ts` keeps the workspace map at a resume and a
  disk retention restart, after a later choice of repositories changes the
  name collisions.
- `default-branch-command.test.ts` runs the default branch step with native
  Git. `FakeGitHubGit` serves a local bare repository through
  `git-http-backend`, and the production git credential route gives the
  token. No test uses a real GitHub account.

### Key Code

- [`repository-locations.ts`](repository-locations.ts):
  `repositoryLocations`, `readRepositoryLocations`, `repositoryLocation`,
  `repositoryEnvironment`, and `legacyRepositoryDirectory`.
- [`repository-location-data.ts`](repository-location-data.ts):
  `workspaceRepositoryLocations`, the map of one workspace.
- [`image-sources/materialize.ts`](image-sources/materialize.ts): `createGitHubImageSourceMaterializer`,
  one source phase for each call, through [`SourceCommandPort`](image-sources/source-commands.ts).
- [`image-sources/source-data.ts`](image-sources/source-data.ts): the
  durable source record and the one-use grant claim.
- [`image-sources/native-command.ts`](image-sources/native-command.ts): the
  isolated bare clone and the finalization commands.
- [`image-sources/credential.ts`](image-sources/credential.ts):
  `handleImageSourceCredential` and `IMAGE_SOURCE_CREDENTIAL_PATH`.
- [Image App adapter](image-sources/github-app.ts): `installationToken` and
  `revokeInstallationToken`, through [shared credentials](../github/app-credentials.ts).
- [`image-sources/cleanup.ts`](image-sources/cleanup.ts):
  `cleanupBuildImageSources` and `cleanupOrgImageSources`.
- [`image-sources/members.ts`](image-sources/members.ts):
  `withImageSourceCleanup`, the required Members suspension wrapper.
- [`image-sources/data.ts`](image-sources/data.ts): `authorizeImageBuilder`
  and `readSourceRepository`, the builder and repository checks.
- [`image-sources/layout-command.ts`](image-sources/layout-command.ts):
  `sourceLayoutCommand`, the folder moves of an image job.
- [`default-branch-command.ts`](default-branch-command.ts):
  `defaultBranchCommand`, the fetch step with the empty first commit.
- [`start-command.ts`](start-command.ts): `workspacePhaseCommand`, the
  fetch and branch commands of a create.
