# Deployment inputs

This guide lists the inputs of a deployment of the Conductive Worker: its
bindings, its public variables, and its secrets. It also says which
settings the Worker gives to each workspace sandbox.
[Architecture](architecture.md) describes the Worker and its hostnames.
The [Worker README](../worker/README.md#routes) lists the routes that the
Worker serves now. [Automatic deploys](automatic-deploys.md) says how each
push to `main` deploys the test deployment.

Each input names the routes that read it. A route that does not read an
input works without it. Keep real values out of the repository and out of
examples.

## How to set the inputs

- Declare the bindings in `wrangler.jsonc`. It already holds `DB`,
  `ASSETS`, `WORKSPACES`, and `AI`.
- Set each public variable in the `vars` of `wrangler.jsonc`, or in the
  settings of the Worker in the Cloudflare dashboard.
- `wrangler.jsonc` sets `keep_vars`. So each deploy keeps the variables
  that the settings of the Worker hold. Set a variable of one deployment
  there, or with `--var` on its first deploy.
- `wrangler.jsonc` routes the hostnames of
  [Architecture](architecture.md#hostnames) and each hostname of the
  preview domain. A proxied wildcard DNS record of the preview domain must
  exist, so that each preview hostname reaches the Worker.
- `wrangler.jsonc` turns on Workers Logs, which keeps each warning of the
  Worker and of its Durable Objects. It removes the query string of each
  request URL from the logs, because a query string can hold a sign-in
  code or a preview credential.
- Set each secret with `npx wrangler secret put <NAME>`. The command asks
  for the value. Never put a secret in `wrangler.jsonc` or in Git.
- The Worker reads each variable as text. Write a JSON value as one
  string. In the `vars` of `wrangler.jsonc`, a JSON array or object reaches
  the Worker as an object, and the Worker refuses it.
- Local development reads the same names from `.dev.vars`, as
  [Get started](../README.md#get-started) says.

## Bindings

| Name | Kind | Needed by | Value |
| --- | --- | --- | --- |
| `DB` | D1 database | Every route that reads users, orgs, or workspaces | The production database. Apply the migrations with `npx wrangler d1 migrations apply DB --remote`. |
| `ASSETS` | Static assets | The pages of the web app | The client build of `npm run build`. |
| `WORKSPACES` | Durable Object namespace | Chat, the events socket, the runner socket, Mac commands, the workspace routes, the workspace list, the read mark, the git credential route, and image builds | The `Workspace` class of `worker/workspace.ts`. |
| `AI` | Workers AI | The title of each new workspace | Workers AI on the Cloudflare account of the Worker, as [The title model](#the-title-model) says. |

## Public variables

| Name | Needed by | Value |
| --- | --- | --- |
| `APP_ORIGIN` | Every route of the app hostname | The `https://` origin of the app hostname, with no path. |
| `MARKETING_ORIGIN` | The marketing site | Optional. Without it, the Worker uses `https://conductive.build`. |
| `MACHINE_ORIGIN` | The machine hostname, and each workspace sandbox | The `https://` origin of the machine hostname. `wrangler.jsonc` sets it. |
| `PREVIEW_DOMAIN` | Port previews | The domain of the preview hostnames. `wrangler.jsonc` sets it. |
| `GITHUB_CLIENT_ID` | GitHub sign-in, each refresh of a stored GitHub user token, the GitHub banner and Checks, the workspace refreshes of verified GitHub webhooks, and image builds that copy a repository | The client ID of the GitHub App. |
| `GITHUB_APP_SLUG` | The links to the GitHub App: Install in Get started, Manage on GitHub in the account, and Manage access of the repository lists | Optional. The slug of the GitHub App, as in `https://github.com/apps/<slug>`. Without it, or with a value that is not a slug, the links use `conductive`, and the Worker logs a warning for a wrong value. It is not a secret. |
| `BOAT_ORG_ID` | Each call to Boat | The ID of the app's Boat organization, as [The app's Boat account](#the-apps-boat-account) says. It is not a secret. |
| `CONDUCTIVE_MODELS` | `GET /api/models` and `GET /v1/tools/models` | The JSON model list, as [Models](#models) says. |
| `CONDUCTIVE_DEFAULT_CHOICE` | `GET /api/account`, `POST /v1/tools/workspaces`, and `GET /v1/tools/models`, for a user with no saved default | The JSON default choice, as [Models](#models) says. |
| `CONDUCTIVE_TITLE_MODEL` | The title of each new workspace | Optional. The Workers AI model ID of the title model, as [The title model](#the-title-model) says. Without it, a new workspace keeps no name and shows "Untitled". It is not a secret. |
| `CONDUCTIVE_RUNNER_ARCHIVE_URL` | Image builds and refreshes | The public HTTPS URL of the runner archive. |
| `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` | Image builds and refreshes | The SHA-256 digest of that archive, as 64 hexadecimal characters. |
| `CONDUCTIVE_FRAME_SOURCES` | The Desktop tab, through the content security policy of each page of the app | Optional. The trusted HTTPS origins of the desktop streams, separated by spaces, as [Frame sources](#frame-sources) says. It is not a secret. |
| `OPERATOR_GITHUB_IDS` | The operator section and the suspension of users and orgs | Optional. The numeric GitHub user IDs of the operators, separated by commas. It is not a secret. Without it, each operator request gets `403 operator_required`, as the [operator area](../worker/operator/README.md#overview) says. |

- Without `MACHINE_ORIGIN`, the Worker refuses each request on the machine
  hostname. Each sandbox gets the value as `CONDUCTIVE_MACHINE_ORIGIN`. Both
  credential routes refuse every request without it, and a build cannot
  copy a repository.
- The two runner archive variables are public metadata of the archive. They
  hold no secret. [The runner archive](#the-runner-archive) below says how
  to supply them.

## Secrets

| Name | Needed by | Value |
| --- | --- | --- |
| `GITHUB_CLIENT_SECRET` | GitHub sign-in, and each refresh of a stored GitHub user token | The client secret of the GitHub App. |
| `BOAT_API_KEY` | Each call to Boat | An API key for the app's Boat organization, and the only Boat credential, as [The app's Boat account](#the-apps-boat-account) says. |
| `SESSION_SIGNING_KEY` | Sign-in, the sign-in of the Mac app, and every signed-in route | 32 random bytes, encoded as Base64. |
| `BOAT_KEY_ENCRYPTION_KEY` | Every route that stores or reads a stored secret | A separate 32 random bytes, encoded as Base64. |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub banner and Checks, the workspace refreshes of verified GitHub webhooks, and image builds and refreshes of an org that chose a repository | The private key of the GitHub App, as PEM. The PEM file from GitHub works as it is. A PKCS#8 PEM works too. |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhooks on the machine hostname | The webhook secret of the GitHub App. The Worker checks each delivery with it. Without it, each delivery gets `503 github_unavailable`. |
| `RESEND_API_KEY` | The invitation emails of the member routes, and the approval emails of the operator section | An API key of Resend that can send from `mail.conductive.build`. The invitations come from `invites@mail.conductive.build`, so Resend must verify that domain. The approval emails come from the same sender. A key with sending access only is enough. An `APP_ORIGIN` on `localhost`, `127.0.0.1`, or `[::1]` needs no key. The Worker then writes each invitation link to its log. Without the key, an invite gets `502 invite_email_failed`. The invitation stays pending. An approval still gives app access, and the app tries its email again for 24 hours, as [The approval email](protocol/waitlist.md#the-approval-email) says. |

- `BOAT_KEY_ENCRYPTION_KEY` encrypts the agent logins, the GitHub user
  tokens, the env vars of each org, and the workspace tokens. It also
  encrypts the start logs, the credentials of each image source copy, and
  the terminal and preview credentials. It encrypts no Boat key. A new key cannot read the values
  that the old key encrypted.

## The GitHub App

Set these values on GitHub, in the settings of the GitHub App. Replace
`<APP_ORIGIN>` and `<MACHINE_ORIGIN>` with the values of the variables
above.

| Setting | Value |
| --- | --- |
| Callback URL | `<APP_ORIGIN>/api/auth/github/callback`. Add one for each app origin that signs in, such as `http://127.0.0.1:5173/api/auth/github/callback` for `npm run dev`. |
| Request user authorization (OAuth) during installation | Off. When it is on, GitHub turns off the Setup URL and sends each install to the sign-in callback, which refuses it. |
| Setup URL | `<APP_ORIGIN>/github/setup`, such as `https://app.conductive.build/github/setup`. GitHub sends the user there after an install. |
| Redirect on update | On, so that a change of an install, such as a new repository, returns to the app too. |
| Webhook URL | `<MACHINE_ORIGIN>/v1/github/webhooks`, as [The GitHub App](protocol/github-banner.md#the-github-app) says. |
| Webhook secret | The value of `GITHUB_WEBHOOK_SECRET`. |

- Subscribe to the webhook events that the
  [GitHub banner backend](../worker/github/README.md#server-integration)
  lists.
- A GitHub App has only one Setup URL. So an install from `npm run dev`
  returns to the deployed app, not to the local app.

## Models

`CONDUCTIVE_MODELS` holds the models that the app offers. It is operator
data. The Worker has no built-in list and no fallback model.

- The value is a non-empty JSON array. Each entry is an object with these
  fields:
  - `agent`: `claude` or `codex`.
  - `model`: the model ID that the agent gets, as a non-empty string.
  - `label`: the name that the app shows, as a non-empty string.
  - `efforts`: a non-empty array. Each effort is `none`, `low`, `medium`,
    `high`, `xhigh`, or `max`.
- `CONDUCTIVE_DEFAULT_CHOICE` is one JSON object with `agent`, `model`, and
  `effort`. The saved default of a user comes before it.
- These routes read the two variables:
  - `GET /api/models` of the app reads `CONDUCTIVE_MODELS`. A missing or
    invalid value gives `503 models_unavailable`.
  - `GET /api/account` of the app reads `CONDUCTIVE_DEFAULT_CHOICE` for a
    user with no saved default. A missing or invalid value then gives
    `503 default_model_unavailable`.
  - The tool create route `POST /v1/tools/workspaces` reads
    `CONDUCTIVE_DEFAULT_CHOICE` when the call names no model or no effort
    and the owner of the calling workspace has no saved default. A missing
    or invalid value then gives `503 default_model_unavailable`.
  - The tool model list `GET /v1/tools/models` reads both variables. A
    missing or invalid `CONDUCTIVE_MODELS` gives `503 models_unavailable`.
    When the owner of the calling workspace has no saved default, a
    missing or invalid `CONDUCTIVE_DEFAULT_CHOICE` gives an empty default
    choice, not an error.
    [Agent tools](protocol/agent-tools.md#models) states the list.
- No other route reads these two variables.
- The web app reads `GET /api/models` and `GET /api/account` when it
  starts. So it does not start without a valid model list. A user with no
  saved default also needs a valid default choice.

The shape of the two values, with placeholders in place of real values:

```json
[{ "agent": "claude", "model": "<model ID>", "label": "<label>", "efforts": ["low", "medium", "high"] }]
```

```json
{ "agent": "claude", "model": "<model ID>", "effort": "medium" }
```

## The title model

`CONDUCTIVE_TITLE_MODEL` names the model that writes the title of each new
workspace, as [Messages](protocol/chat-and-events.md#messages) says. It is
operator data. The Worker has no built-in title model.

- The value is the model ID of a text generation model of Workers AI, the
  model service of Cloudflare. The
  [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
  catalogue lists them. Choose a small, fast model.
- The Worker calls the model through the `AI` binding, on the Cloudflare
  account of the Worker. Each request counts toward the Workers AI use of
  that account.
- Without the binding or the variable, a new workspace keeps no name and
  shows "Untitled", and the Worker logs a warning. The Worker also logs a warning for
  a failed request. No route fails for a missing title.
- Workers AI runs only on the network of Cloudflare. `npm run dev` and
  `npm run preview` do not reach it. So they need no Cloudflare login, and
  a new workspace keeps no name there.

## The runner archive

Each new image build installs the runner archive into the org image. A
refresh keeps the installed runner and updates the repositories.
Publish the runner archive from the same commit as the Worker before any image build.
[The runner archive](../image/README.md#the-runner-archive) says how to make
and publish it.

Each deploy from `main` publishes the archive of its commit when the
archive is new. It sets both variables to that archive, as
[The archive in each deploy](#the-archive-in-each-deploy) says. To supply
an archive by hand:

1. Package the archive, as
   [Developer scripts](../image/developer-scripts.md#package-the-archive)
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
- Only a build or a refresh needs the two values. A workspace read, a
  history read, and the start of the app need no archive setting.
- Image builds and refreshes run through the Worker routes that the
  [Worker README](../worker/README.md#routes) lists.
- The archive holds no Node. Each build downloads one pinned Node release
  from `nodejs.org` into the image, as
  [The private Node runtime](../image/runtime.md) says. That download needs
  no deployment input.

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

## Frame sources

`CONDUCTIVE_FRAME_SOURCES` lists the origins that the pages of the app can
show in a frame, in addition to the port previews. The Desktop tab shows
the desktop stream of a sandbox in such a frame.

- The value is a list of HTTPS origins, separated by spaces. An origin is
  `https://`, a host, and an optional port, with no path. A host can start
  with `*.` to cover each subdomain.
- List the desktop stream hosts as `https://*.on.boat.dev`, the domain of
  Boat's sandbox hosts. Boat's [desktop guide](https://docs.boat.dev/desktop-streaming/urls-and-security)
  shows the stream host only as `<sandbox-desktop-host>`, and Boat
  generates it for each running sandbox. A list of exact hosts was
  rejected, because it fails for each new workspace.
- The wildcard also lets the pages of the app frame any other page on a
  Boat sandbox host, also a page of another Boat customer. To use this, an
  attacker first needs a way to put HTML into a page of the app.
- A desktop URL carries its token in the fragment. Put no token or other
  secret in the value.
- The Worker gives each page of the app a content security policy. Its
  frame sources are the page's own origin, `https://*.<PREVIEW_DOMAIN>`,
  and each origin of the value. The Worker leaves out each entry that is
  not an HTTPS origin, such as an `http://` address or an address with a
  path.
- Without the variable, a page frames only its own origin and the port
  previews. The Desktop tab then cannot show a stream.
- The Mac build reads its own `CONDUCTIVE_FRAME_SOURCES`, as the
  [Mac app README](../desktop/README.md#development) says. It does not add
  the preview domain itself. So give the Worker and the Mac build the same
  value: `https://*.<PREVIEW_DOMAIN> https://*.on.boat.dev`. The Worker
  lists the preview origin only once.

## Settings of each workspace sandbox

The Worker gives each workspace sandbox its settings at each start, as
[Start in a workspace](../image/README.md#start-in-a-workspace) says. One
of them comes from this guide: `CONDUCTIVE_MACHINE_ORIGIN` is
`MACHINE_ORIGIN`.

The computer tools need no deployment input. Boat writes the entry of the
`computer` server into each sandbox at its start. It names a local server
with no URL and no credential, and the runner reads it, as
[What it does](../runner/README.md#what-it-does) says.

`CONDUCTIVE_DEFAULT_BRANCH` needs no deployment input. A create or a resume
gives the default branch of the repository of the workspace, from its
queued start. A disk retention restart gives the current default branch of
that repository.

## The app's Boat account

Every cloud computer of every org runs in the app's own Boat organization.
No org has a Boat key, and the Worker stores no Boat key in D1.

- `BOAT_API_KEY` is the only Boat credential. Set it as a Worker secret.
- `BOAT_ORG_ID` names that organization on every Boat call. It is not a
  secret. Set it in the `vars` of `wrangler.jsonc`, next to
  `MACHINE_ORIGIN`.
- Both are settings of the Worker only. The key never goes to the browser,
  into a sandbox, into a log, or into a saved snapshot, as
  [Access and security](protocol/access-and-security.md#the-apps-boat-key)
  says.
- [The app's Boat account](../worker/sandbox/README.md#the-apps-boat-account)
  says how to make the organization and the key.
