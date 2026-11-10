# Deployment inputs

This guide lists the inputs of a deployment of the Conductive Worker: its
bindings, its public variables, and its secrets. It also says which
settings the Worker gives to each workspace sandbox.
[Architecture](architecture.md) describes the Worker and its hostnames.
The [Worker README](../worker/README.md#routes) lists the routes that the
Worker serves now. [Automatic deploys](automatic-deploys.md) says how each
push to `main` deploys the test deployment.
[Error reporting setup](deployment/error-reporting.md) gives the Better
Stack applications, the browser DSN, and the settings that upload the source
maps of a build.

Each input names the routes that read it. A route that does not read an
input works without it. Keep secrets out of the repository and out of
examples.

## How to set the inputs

- Declare the bindings in `wrangler.jsonc`. It already holds `DB`,
  `ASSETS`, `WORKSPACES`, `CHAT_ATTACHMENTS`, and `AI`.
- Set each public variable in the `vars` of `wrangler.jsonc`, or in the
  settings of the Worker in the Cloudflare dashboard.
- `wrangler.jsonc` sets `keep_vars`. So each deploy keeps the variables
  that the settings of the Worker hold and this file does not set.
  Values in `wrangler.jsonc` replace the corresponding dashboard values.
  Set a variable of one deployment in the dashboard, or with `--var` on
  its first deploy.
- `wrangler.jsonc` routes the hostnames of
  [Architecture](architecture.md#hostnames) and each hostname of the
  preview domain. A proxied wildcard DNS record of the preview domain must
  exist, so that each preview hostname reaches the Worker.
- `wrangler.jsonc` turns on Workers Logs, which keeps each warning of the
  Worker and of its Durable Objects. It removes the query string of each
  request URL from the logs, because a query string can hold a sign-in
  code, a preview credential, or the name of an attached file.
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
| `CHAT_ATTACHMENTS` | R2 bucket | Chat attachments: each upload, each message or create with files, the copy of the files when a turn starts, and their deletion | The bucket `conductive-chat-attachments`, as [The attachment bucket](#the-attachment-bucket) says. |
| `AI` | Workers AI | The title of a workspace that has no name | Workers AI on the Cloudflare account of the Worker, as [The title model](#the-title-model) says. |

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
| `CONDUCTIVE_TITLE_MODEL` | The title of a workspace that has no name | Optional. The Workers AI model ID of the title model, as [The title model](#the-title-model) says. Without it, the app shows "Untitled" until a name is set. It is not a secret. |
| `CONDUCTIVE_RUNNER_ARCHIVE_URL` | Image builds and refreshes | The public HTTPS URL of the runner archive. |
| `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` | Image builds and refreshes | The SHA-256 digest of that archive, as 64 hexadecimal characters. |
| `CONDUCTIVE_FRAME_SOURCES` | The Desktop tab, through the content security policy of each page of the app | Optional. The trusted HTTPS origins of the desktop streams, separated by spaces, as [Frame sources](#frame-sources) says. It is not a secret. |
| `OPERATOR_GITHUB_IDS` | The operator section and the suspension of users and orgs | Optional. The numeric GitHub user IDs of the operators, separated by commas. It is not a secret. Without it, each operator request gets `403 operator_required`, as the [operator area](../worker/operator/README.md#overview) says. |

- Without `MACHINE_ORIGIN`, the Worker refuses each request on the machine
  hostname. Each sandbox gets the value as `CONDUCTIVE_MACHINE_ORIGIN`. Both
  credential routes refuse every request without it, and a build cannot
  copy a repository.
- The two runner archive variables are public metadata of the archive. They
  hold no secret. [The runner archive](deployment/runner-archive.md) says
  how to supply them.

## Secrets

| Name | Needed by | Value |
| --- | --- | --- |
| `GITHUB_CLIENT_SECRET` | GitHub sign-in, and each refresh of a stored GitHub user token | The client secret of the GitHub App. |
| `BOAT_API_KEY` | Each call to Boat | An API key for the app's Boat organization, and the only Boat credential, as [The app's Boat account](#the-apps-boat-account) says. |
| `SESSION_SIGNING_KEY` | Sign-in, the sign-in of the Mac app, and every signed-in route | 32 random bytes, encoded as Base64. |
| `BOAT_KEY_ENCRYPTION_KEY` | Every route that stores or reads a stored secret | A separate 32 random bytes, encoded as Base64. |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub banner and Checks, the workspace refreshes of verified GitHub webhooks, and image builds and refreshes of an org that chose a repository | The private key of the GitHub App, as PEM. The PEM file from GitHub works as it is. A PKCS#8 PEM works too. |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhooks on the machine hostname | The webhook secret of the GitHub App. The Worker checks each delivery with it. Without it, each delivery gets `503 github_unavailable`. |
| `CONDUCTIVE_ERROR_TRACKING_DSN` | The error reports of the Worker and its Durable Objects | Optional. The DSN of the Worker's application in Better Stack Errors, as [The Worker DSN](deployment/error-reporting.md#the-worker-dsn) says. Without it, the Worker sends no report. A value that is not a Better Stack DSN turns the reports off, and the Worker logs a warning. |
| `RESEND_API_KEY` | The invitation emails of the member routes, and the approval emails of the operator section | An API key of Resend that can send from `mail.conductive.build`. The invitations come from `invites@mail.conductive.build`, so Resend must verify that domain. The approval emails come from the same sender. A key with sending access only is enough. An `APP_ORIGIN` on `localhost`, `127.0.0.1`, or `[::1]` needs no key. The Worker then writes each invitation link to its log. Without the key, an invite gets `502 invite_email_failed`. The invitation stays pending. An approval still gives app access, and the app tries its email again for 24 hours, as [The approval email](protocol/waitlist.md#the-approval-email) says. |

- `BOAT_KEY_ENCRYPTION_KEY` encrypts the agent logins, the GitHub user
  tokens, the env vars of each org, and the workspace tokens. It also
  encrypts the start logs, the credentials of each image source copy, and
  the terminal and preview credentials. It encrypts no Boat key. A new key cannot read the values
  that the old key encrypted.

## The attachment bucket

`CHAT_ATTACHMENTS` holds the files that users attach to chat messages, as
[Attachments](protocol/messages-and-attachments.md#attachments) says. One bucket
serves every org.

- Create the private bucket once, before the first deploy that declares
  the binding:
  `npx wrangler r2 bucket create conductive-chat-attachments --location weur`.
  The primary orchestrator does this at the next deployment.
- The location hint puts the bucket in Western Europe, near the production
  database and the workspace objects. A bucket keeps the location of its
  first creation.
- Without the bucket, `wrangler deploy` creates it with no location hint.
  So create it first.
- Keep public access off. Add no custom domain, no `r2.dev` address, and
  no CORS rule. Only the Worker reads and writes the bucket, as
  [Orgs and workspaces](protocol/isolation.md#orgs-and-workspaces)
  says.
- Add no lifecycle rule that deletes files by age. Such a rule would also
  delete the files of sent messages, which stay until the app deletes their
  workspace.
- The copy of each file into a sandbox also needs the `file.write` action
  on the Boat key, as [The app's Boat account](#the-apps-boat-account)
  says.
- Local development and the Worker tests use local R2 storage. They need no
  Cloudflare account and no bucket.

## The GitHub App

[The GitHub App](deployment/github-app.md) gives each setting of the GitHub
App on GitHub, with its callback, setup, and webhook addresses.

## Models

`CONDUCTIVE_MODELS` holds the models that the app offers.
The `vars` of [`wrangler.jsonc`](../wrangler.jsonc) hold this list and
`CONDUCTIVE_DEFAULT_CHOICE`, the app default. Edit them in the repository.
Each deploy publishes these values through the existing deploy workflow.
The Worker has no built-in list and no fallback model.

Keep both settings as JSON encoded in strings, because the model readers
expect text bindings. A `.dev.vars` value replaces its repository value
for local development.

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

`CONDUCTIVE_TITLE_MODEL` names the model that writes a title for a workspace
that has no name, as [Messages](protocol/messages-and-attachments.md#messages)
says. It is operator data. The Worker has no built-in title model.

- The value is the model ID of a text generation model of Workers AI, the
  model service of Cloudflare. The
  [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
  catalogue lists them. Choose a small, fast model.
- The Worker calls the model through the `AI` binding, on the Cloudflare
  account of the Worker. Each request counts toward the Workers AI use of
  that account.
- Without the binding or the variable, no automatic title is written.
  The Worker logs a warning when it would request a title.
  The Worker also logs a warning for a failed request.
  No route fails for a missing title.
- Workers AI runs only on the network of Cloudflare. `npm run dev` and
  `npm run preview` do not reach it. So they need no Cloudflare login, and
  no automatic title is written locally.

## The runner archive

[The runner archive](deployment/runner-archive.md) says how to supply the
two runner archive variables.

### The archive in each deploy

[The archive in each deploy](deployment/runner-archive.md#the-archive-in-each-deploy)
says how each deploy from `main` publishes the archive.

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

## Error reporting

The Worker sends its reports of unexpected failures to Better Stack Errors
only while `CONDUCTIVE_ERROR_TRACKING_DSN` holds a valid DSN. The web app
reads its own public DSN from the code, and the build reads the upload
settings of the source maps from the shell. No Worker variable sets them.
[Error reporting setup](deployment/error-reporting.md) gives each step.

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

`CONDUCTIVE_WORKSPACE_BRANCH` needs no deployment input either. A create, a
resume, and a disk retention restart give the workspace branch that the
Worker's record of the workspace names. The runner names that branch in
the [agent instructions](protocol/agent-instructions.md#the-branches).

## The app's Boat account

Every cloud computer of every org runs in the app's own Boat organization.
No org has a Boat key, and the Worker stores no Boat key in D1.

- `BOAT_API_KEY` is the only Boat credential. Set it as a Worker secret.
- `BOAT_ORG_ID` names that organization on every Boat call. It is not a
  secret. Set it in the `vars` of `wrangler.jsonc`, next to
  `MACHINE_ORIGIN`.
- Both are settings of the Worker only. The key never goes to the browser,
  into a sandbox, into a log, or into a saved snapshot, as
  [Access and security](protocol/isolation.md#the-apps-boat-key)
  says.
- [The app's Boat account](../worker/sandbox/README.md#the-apps-boat-account)
  says how to make the organization and the key.
- The key must also allow the `file.write` action. The Worker uses it to
  copy each attached file into a sandbox. The primary orchestrator
  supplies that action at the next deployment.
