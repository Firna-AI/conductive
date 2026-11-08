# Deployment inputs

This guide lists the inputs of a deployment of the Conductive Worker: its
bindings, its public variables, and its secrets. It also says which
settings the Worker gives to each workspace sandbox.
[Architecture](architecture.md) describes the Worker and its hostnames.
The [Worker README](../worker/README.md#routes) lists the routes that the
Worker serves now.

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
| `GITHUB_APP_SLUG` | The Install link of Get started | Optional. The slug of the GitHub App, as in `https://github.com/apps/<slug>`. Without it, or with a value that is not a slug, the link uses `conductive`, and the Worker logs a warning for a wrong value. It is not a secret. |
| `BOAT_ORG_ID` | Each call to Boat | The ID of the app's Boat organization, as [The app's Boat account](#the-apps-boat-account) says. It is not a secret. |
| `CONDUCTIVE_MODELS` | `GET /api/models` | The JSON model list, as [Models](#models) says. |
| `CONDUCTIVE_DEFAULT_CHOICE` | `GET /api/account`, for a user with no saved default | The JSON default choice, as [Models](#models) says. |
| `CONDUCTIVE_TITLE_MODEL` | The title of each new workspace | Optional. The Workers AI model ID of the title model, as [The title model](#the-title-model) says. Without it, a new workspace keeps its city name. It is not a secret. |
| `CONDUCTIVE_RUNNER_ARCHIVE_URL` | Image builds and refreshes | The public HTTPS URL of the runner archive. |
| `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` | Image builds and refreshes | The SHA-256 digest of that archive, as 64 hexadecimal characters. |
| `CONDUCTIVE_FRAME_SOURCES` | The Desktop tab, through the content security policy of each page of the app | Optional. The trusted HTTPS origins of the desktop streams, separated by spaces, as [Frame sources](#frame-sources) says. It is not a secret. |
| `OPERATOR_GITHUB_IDS` | The operator's suspension of a user | Optional. The numeric GitHub user IDs of the operators, separated by commas. It is not a secret. Without it, each operator request gets `403 operator_required`, as the [operator area](../worker/operator/README.md#suspend-a-user) says. |

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
| `RESEND_API_KEY` | The invitation emails of the member routes | An API key of Resend. An `APP_ORIGIN` on `localhost`, `127.0.0.1`, or `[::1]` needs no key. The Worker then writes each invitation link to its log. Without the key, an invite gets `502 invite_email_failed`. The invitation stays pending. |

- `BOAT_KEY_ENCRYPTION_KEY` encrypts the agent logins, the GitHub user
  tokens, the env vars of each org, and the workspace tokens. It also
  encrypts the start logs, the credentials of each image source copy, and
  the terminal and preview credentials. It encrypts no Boat key. A new key cannot read the values
  that the old key encrypted.

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
- A missing or invalid `CONDUCTIVE_MODELS` gives
  `503 models_unavailable` on `GET /api/models` only.
- For a user with no saved default, a missing or invalid
  `CONDUCTIVE_DEFAULT_CHOICE` gives `503 default_model_unavailable` on
  `GET /api/account` only.
- No other route reads these two variables.
- The web app reads both routes when it starts. So it does not start
  without a valid model list. A user with no saved default also needs a
  valid default choice.

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
- Without the binding or the variable, a new workspace keeps its city
  name, and the Worker logs a warning. The Worker also logs a warning for
  a failed request. No route fails for a missing title.
- Workers AI runs only on the network of Cloudflare. `npm run dev` and
  `npm run preview` do not reach it. So they need no Cloudflare login, and
  a new workspace keeps its city name there.

## The runner archive

Each new image build installs the runner archive into the org image. A
refresh keeps the installed runner and updates the repositories.
[The runner archive](../image/README.md#the-runner-archive) says how to make
and publish it.

- Publish the exact archive at its public HTTPS URL first.
- Set `CONDUCTIVE_RUNNER_ARCHIVE_URL` to that URL. It can hold no user
  name, password, query, or fragment.
- Set `CONDUCTIVE_RUNNER_ARCHIVE_SHA256` to the digest of the same file.
  The Worker accepts upper or lower case.
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

## Frame sources

`CONDUCTIVE_FRAME_SOURCES` lists the origins that the pages of the app can
show in a frame, in addition to the port previews. The Desktop tab shows
the desktop stream of a sandbox in such a frame.

- The value is a list of HTTPS origins, separated by spaces. An origin is
  `https://`, a host, and an optional port, with no path.
- List only the origins of trusted desktop stream hosts. A desktop URL
  carries its token in the fragment. Copy only its origin. Put no token or
  other secret in the value.
- Boat's [desktop guide](https://docs.boat.dev/desktop-streaming/urls-and-security)
  shows the stream host only as `<sandbox-desktop-host>`. Boat generates
  that host for the running sandbox. The guide gives no wildcard for these
  hosts. So list only the origins that Boat confirms for the app's account.
  Add no wildcard of your own.
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
  value: `https://*.<PREVIEW_DOMAIN>`, then each desktop stream origin. The
  Worker lists the preview origin only once.

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
