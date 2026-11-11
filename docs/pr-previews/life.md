# Life of a pull request preview

This page belongs to [Pull request previews](../pr-previews.md). It gives
the runs of the workflow, the comment, the deploy, the delete, the daily
sweep, and a recovery by hand.

## Runs of a pull request

- The runs of one pull request share one concurrency group. They wait in
  turn, and no run cancels another.
- GitHub keeps only the newest waiting run. So a burst of pushes deploys
  the newest commit.
- Reason: a cancelled delete can stop after its Boat and attachment steps.
  It then leaves database rows for resources that no longer exist.

A deploy run has these jobs:

1. The build job runs `npm ci` and `npm run build`, with no secrets. It
   keeps `dist/` and `migrations/` as an artifact for one day.
2. The runner job packages the runner archive with
   `--base-url https://runner.<zone>/`, with no secrets. It asks the
   runner bucket for an archive with the same digest. Only a missing
   archive goes into an artifact for one day.
3. The deploy job uses the GitHub environment `preview`. It sets the URL
   of that environment to the app hostname. It runs the preview tool, as
   [The deploy](#the-deploy) says. It also posts the comment, before and
   after the deploy.

- The runner job asks through the public URL of the bucket, with a query
  string. So its answer never enters the cache of the archive URL.
- The runner job packages the archive in each run. Reason: the runner
  bundle also takes code from `src/shared/`, so a filter on paths can miss
  an input.
- The packager gives the same digest for the same input. So an unchanged
  runner uses the archive that the bucket already holds. An archive is
  about 320 MiB.
- The deploy job installs the packages of `main` in a temporary folder,
  with `npm ci --ignore-scripts`. It runs the Wrangler of that folder.
- It unpacks the build in the temporary folder of the runner, never in its
  working folder.
- So no package of the branch and no install script runs next to the
  token. No `.env` file of the build loads next to it.

## The comment

- One bot comment on each pull request shows its preview. It holds the
  links, the commit, and the state of the preview.
- The states are deploying, live, failed, and deleted. The failed state
  links the run.
- Each run edits that comment. A hidden marker in the comment lets each
  run find it.
- After a reset of the database, the comment says that the preview data
  was reset.

## The deploy

The deploy job runs the preview tool. The tool takes these steps, in this
order:

1. It makes the D1 database `conductive-pr-<n>` in Western Europe. Or it
   finds the database of an earlier run.
2. It writes the Wrangler config of the preview, beside the built config
   in `dist/conductive/`.
3. It applies the D1 migrations with that config.
4. It uploads a missing runner archive to the runner bucket, through the
   S3 API of R2, as `.github/workflows/deploy.yml` does.
5. It deploys the Worker with
   `wrangler deploy --config <file> --secrets-file <file>`. The tag of the
   new version is the short commit hash.
6. It checks that `/api/health` on the app hostname answers
   `{"status":"ok"}` within 2 minutes.
7. It adds `pr-<n>` to the registry of the relay.

- The secrets file lives in the temporary folder of the runner. The job
  deletes it.
- The health check waits, because a new route can need some seconds to
  reach every Cloudflare location.
- When a step fails, the comment shows the failed state, with a link to
  the run.

### The reset of the database

- The tool keeps the SHA-256 digest of each applied migration, in a table
  of its own in the preview database.
- An applied migration can change or go away in a later commit. The tool
  then runs the Boat and attachment steps of the delete. After them, it
  makes the database again.
- Reason: Wrangler records only the name of each applied migration. So it
  would not apply a changed migration again.

### The config

- The config keeps the bindings and the Durable Object migrations of the
  build.
- It changes the name, the routes, the variables, the D1 database, the
  attachment bucket, and `keep_vars`.
- The tool builds it from an allow list of keys and fixed paths.
- The tool fails with a clear error for an unknown binding and for a
  binding with `script_name`. It also fails for a Durable Object migration
  other than new classes.
- Reason: a branch must not bind the Durable Objects of another preview. A
  binding that the preview account cannot serve must fail early.
- A pull request that adds a binding adds it to the allow list too.

### The inputs of a preview

- `APP_ORIGIN`, `MARKETING_ORIGIN`, and `MACHINE_ORIGIN` are the origins
  of the three hostnames of the preview.
- `GITHUB_SETUP_RELAY_DOMAIN` is the preview zone, as
  [Install returns](relay.md#install-returns) says.
- `CONDUCTIVE_RUNNER_ARCHIVE_URL` and `CONDUCTIVE_RUNNER_ARCHIVE_SHA256`
  name the archive of the commit, on `runner.<zone>`.
- The models, the default choice, and the title model come from the
  `wrangler.jsonc` of the build. So a preview offers the models of its own
  commit.
- The other secrets and variables come from the GitHub environment
  `preview`, as
  [The GitHub environment](setup.md#the-github-environment-preview) says.

A preview leaves out these inputs of the live app:

- `PREVIEW_DOMAIN`. So the preview has no port previews.
- `RESEND_API_KEY` and `FEEDBACK_EMAIL`. So the preview sends no email.
- `CONDUCTIVE_DEPLOY_TOKEN_SHA256`. So the preview asks for no software
  image. Reason: each software image is one more Boat build and one more
  saved snapshot for each push.

A preview also sets no `SANDBOX_PROVIDER_ACCOUNTS`. The live app does not
set it either.

## The delete

A close or a merge of the pull request deletes its preview. The tool takes
these steps, in this order:

1. It removes `pr-<n>` from the registry. It reads the org IDs and the
   image build IDs from the preview database.
2. It deletes each Boat sandbox whose `org` label names one of those
   orgs. It deletes each saved snapshot of one of those builds.
3. It deletes each attachment object under `attachments/<org ID>/` of
   those orgs.
4. It deletes the Worker and its routes.
5. It deletes the D1 database.

A failed step stops the delete. So a re-run or the sweep finds the
resources again. Reason: the database is the only record of the Boat
resources and the attachments of a preview.

## The daily sweep

- The workflow runs the sweep each day, and on each manual run.
- The sweep lists the Workers and the D1 databases named
  `conductive-pr-<n>`. It runs the delete for each pull request that is
  closed.
- It also removes each registry entry that has no Worker.
- Reason: a missed close event must not leave resources that Boat and
  Cloudflare bill.

## Recovery by hand

- When a deploy fails, open the run that the comment links. Re-run it, or
  push a new commit.
- When a delete fails, re-run its run. Or start a manual run of the
  workflow, which runs the sweep.
- When the workflow cannot finish a delete, run the `delete` command of
  the preview tool. Give it a token of the preview account and the
  preview Boat key.
- Do not delete the D1 database of a preview by hand while its Boat
  resources or its attachments remain. Reason: the database is the only
  record of them.

Before a delete by hand, read the org IDs and the image build IDs of the
preview from its database. The checks of the attachments and of Boat need
them. After the delete, check that none of these remain in the Cloudflare
dashboard of the preview account:

- the Worker `conductive-pr-<n>`
- a route of a hostname of the preview, on the preview zone
- the D1 database `conductive-pr-<n>`
- a Durable Object namespace of the Worker
- the entry `pr-<n>` in the KV namespace of the registry
- an object under `attachments/<org ID>/` of an org of the preview, in the
  bucket `conductive-preview-attachments`

Also check that none of these remain in the Boat organization of the
preview Boat key:

- a sandbox whose `org` label names an org of the preview
- a saved snapshot of an image build of the preview
