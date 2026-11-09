# Automatic deploys

Each push to `main` deploys the test deployment at `conductive.build`. The
GitHub Actions workflow `Deploy`, in `.github/workflows/deploy.yml`, runs
the deploy. This guide gives its triggers, its GitHub settings, its
Cloudflare token, and its steps. It also says how to recover from a failed
deploy. [Deployment inputs](deployment.md) lists the bindings, the
variables, and the secrets of the Worker.

## When it runs

The workflow runs on each push to `main`. You can also start a run from
`main` with the Run workflow button in GitHub Actions. Start one to deploy
again, for example after you change a Cloudflare setting. The workflow
does not wait for CI. So a commit on `main` goes live also when its CI run
fails. [CI](../AGENTS.md#ci) says how a commit reaches `main`.

- Deploys run one at a time. A new push never cancels a running deploy.
- GitHub keeps only the newest waiting run. So a burst of merges deploys
  the newest commit.
- Each run first checks that its commit is still the head of `main`.
  GitHub does not keep runs in push order. So a run of an older commit,
  also a re-run, deploys nothing. It starts a new run on `main` instead,
  and that run deploys the head with the head's own steps.
- When a run cannot look up the head of `main`, it warns and deploys its
  own commit.
- A re-run of only some jobs, such as Re-run failed jobs, also deploys
  nothing. It starts a new run on `main`, because a re-run keeps the
  outputs of the jobs that passed. Re-run all jobs retries the deploy in
  the same run.
- GitHub sends a failure alert to the person who starts a run. A run that
  the workflow starts has no such person. So after a re-run, look at the
  new run in GitHub Actions.

## GitHub settings

The deploy job uses the GitHub environment `production`. A GitHub
environment is a deploy target in the settings of the repository. It holds
its own secrets and variables.

| Name | Kind | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret of the environment | The Cloudflare API token, as [The deploy token](#the-deploy-token) says. |
| `CLOUDFLARE_ACCOUNT_ID` | Variable of the environment | The ID of the Cloudflare account of the Worker. It is not a secret. |

- The deployment branch rule of `production` allows only `main`. So a
  workflow run on another branch cannot use the token.
- Create the environment with that rule before the first run. GitHub
  creates a missing environment with no rule at the first run that names
  it.
- When neither setting exists, the run warns and deploys nothing. The run
  succeeds. So you can add the secret and the variable after you create
  the environment.
- The settings check runs in its own job, which makes no deployment
  record. So the history of `production` lists only the runs that
  deployed.
- When only one of the two settings exists, the run fails.

## The deploy token

`CLOUDFLARE_API_TOKEN` needs these permissions. A user token and an
account-owned token both work.

| Permission | Scope | Resource | What uses it |
| --- | --- | --- | --- |
| Workers Scripts Edit | Account | The account of the Worker | `wrangler deploy`: the Worker, its assets, its cron trigger, its URL settings, and its custom domains |
| D1 Edit | Account | The account of the Worker | The D1 migrations |
| Workers R2 Storage Edit | Account | The account of the Worker | The upload of the runner archive |
| Workers Routes Edit | Zone | `conductive.page` | The route `*.conductive.page/*` |
| Zone Read | Zone | `conductive.page` | Wrangler finds the zone of that route by its name |

- With Workers Routes Edit on all zones of the account, Wrangler sets the
  route in one call and needs no Zone Read.
- The zone `conductive.build` needs no permission. Its custom domains use
  Workers Scripts Edit.
- The deploy needs no user permission, because the run gives Wrangler the
  account ID.
- The template "Edit Cloudflare Workers" holds more permissions, such as
  Workers KV Storage and Workers Tail, but no Zone Read. With the template
  and specific zones, add Zone Read on `conductive.page`.
- A missing permission makes the run fail. The Wrangler error names the
  Cloudflare API request that failed.

Workers R2 Storage Edit also lets the token write to every other bucket of
the account. To limit R2 to the bucket `conductive-runner`, make the token
through the API. Give it the same permissions, with two changes:

- Leave out the account group `Workers R2 Storage Write`.
- Add the bucket group `Workers R2 Storage Bucket Item Write` on the bucket
  `conductive-runner`.

The S3 key pair of the upload then reaches only that bucket.
[The archive in each deploy](deployment.md#the-archive-in-each-deploy)
describes that upload. The API names each Edit permission with Write, as
in `D1 Write`.

## Steps of a run

Each run takes these steps, in this order:

1. It installs the packages with `npm ci` and `npm ci --prefix runner`.
2. It builds the app with `npm run build`, which also runs the typecheck.
3. It packages the runner archive.
4. It publishes the archive when the archive is new, as
   [The archive in each deploy](deployment.md#the-archive-in-each-deploy)
   says.
5. It applies the D1 migrations with
   `npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc`.
6. It deploys the Worker with `npx wrangler deploy`. Two `--var` options
   set the runner variables to the archive.
7. It checks that `https://app.conductive.build/api/health` answers
   `{"status":"ok"}`. When that answer does not come within about a
   minute, the run fails.

A failed step stops the run. So a build error stops the run before it
changes anything live.

- The `--var` options set only `CONDUCTIVE_RUNNER_ARCHIVE_URL` and
  `CONDUCTIVE_RUNNER_ARCHIVE_SHA256`. Every other variable stays on the
  Worker, because `wrangler.jsonc` sets `keep_vars`. The deploy changes no
  secret.
- The deploy tags the new Worker version with the short commit hash. So
  the Cloudflare dashboard shows which commit is live.
- The summary of each run names the commit, the archive URL, and whether
  the run uploaded the archive.
- The health route reads no D1 data and gives no version. So the check
  proves only that the Worker answers. Wrangler names the deployed version
  in the log of the run.

## When a deploy fails

A failed run does not roll back.

- Between the migrations and the Worker upload, the old Worker runs on the
  new schema. A failed upload leaves the old Worker on the new schema until
  the next deploy.
- [`npx wrangler rollback`](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
  restores an earlier version of the Worker. Without a version ID, it
  restores the version before the newest one.
- A rollback does not undo a D1 migration. It cannot go back across a
  Durable Object migration.
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
  restores the database to an earlier minute. Run
  `npx wrangler d1 time-travel restore DB --timestamp=<time>`, with a Unix
  timestamp or an RFC 3339 time.

## Deploys from other branches

Only `main` deploys. A Worker deploy by hand from another branch stays live
only until the next merge. A migration, a D1 write, or a secret change by
hand stays after that merge.
