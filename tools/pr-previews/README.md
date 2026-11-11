# Pull request preview tool

This Node 24 tool configures, deploys, deletes, and sweeps pull request
previews. It also maintains their GitHub comments. It uses the built app
and the preview account's settings. It needs no runtime npm package.
Infrastructure commands use Wrangler and the AWS CLI.

## Commands

Run commands from the repository root with Node 24 from `.nvmrc`.

```sh
npx vite build
node tools/pr-previews/main.ts config \
  --pr 123 \
  --database-id 00000000-0000-4000-8000-000000000123 \
  --runner-url https://runner.preview.example/runner-test.tar.gz \
  --runner-sha256 "$RUNNER_SHA256"

node tools/pr-previews/main.ts deploy --pr 123 \
  --build-folder "$RUNNER_TEMP/preview-build" --wrangler "$TRUSTED_WRANGLER" \
  --sha "$GITHUB_SHA" --runner-url "$RUNNER_URL" \
  --runner-sha256 "$RUNNER_SHA256" --runner-archive "$RUNNER_ARCHIVE"
node tools/pr-previews/main.ts delete --pr 123 --wrangler "$TRUSTED_WRANGLER"
node tools/pr-previews/main.ts sweep --wrangler "$TRUSTED_WRANGLER"
node tools/pr-previews/main.ts comment --pr 123 --state live --sha "$GITHUB_SHA" \
  --data-reset
```

Set `RUNNER_SHA256` to the archive's SHA-256 digest before this command.
`config` copies the archive URL and digest into the Worker variables.
It does not upload the archive. `deploy` uploads a missing archive.
Omit `--runner-archive` when no local archive was downloaded.

`config` reads `dist/conductive/wrangler.json` by default. The Cloudflare
Vite plugin writes that file. `.wrangler/deploy/config.json` points to it.
Use `--build-config PATH` to read an extracted build in another folder.

The command writes `wrangler.pr-123.json` beside the built config and
prints its absolute path to stdout. This keeps `index.js`, `../client`,
and `../../migrations` relative to the same folder. Keep `dist/` and
`migrations/` in that layout when you extract a build.

`node tools/pr-previews/main.ts --help` prints the command syntax.
The command returns exit status 1 for invalid inputs or an incomplete
setup. Errors name setting names and config paths, without secret values.
`TRUSTED_WRANGLER` must name the binary installed from `main`'s lockfile.
Give `deploy` the extracted artifact folder under the runner's temporary
folder. That folder contains `dist/` and `migrations/`, without a source
checkout or its `.env` files. `delete` and `sweep` create private working
folders under `RUNNER_TEMP`, or the OS temporary folder, and remove them.

## Inputs

| Input | Source | Use |
| --- | --- | --- |
| Pull request number | `--pr` | Positive safe integer. Names the Worker, database, and hosts. |
| Database ID | `--database-id` | ID of the preview's existing D1 database. |
| Runner archive URL | `--runner-url` | Value of `CONDUCTIVE_RUNNER_ARCHIVE_URL`. |
| Runner archive digest | `--runner-sha256` | Value of `CONDUCTIVE_RUNNER_ARCHIVE_SHA256`. |
| Built config path | `--build-config` | Optional path to the built Wrangler JSON. |
| Extracted build | `deploy --build-folder` | Folder with `dist/` and `migrations/`. |
| Trusted Wrangler | `--wrangler` | Required binary path for deploy, delete, and sweep. |
| Commit | `--sha` | Hexadecimal commit SHA for deploy and comment. Tags use its first seven characters. |
| Local runner | `deploy --runner-archive` | Required only when the bucket lacks the archive. |
| Comment state | `comment --state` | `deploying`, `live`, `failed`, or `deleted`. |
| Reset note | `comment --data-reset` | Include the database reset note. |

The settings check reads these required environment variables:

| Purpose | Required environment values |
| --- | --- |
| Preview account | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PREVIEW_ZONE` |
| Worker variables | `GITHUB_CLIENT_ID`, `GITHUB_APP_SLUG`, `BOAT_ORG_ID`, `OPERATOR_GITHUB_IDS` |
| Worker secrets | `GITHUB_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `SESSION_SIGNING_KEY`, `BOAT_KEY_ENCRYPTION_KEY`, `BOAT_API_KEY` |

`CONDUCTIVE_FRAME_SOURCES` is optional. A blank setting counts as absent.
The check preserves each configured value, including private key newlines.
With no required setting, the command warns on stderr, writes nothing,
and succeeds. With only some settings, it fails and names every missing
setting. It never prints a configured secret value.
`config`, `deploy`, `delete`, and `sweep` use this check.
`sweep` also requires `GITHUB_REPOSITORY` and `GITHUB_TOKEN`.
`comment` needs only `PREVIEW_ZONE`, `GITHUB_REPOSITORY`, `GITHUB_TOKEN`,
`GITHUB_SERVER_URL`, and `GITHUB_RUN_ID`. It skips when the zone is absent.

`PREVIEW_ZONE` must be a lower-case DNS name with at least two labels.
Each label has at most 63 characters. The name has at most 253 characters.
Labels allow letters, digits, and interior hyphens. A scheme, port, path,
wildcard, space, or trailing dot is invalid.

For pull request 123 in `preview.example`, both resource names are
`conductive-pr-123`. The hosts are `pr-123.preview.example`,
`pr-123-app.preview.example`, and `pr-123-api.preview.example`. Their
origins use HTTPS. The config pins `account_id` to the preview account.

## Operations

`deploy` finds or creates D1 in Western Europe. It checks migration hashes
in `conductive_preview_migrations`. A changed or removed recorded migration
triggers resource cleanup, database deletion, and database recreation.
It writes the config, applies migrations, and records their hashes.
If migration apply fails partway, it records only files that D1 applied.
If that bookkeeping fails, rerun the same commit before changing migrations.

It then uploads or reuses the runner through S3 and checks the public
archive size. It deploys with a temporary secrets file and removes that
file in all cases. It waits up to two minutes for app health, then adds
the relay entry. A missing registry warns and does not fail the deploy.

The command prints both URLs and the reset status. When `GITHUB_OUTPUT`
is set, it appends `marketing_url`, `app_url`, and `data_reset`.
Deployment failures retain these outputs, including a completed reset.
The registry key is `pr-<n>`. Its JSON value has `number`, `marketingOrigin`,
`appOrigin`, and `machineOrigin`. The relay deploy creates its namespace.

`delete` removes the registry key first. It reads org IDs and every
non-null `snapshot_name` column in the current database schema. It also
derives a snapshot name for each image build. It deletes labeled Boat
sandboxes, saved snapshots, attachment prefixes, the Worker, its routes,
and D1, in that order. A 404 counts as done. A failed step stops cleanup.
Empty databases from failed first deploys need no app tables to be removed.

`sweep` checks the union of preview Workers, D1 databases, and registry
keys. It deletes closed or missing pull requests and removes registry
keys without a Worker. A GitHub error other than 404 stops the sweep.

`comment` pages through issue comments and edits the first bot comment
with `<!-- conductive-pr-preview -->`, or creates it. It includes both
links, the commit, the run URL, and the requested reset note.
See [Life of a preview](../../docs/pr-previews/life.md) for the workflow.

## Config allow list

The writer accepts the keys of the current Vite build output. It drops
build metadata and empty unsupported binding groups. It constructs the
preview config from approved fields. It does not copy the whole input.

The approved resource bindings are:

| Config key | Binding | Preview value |
| --- | --- | --- |
| `assets` | `ASSETS` | Built assets at `../client`, with the build's request handling. |
| `durable_objects` | `WORKSPACES` | Local class `Workspace`. No `script_name`. |
| `d1_databases` | `DB` | The preview database name and supplied ID. Migrations stay at `../../migrations`. |
| `r2_buckets` | `CHAT_ATTACHMENTS` | `conductive-preview-attachments`. |
| `ai` | `AI` | Workers AI of the preview account. |
| `version_metadata` | `CF_VERSION_METADATA` | The preview Worker version. |

`migrations` permits only `tag`, `new_classes`, and `new_sqlite_classes`.
The writer rejects transfers, renames, deletions, and other migration keys.
It reports all detected problems in one error.

Other accepted build keys have these rules:

- Keep `compatibility_date`, `compatibility_flags`, `jsx_factory`,
  `jsx_fragment`, `rules`, `triggers`, `upload_source_maps`, and
  `observability`. Module rules permit only `ESModule` and the globs
  `**/*.js` and `**/*.mjs`.
- Require `main` to be `index.js` and `no_bundle` to be true.
- Replace `name`, `routes`, `vars`, `keep_vars`, `workers_dev`, and
  `preview_urls`. The last three values are false.
- Drop `configPath`, `userConfigPath`, `topLevelName`,
  `definedEnvironments`, `python_modules`, and `dev`.
- Permit `exports` and `cloudchamber` only when empty.
- Permit `queues.producers`, `queues.consumers`, and `logfwdr.bindings`
  only when empty.
- Permit these array keys only when empty: `workflows`, `kv_namespaces`,
  `send_email`, `connect`, `vectorize`, `ai_search_namespaces`, `ai_search`,
  `agent_memory`, `hyperdrive`, `services`, `analytics_engine_datasets`,
  `dispatch_namespaces`, `mtls_certificates`, `pipelines`, `k2`,
  `secrets_store_secrets`, `artifacts`, `unsafe_hello_world`, `flagship`,
  `worker_loaders`, `ratelimits`, `vpc_services`, and `vpc_networks`.

A pull request that adds a binding must also update the allow list, its
preview mapping, and its tests. A Wrangler update that adds a build key
must also update the allow list. The tool rejects an unknown key.

The writer keeps only the build's `CONDUCTIVE_MODELS`,
`CONDUCTIVE_DEFAULT_CHOICE`, and `CONDUCTIVE_TITLE_MODEL` variables. It
sets the preview origins, relay domain, public settings, and runner
inputs. It sets no `PREVIEW_DOMAIN`, `CONDUCTIVE_DEPLOY_TOKEN_SHA256`, or
`FEEDBACK_EMAIL`. It copies no secret from the build's variables.

## Secrets files

`writeSecretsFile` accepts the six Worker secrets from the settings check.
It writes JSON for Wrangler's `--secrets-file` option. It excludes the
Cloudflare API token. It returns the file path and an async `cleanup`
function. Call `cleanup` in a `finally` block after the Wrangler command.

Each file lives in a new private folder under `RUNNER_TEMP`, or under the
OS temporary folder when `RUNNER_TEMP` is absent. Its file mode is 0600.
The writer removes its folder if a write fails. The `config` command
creates no secrets file.

## Development

```sh
npm run test -- tools/pr-previews
npm run typecheck
npm run lint
npm run format:check
npm run file-length:check
npm run exports:check
```

The root TypeScript project includes this folder's NodeNext project.
It checks the tool and its tests. Tests use fake file operations and
dummy settings. They read no workflow or documentation file.

### Key code

- [main.ts](main.ts): Node process entry and output handling.
- [cli.ts](cli.ts): command dispatch and config arguments.
- [names.ts](names.ts): input validation and preview resource names.
- [settings.ts](settings.ts): setup checks and separated public and secret settings.
- [config.ts](config.ts): preview config construction and JSON writing.
- [build-config.ts](build-config.ts): build key allow list and retained metadata.
- [bindings.ts](bindings.ts): supported resources and safe class migrations.
- [config-values.ts](config-values.ts): parsers for untrusted build values.
- [secrets.ts](secrets.ts): private temporary secrets files and cleanup.
- [commands.ts](commands.ts) and [command-options.ts](command-options.ts): operation dispatch and flags.
- [deploy.ts](deploy.ts): ordered deployment and reset reporting.
- [migration-history.ts](migration-history.ts) and [apply-migrations.ts](apply-migrations.ts): hashes and partial migration recovery.
- [deployment-output.ts](deployment-output.ts): public outputs for successful and failed deploys.
- [delete.ts](delete.ts) and [cleanup.ts](cleanup.ts): ordered resource cleanup.
- [resources.ts](resources.ts): schema-based snapshot discovery.
- [boat.ts](boat.ts): paginated sandbox and snapshot deletion.
- [storage.ts](storage.ts) and [runner-archive.ts](runner-archive.ts): S3 credentials, uploads, size checks, and attachment removal.
- [workers.ts](workers.ts): Worker and route deletion.
- [registry.ts](registry.ts): namespace lookup and preview entries.
- [sweep.ts](sweep.ts): pull request checks and orphan removal.
- [github.ts](github.ts) and [comment.ts](comment.ts): GitHub replies and comment updates.
- [health.ts](health.ts): bounded app health polling.
- [operations.ts](operations.ts) and [runtime.ts](runtime.ts): injected command, HTTP, and clock boundaries.
