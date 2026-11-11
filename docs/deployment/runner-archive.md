# Runner archive and software image

This page belongs to [Deployment inputs](../deployment.md). It says how
image builds and workspace starts get the runner archive, and how each
deploy from `main` publishes the archive and builds the software image.

## The runner archive

Each new image build installs the runner archive into the org image. A
refresh keeps the installed runner and updates the repositories.
A workspace start installs the runner archive on the disk of a workspace
with an older version of the app's own software. The restart of an
archived sandbox installs nothing.
[Old workspaces](../protocol/workspace-life.md#old-workspaces) gives the
rules.
Publish the runner archive from the same commit as the Worker before any
image build or workspace start.
[The runner archive](../../image/README.md#the-runner-archive) says how to make
and publish it.

Each deploy from `main` publishes the archive of its commit when the
archive is new. It sets both variables to that archive, as
[The archive in each deploy](#the-archive-in-each-deploy) says. To supply
an archive by hand:

1. Package the archive, as
   [Developer scripts](../../image/developer-scripts.md#package-the-archive)
   says.
2. Publish the exact archive at its public HTTPS URL. For R2, upload it
   through the S3 API, because `wrangler r2 object put` refuses files over
   300 MiB.
3. Set `CONDUCTIVE_RUNNER_ARCHIVE_URL` to that URL. It can hold no user
   name, password, query, or fragment.
4. Set `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` to the digest of the same file.
   The Worker accepts upper or lower case.

More facts:

- `runnerSoftware` in `worker/configuration.ts` reads and checks both
  values, as the `software` option of a build or a refresh. For a missing
  or invalid value, it gives `503 runner_software_unavailable`.
- Each workspace start reads the same two values. They give the current
  version of the app's own software.
- The restart of an archived sandbox, near day 14 of its stop, is a later
  workspace start too. It is the one exception. It reads no archive value
  and updates nothing, as
  [Old workspaces](../protocol/workspace-life.md#old-workspaces) says. It
  keeps the recorded version and the failed update mark.
- Without valid values, the Worker cannot find the current version. So the
  update step of each workspace start fails, also when the disk holds
  current software. The start goes on with the software that the disk
  holds. The workspace keeps a mark of the failed update until its next
  workspace start.
- A build, a refresh, and a workspace start need the two values. A
  workspace read, a history read, the restart of an archived sandbox, and
  the start of the app need no archive setting.
- Image builds and refreshes run through the Worker routes that the
  [Worker README](../../worker/README.md#routes) lists.
- The archive holds no Node. Each build downloads one pinned Node release
  from `nodejs.org` into the image, as
  [The private Node runtime](../../image/runtime.md) says. The update at a
  workspace start downloads that release too when the disk lacks it. That
  download needs no deployment input.

### The archive in each deploy

The archives live in the R2 bucket `conductive-runner`. R2 is the file
storage of Cloudflare. The bucket serves each archive under
`https://runner.conductive.build/`. Each deploy from `main` takes these
steps for the archive:

1. It packages the archive with
   `--base-url https://runner.conductive.build/`. The archive URL is then
   `https://runner.conductive.build/runner-<sha256>.tar.gz`, where
   `<sha256>` is the SHA-256 digest of the archive.
2. It asks R2's S3 API whether the bucket holds an archive of that name. It
   uploads the archive only when the name is new.
3. It checks the size of the file at the public URL, also when the
   archive already existed. A missing file or a wrong size stops the run
   before the migrations.
4. It deploys the Worker with both variables set to that archive.

- The same source and packages give the same digest. So an unchanged
  runner makes no new upload.
- Old archives stay in the bucket.
- The upload uses R2's S3 API with the AWS CLI, because
  `wrangler r2 object put` refuses files over 300 MiB. The archive is about
  320 MiB.
- The S3 key pair comes from the deploy token, as
  [Cloudflare documents](https://developers.cloudflare.com/r2/api/tokens/).
  The key ID is the ID of the token. The secret key is the SHA-256 digest
  of the token value.
- The run masks that secret key in its log.
- A new archive reaches the next build of each org image. A refresh keeps
  the installed runner. So an existing image keeps its runner until its
  next build.
- A new archive also changes the version of the app's own software. So the
  disk of each existing workspace gets the new archive at its next
  workspace start. The restart of an archived sandbox updates nothing, as
  [Old workspaces](../protocol/workspace-life.md#old-workspaces) says.

### The software image

Each deploy from `main` asks the Worker for the
[software image](../protocol/org-image.md#the-software-image) of its new
version. The software image holds the base image, the runner archive, and
the rest of the app's own sandbox software.

1. Before the Worker upload, the deploy makes 32 random bytes as its
   deploy token. It keeps the token in a file of the deploy job only, and
   masks it in the log.
2. It sets `CONDUCTIVE_DEPLOY_TOKEN_SHA256` to the SHA-256 digest of the
   token, with `--var`.
3. After the health check, it calls `POST /v1/deploy/software-image` on
   the machine hostname every 10 seconds, for up to 15 minutes. Each call
   sends the token and its digest. Each call moves the build on, and
   answers with its state and its new output.
4. A later job fails the run unless the last answer says that the image
   is ready.

- The Worker accepts the token only for 30 minutes after the creation time
  of its version, which `CF_VERSION_METADATA` gives.
- An older Worker version answers 409 to the digest of a newer deploy. The
  deploy then asks again.
- A deploy by hand sets no new token, so it builds no software image. Builds
  of an org without an org image then install the app's own software.
- After the wait ends, the 15-minute Cron Trigger moves an unfinished
  build on, until it ends or reaches its time limit of 60 minutes.
