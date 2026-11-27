# Deployment inputs

This guide lists the inputs of a deployment of the Conductive Worker: its
bindings, its public variables, and its secrets. It also says which
settings the Worker gives to each workspace sandbox.
[Sandbox provider accounts](sandbox-provider-accounts.md) gives the
accounts of the sandbox providers, Boat and E2B.
[Architecture](architecture.md) describes the Worker and its hostnames.
The [Worker README](../worker/README.md#routes) lists the routes that the
Worker serves now. [Automatic deploys](automatic-deploys.md) says how each
push to `main` deploys the production deployment. Linked pages hold the
[model inputs](deployment/models.md), the
[Conductive releases and software image](deployment/runner-archive.md),
the [attachment bucket](deployment/attachment-bucket.md), and the
[frame sources](deployment/frame-sources.md).

Each input names the routes that read it. A route that does not read an
input works without it. Keep secrets out of the repository and out of
examples.

## How to set the inputs

- Declare the bindings in `wrangler.jsonc`. It already holds `DB`,
  `ASSETS`, `WORKSPACES`, `CHAT_ATTACHMENTS`, `AI`, and `CHATGPT_EGRESS`.
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
- `wrangler.jsonc` also turns on Issues, the error tracking of Workers,
  which is in open beta. Issues groups each uncaught exception, each
  `5xx` reply, and each error log line of the Worker into issues. The
  Worker page of the Cloudflare dashboard lists them under Issues.
  - Each deploy sets Issues from `wrangler.jsonc`. A switch in the
    dashboard alone ends at the next deploy.
  - Cloudflare keeps the details of each occurrence for 7 days.
  - The preview proxy passes each `5xx` reply of a preview through, so
    the failures of the programs in the sandboxes become issues too.
  - Issues sends no alert by itself. An automation in the dashboard sends
    an issue to a chat, an incident tool, a webhook, or a coding agent.
  - The reply to an unexpected error that the Worker catches is
    `500 internal_error`, so Issues shows the reply but not its cause.
  - An error of a Durable Object that restarted, such as for a deploy,
    gets `503 server_restarted` instead, as
    [Effects on open pages](automatic-deploys.md#effects-on-open-pages)
    says.
- For each unexpected error, also a restart of a Durable Object, the
  Worker logs the `unexpected_error` warning. It is a warning line, so it
  shows in Workers Logs and not in Issues. Filter on
  `kind = unexpected_error`.
  - It holds the error name, a fixed kind for a known Cloudflare text,
    such as `code_updated` for a restart, the Cloudflare flags, the
    method, the route words, and the code places of the stack.
  - It holds no error message, so that no secret or request body reaches
    the log.
  - An error of the preview proxy logs no route, because its paths are
    the paths of the user's app. A preview request that fails before the
    proxy, such as when a deploy restarts the workspace object, still
    logs the route words of its path, with each other segment as `*`.
- `wrangler.jsonc` turns on the compatibility flag `enable_request_signal`
  with the compatibility date `2026-11-06`. With this flag, the `signal`
  of an incoming request fires its `abort` event when the client
  disconnects, as
  [Cloudflare's flag reference](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-requestsignal-for-incoming-requests)
  says. The model gateway uses this event to cancel the request to the
  upstream when the agent program closes its connection, as
  [Streams](protocol/model-gateway-requests.md#streams) requires. The flag
  applies to every incoming request of the Worker, also to each request
  that reaches a workspace Durable Object. It does not turn on
  `request_signal_passthrough`. So forwarding a request by itself does not
  pass its incoming signal to a subrequest.
- Set each single-line secret with `npx wrangler secret put <NAME>`. The
  command asks for the value. Never put a secret in `wrangler.jsonc` or in
  Git.
- Set each multiline secret from a file outside the repository, such as
  the PEM file from GitHub:
  `npx wrangler secret put GITHUB_APP_PRIVATE_KEY < ~/github-app-private-key.pem`.
  Wrangler then keeps the line breaks inside the value. It removes the
  whitespace at the end of the value.
  - Do not paste a multiline value at the prompt. The prompt removes the
    line breaks of a pasted value. It can also keep only the first line.
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
| `CHAT_ATTACHMENTS` | R2 bucket | Chat attachments: each upload, each message or create with files, the copy of the files when a turn starts, and their deletion | The bucket `conductive-chat-attachments`, as [The attachment bucket](deployment/attachment-bucket.md) says. |
| `AI` | Workers AI | The title of a workspace that has no name | Workers AI on the Cloudflare account of the Worker, as [The title model](deployment/models.md#the-title-model) says. |
| `CHATGPT_EGRESS` | Service binding | The ChatGPT requests of the model gateway | The Worker `conductive-chatgpt-egress`, as the [ChatGPT egress README](../worker/chatgpt-egress/README.md) says. It must exist before the first deploy of the Worker. |
| `CF_VERSION_METADATA` | Version metadata | The software image route of the deploy run | The ID, the tag, and the creation time of the running Worker version. `wrangler.jsonc` sets it. Without it, the route answers 404, as [The software image](deployment/runner-archive.md#the-software-image) says. |

## Public variables

| Name | Needed by | Value |
| --- | --- | --- |
| `APP_ORIGIN` | Every route of the app hostname | The `https://` origin of the app hostname, with no path. |
| `MARKETING_ORIGIN` | The marketing site | Optional. Without it, the Worker uses `https://conductive.build`. |
| `MACHINE_ORIGIN` | The machine hostname, and each workspace sandbox | The `https://` origin of the machine hostname. `wrangler.jsonc` sets it. |
| `PREVIEW_DOMAIN` | Port previews | The domain of the preview hostnames. `wrangler.jsonc` sets it. |
| `GITHUB_CLIENT_ID` | GitHub sign-in, each refresh of a stored GitHub user token, the GitHub banner and Checks, the workspace refreshes of verified GitHub webhooks, and image builds that copy a repository | The client ID of the GitHub App. |
| `GITHUB_APP_SLUG` | The links to the GitHub App: Install in Get started, Manage on GitHub in the account, and Manage access of the repository lists | Optional. The slug of the GitHub App, as in `https://github.com/apps/<slug>`. Without it, or with a value that is not a slug, the links use `conductive`, and the Worker logs a warning for a wrong value. It is not a secret. |
| `BOAT_ORG_ID` | Each call to the `boat` account | The ID of the app's Boat organization, as [The app's Boat account](sandbox-provider-accounts.md#the-apps-boat-account) says. It is not a secret. |
| `CONDUCTIVE_MODELS` | [Model configuration dependencies](deployment/models.md#configuration-failures) | The JSON model list, as [Models](deployment/models.md#models) says. |
| `CONDUCTIVE_DEFAULT_CHOICE` | [Default choice dependencies](deployment/models.md#configuration-failures) | The JSON default choice, as [Models](deployment/models.md#models) says. |
| `CONDUCTIVE_STARTING_FAVOURITES` | The account reads of the accounts that never saved favourites | Optional. The JSON starting favourites, as [Starting favourites](deployment/models.md#starting-favourites) says. Without it, or with a bad value, such an account gets only the app default as a favourite, and the Worker logs a warning. It is not a secret. |
| `CONDUCTIVE_TITLE_MODEL` | The title of a workspace that has no name | Optional. The Workers AI model ID of the title model, as [The title model](deployment/models.md#the-title-model) says. Without it, the app shows "Untitled" until a name is set. It is not a secret. |
| `CONDUCTIVE_RELEASE_SERVER` | Image builds, refreshes, and workspace bootstrap | Optional release base URL. The default is `https://runner.conductive.build`. |
| `CONDUCTIVE_DEPLOY_TOKEN_SHA256` | The software image route of the deploy run | The SHA-256 digest of the deploy token of the deploy run that made the Worker version, as 64 hexadecimal characters. Each deploy from `main` sets it, as [The software image](deployment/runner-archive.md#the-software-image) says. It is not a secret. |
| `CONDUCTIVE_FRAME_SOURCES` | The Desktop tab, through the content security policy of each page of the app | Optional. The trusted HTTPS origins of the desktop streams, separated by spaces, as [Frame sources](deployment/frame-sources.md) says. It is not a secret. |
| `OPERATOR_GITHUB_IDS` | The operator section and the suspension of users and orgs | Optional. The numeric GitHub user IDs of the operators, separated by commas. It is not a secret. Without it, each operator request gets `403 operator_required`, as the [operator area](../worker/operator/README.md#overview) says. |
| `CHANGES_DELTAS` | The welcome of each runner connection | Optional. With `"on"`, the welcome accepts changes deltas from each runner that offers them, as [The agreement](protocol/changes-deltas.md#the-agreement) says. Without it, or with any other value, the welcome accepts none, and each runner sends full changes lists. `wrangler.jsonc` sets `"off"` until activation, as [When a deploy fails](automatic-deploys.md#when-a-deploy-fails) says. It is not a secret. |

- Without `MACHINE_ORIGIN`, the Worker refuses each request on the machine
  hostname. Each sandbox gets the value as `CONDUCTIVE_MACHINE_ORIGIN`. Both
  credential routes refuse every request without it, and a build cannot
  copy a repository.

## Secrets

| Name | Needed by | Value |
| --- | --- | --- |
| `GITHUB_CLIENT_SECRET` | GitHub sign-in, and each refresh of a stored GitHub user token | The client secret of the GitHub App. |
| `BOAT_API_KEY` | Each call to the `boat` account | An API key for the app's Boat organization, and the only Boat credential, as [The app's Boat account](sandbox-provider-accounts.md#the-apps-boat-account) says. |
| `SANDBOX_PROVIDER_ACCOUNTS` | Each call to another provider account, such as `e2b`, the draw of the account of each new org, and the account choice of operators | Optional. JSON text with the other provider accounts of the app, as [The app's E2B account](sandbox-provider-accounts.md#the-apps-e2b-account) says. Without it, `boat` is the only account. |
| `SESSION_SIGNING_KEY` | Sign-in, the sign-in of the Mac app, and every signed-in route | 32 random bytes, encoded as Base64. |
| `BOAT_KEY_ENCRYPTION_KEY` | Every route that stores or reads a stored secret | A separate 32 random bytes, encoded as Base64. |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub banner and Checks, the workspace refreshes of verified GitHub webhooks, and image builds and refreshes of an org that chose a repository | The private key of the GitHub App, as PEM. The PEM file from GitHub works as it is. A PKCS#8 PEM works too. |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhooks on the machine hostname | The webhook secret of the GitHub App. The Worker checks each delivery with it. Without it, each delivery gets `503 github_unavailable`. |
| `RESEND_API_KEY` | The invitation emails of the member routes, the approval emails of the operator section, and the feedback emails of `POST /api/feedback` | An API key of Resend that can send from `mail.conductive.build`. The invitations come from `invites@mail.conductive.build`, so Resend must verify that domain. The approval emails come from the same sender. The feedback emails come from `feedback@mail.conductive.build`, on the same domain. A key with sending access only is enough. An `APP_ORIGIN` on `localhost`, `127.0.0.1`, or `[::1]` needs no key. The Worker then writes each invitation link and each feedback email to its log. Without the key, an invite gets `502 invite_email_failed`. The invitation stays pending. A feedback send gets HTTP 502 too. An approval still gives app access, and the app tries its email again for 24 hours, as [The approval email](protocol/waitlist.md#the-approval-email) says. |
| `CHATGPT_EGRESS_URL` | The ChatGPT requests of the model gateway, only when the deployment has no `CHATGPT_EGRESS` binding | The HTTPS address of a fallback egress proxy, as the [model gateway README](../worker/model-gateway/README.md#chatgpt-egress) says. The gateway reads it only together with `CHATGPT_EGRESS_SECRET`. |
| `CHATGPT_EGRESS_SECRET` | The same requests as `CHATGPT_EGRESS_URL` | The shared secret of that proxy, with at least 32 characters. |
| `FEEDBACK_EMAIL` | The feedback emails of `POST /api/feedback` | The address of the team inbox, which gets each feedback email, as [The email](protocol/feedback.md#the-email) says. It is a secret, so that a personal address stays out of the repository. Without it, each send gets HTTP 503, also on a local `APP_ORIGIN`. With it, a local `APP_ORIGIN` writes each feedback email to the log of the Worker, and needs no `RESEND_API_KEY`. Elsewhere, the feedback emails also need `RESEND_API_KEY`. |

- `BOAT_KEY_ENCRYPTION_KEY` encrypts the agent logins, the GitHub user
  tokens, the env vars of each org, and the workspace tokens. It also
  encrypts the start logs, the credentials of each image source copy, the
  terminal and preview credentials, and the traffic token of each E2B
  sandbox. It encrypts no provider key. A new key cannot read the values
  that the old key encrypted.

## The attachment bucket

[The attachment bucket](deployment/attachment-bucket.md) gives the R2
bucket of `CHAT_ATTACHMENTS`: its creation, its location, and the
settings that it must not have.

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

[Models](deployment/models.md#models) gives the model list of
`CONDUCTIVE_MODELS` and the default choice of `CONDUCTIVE_DEFAULT_CHOICE`:
their shape, the operations that need them, and their configuration failures.
[Starting favourites](deployment/models.md#starting-favourites) gives the
starting favourites of `CONDUCTIVE_STARTING_FAVOURITES`.

## The title model

[The title model](deployment/models.md#the-title-model) gives the model
that `CONDUCTIVE_TITLE_MODEL` names, and what happens without it.

## Conductive release files

[Conductive release files](deployment/runner-archive.md#conductive-release-files)
gives the release server and parts.

### The release in each deploy

[The release in each deploy](deployment/runner-archive.md#the-release-in-each-deploy)
gives the public paths and publication order.

### The software image

[The software image](deployment/runner-archive.md#the-software-image) describes
the software image that each deploy builds.

## Frame sources

[Frame sources](deployment/frame-sources.md) gives the origins of
`CONDUCTIVE_FRAME_SOURCES`, which let the Desktop tab show the desktop
stream of a sandbox.

## Settings of each workspace sandbox

The Worker gives each workspace sandbox its settings at each start, as
[Start in a workspace](../image/README.md#start-in-a-workspace) says. One
of them comes from this guide: `CONDUCTIVE_MACHINE_ORIGIN` is
`MACHINE_ORIGIN`.

The computer tools need no deployment input. On Boat, Boat writes the
entry of the `computer` server into each sandbox at its start. It names a
local server with no URL and no credential, and the runner reads it, as
[What it does](../runner/README.md#what-it-does) says. On E2B, the E2B
template installs the Cua Driver and writes the same entry at each boot,
as [Computer tools](protocol/agent-tools.md#computer-tools) says. An E2B
org image gets the entry only from a template build that has it.

`CONDUCTIVE_DEFAULT_BRANCH` needs no deployment input. It names the base
branch of the workspace, as
[Base branches](protocol/base-branches.md#the-base-branch-of-a-workspace)
says. A create, a resume, and a disk retention restart give the base
branch that the Worker's record of the workspace names. Without one, a
create or a resume gives the default branch of its queued start, and a
disk retention restart gives the current default branch.

`CONDUCTIVE_WORKSPACE_BRANCH` needs no deployment input either. A create, a
resume, and a disk retention restart give the workspace branch that the
Worker's record of the workspace names. The runner names that branch in
the [agent instructions](protocol/agent-instructions.md#the-branches).

## Sandbox provider accounts

[Sandbox provider accounts](sandbox-provider-accounts.md) gives the
provider accounts of a deployment: the app's Boat account, the app's E2B
account, and the steps before a real org runs on E2B.
