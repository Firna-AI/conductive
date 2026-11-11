# Setup of pull request previews

This page belongs to [Pull request previews](../pr-previews.md). It gives
the setup that only a person with the accounts can do. The workflow warns
and deploys nothing until this setup exists. Do the steps in the order of
this page.

## Cloudflare

1. Make a Cloudflare account for previews. Put it on the Workers Paid
   plan.
2. Add a domain of your choice to that account, as a zone. This zone is
   the preview zone.
3. Add a proxied `AAAA` record for the bare zone, with the value `100::`.
   The relay serves it. The value is an address with no server, because
   the Workers answer each request.
4. Add a proxied `AAAA` record for `*.<zone>`, with the value `100::`.
   The routes of the previews use it.
5. Add a response header rule that sets `X-Robots-Tag: noindex` on each
   response of the zone.
6. Make the R2 bucket `conductive-preview-runner`. Connect the custom
   domain `runner.<zone>` to it, so that the bucket serves its archives in
   public.
7. Make the private R2 bucket `conductive-preview-attachments`, with the
   location hint for Western Europe. In the preview account, run
   `npx wrangler r2 bucket create conductive-preview-attachments --location weur`.
8. Make the preview token, as [The preview token](#the-preview-token)
   says.

- Add no other hostname to the zone. Reason: the preview GitHub App can
  send a sign-in code to any subdomain of the zone.
- Cloudflare adds `X-Robots-Tag` by itself only on `workers.dev`. The zone
  rule needs no product code.
- Make the attachment bucket before the first preview. Without it,
  `wrangler deploy` makes the bucket with no location hint.
- Keep the attachment bucket private, as
  [The attachment bucket](../deployment.md#the-attachment-bucket) says for
  the bucket of the live app.
- All previews share the attachment bucket. Each object key starts with
  `attachments/<org ID>/`. So the files of honest previews never meet.

## The preview token

The secret `CLOUDFLARE_API_TOKEN` of the GitHub environment `preview`
holds the preview token. It needs these permissions. A user token and an
account-owned token both work.

| Permission | Scope | Resource | What uses it |
| --- | --- | --- | --- |
| Workers Scripts Edit | Account | The preview account | The deploy of each preview Worker and of the relay. The delete of each preview Worker. The list of Workers in the sweep. |
| Workers Routes Edit | Zone | The preview zone | The routes of each preview and of the relay |
| Zone Read | Zone | The preview zone | Wrangler finds the zone of each route by its name |
| D1 Edit | Account | The preview account | The create, the migrations, the reads, and the delete of each preview database. The list of databases in the sweep. |
| Workers R2 Storage Edit | Account | The preview account | The upload of a missing runner archive. The delete of the attachments of a preview. |
| Workers KV Storage Edit | Account | The preview account | The registry of the relay: its create, and each entry that a deploy adds or a delete removes |

- Give the token no access to the account of the live app. Reason: every
  pull request run holds the token.
- With Workers Routes Edit on all zones of the preview account, Wrangler
  sets each route in one call and needs no Zone Read.
- The token needs no Account Settings Read and no user permission. Reason:
  each run gives Wrangler the account ID, so Wrangler does not look up the
  account.
- The template "Edit Cloudflare Workers" holds no D1 Edit and no Zone
  Read. With the template, add both.
- A missing permission makes the first run that needs it fail with an
  authentication error. The error names the Cloudflare API request that
  failed.
- The API names each Edit permission with Write, as in `D1 Write`.
- The S3 key pair of each R2 request comes from the token, as
  [The archive in each deploy](../deployment/runner-archive.md#the-archive-in-each-deploy)
  says for the live app.

## The preview GitHub App

The preview GitHub App is an app of its own, apart from the live GitHub
App. Its one callback URL serves the sign-in of every preview. Its Setup
URL and its webhook URL go to the relay.

1. From the repository root, run
   `node tools/pr-previews/main.ts manifest --zone <zone> --owner <owner>`.
   The command prints the manifest of the preview GitHub App for that
   zone. It also writes a form that starts the registration on GitHub.
2. Open the form, and make the app on GitHub.
3. GitHub then opens the bare zone with a `code` in the address. The page
   can fail before the relay exists. Copy the code from the address.
4. Within one hour of step 2, run
   `gh api --method POST /app-manifests/<code>/conversions`. Its reply
   holds the ID, the client ID, the client secret, the webhook secret,
   and the private key of the app. Keep them for
   [The GitHub environment `preview`](#the-github-environment-preview).
5. In the settings of the new app, turn on wildcard matching for the
   callback URL. A manifest cannot set it.
6. Compare the permissions of the app with those of the live app, as
   [Permissions](#permissions) says.
7. Install the app only on test repositories.

After you make the app, check that it has these settings:

| Setting | Value |
| --- | --- |
| Callback URL | `https://<zone>/api/auth/github/callback`, with wildcard matching on. So each app hostname of the zone can use it. |
| Request user authorization (OAuth) during installation | Off, as for the live app. [The GitHub App](../deployment.md#the-github-app) gives the reason. |
| Setup URL | `https://<zone>/github/setup`. The relay serves it. |
| Redirect on update | On, so that a change of an install also returns to the preview. |
| Webhook URL | `https://<zone>/v1/github/webhooks`. The relay serves it. |
| Webhook secret | The value of `PREVIEW_GITHUB_WEBHOOK_SECRET` |
| Webhook events | `push`, `pull_request`, `pull_request_review`, `pull_request_review_thread`, `check_run`, `check_suite`, and `status`, as [Server integration](../../worker/github/README.md#server-integration) says |

### Permissions

The preview GitHub App needs the permissions of the live GitHub App. The
public reply of `GET https://api.github.com/apps/conductive-build` gives
them. Before you make the preview app, check the manifest against that
reply.

| Kind | Permission | Level |
| --- | --- | --- |
| Repository | Actions | Read and write |
| Repository | Checks | Read |
| Repository | Contents | Read and write |
| Repository | Deployments | Read |
| Repository | Issues | Read and write |
| Repository | Metadata | Read |
| Repository | Pull requests | Read and write |
| Repository | Commit statuses | Read |
| Repository | Workflows | Read and write |
| Organization | Members | Read |
| Account | Email addresses | Read |

- The pull request bar reads contents, pull requests, checks, and commit
  statuses, as
  [Public boundaries](../../worker/github/README.md#public-boundaries)
  says.
- The GitHub CLI of a workspace uses issues, as
  [Git and the GitHub CLI](../protocol/github-tokens.md#git-and-the-github-cli)
  says.
- The logs of failed jobs use actions, as
  [The Actions permission](../protocol/github-tokens.md#the-actions-permission)
  says.
- Agents push and open pull requests with GitHub App user tokens, and the
  sign-in reads the verified emails of each user.

## The preview Boat key

Previews use a Boat key of their own. The key needs the actions that
[The app's Boat account](../../worker/sandbox/README.md#the-apps-boat-account)
lists. Limit it to one Boat environment.

1. Choose a Boat organization that holds no work of the live app.
2. Make the key in that organization, as that section says.
3. Read the ID of the organization, as that section says. It goes in
   `BOAT_ORG_ID`.

- A key in the organization of the live app shares its starts, its wallet,
  and its saved snapshots with every pull request.
- Such a key also breaks the rule that the app's Boat organization holds
  no other Boat work, as
  [The app's Boat key](../protocol/isolation.md#the-apps-boat-key) says.
- Every pull request run and every preview Worker holds the key. So the
  code of any open pull request can use up the limits and the wallet of
  its organization.
- [Costs and limits](../pr-previews.md#costs-and-limits) gives the cost of
  a Boat organization.

## The GitHub environment `preview`

Make the GitHub environment `preview` in the settings of the repository.
Give it no deployment branch rule. Reason: the deploy job of each pull
request run uses it. GitHub gives no secret to a run of a fork or of
Dependabot.

Give it these secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | The preview token |
| `PREVIEW_GITHUB_CLIENT_SECRET` | A client secret of the preview GitHub App |
| `PREVIEW_GITHUB_APP_PRIVATE_KEY` | A private key of the preview GitHub App, as PEM |
| `PREVIEW_GITHUB_WEBHOOK_SECRET` | The webhook secret of the preview GitHub App, from the reply of the code exchange. The relay and each preview check each delivery with it. |
| `SESSION_SIGNING_KEY` | 32 random bytes, encoded as Base64 |
| `BOAT_KEY_ENCRYPTION_KEY` | A separate 32 random bytes, encoded as Base64 |
| `BOAT_API_KEY` | The preview Boat key |

Give it these variables:

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The ID of the preview account |
| `PREVIEW_GITHUB_CLIENT_ID` | The client ID of the preview GitHub App |
| `PREVIEW_GITHUB_APP_SLUG` | The slug of the preview GitHub App, as in `https://github.com/apps/<slug>` |
| `BOAT_ORG_ID` | The ID of the Boat organization of the preview Boat key |
| `OPERATOR_GITHUB_IDS` | The numeric GitHub user IDs of the people who test previews, separated by commas |
| `CONDUCTIVE_FRAME_SOURCES` | Optional. The origins of the desktop streams, as [Frame sources](../deployment.md#frame-sources) says |

- GitHub refuses a secret or a variable whose name starts with `GITHUB_`.
  So the five names of the preview GitHub App start with `PREVIEW_`. The
  workflow gives each one to the preview tool, and to the Worker, under
  the name without `PREVIEW_`, such as `GITHUB_CLIENT_ID`.
- Make the session key and the encryption key once, for all previews. Use
  no key of the live app.
- `OPERATOR_GITHUB_IDS` names each tester. Reason: each preview database
  starts empty, and a new account waits for app access.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are settings of the
  workflow.
- Each other value goes to the Worker input of the same name, as
  [Deployment inputs](../deployment.md) describes it.

## The repository variable `PREVIEW_ZONE`

Set the repository variable `PREVIEW_ZONE` to the domain of the preview
zone. Reason: GitHub gives the variables of an environment only to a job
that names that environment. The runner job and the comment job need the
zone, and they run without the environment. The zone is no secret. The
preview tool makes the hostnames and the origins of each preview from it.

## The settings check

- With none of the required settings, each run warns, deploys nothing,
  and succeeds. So the setup can come after the workflow is on `main`.
- With only some of them, the run fails. The error names each missing
  setting.
- Each secret and each variable above is required, and so is
  `PREVIEW_ZONE`. Only `CONDUCTIVE_FRAME_SOURCES` is optional.
- The deploy of the live app uses the same rule, as
  [GitHub settings](../automatic-deploys.md#github-settings) says.

## The first run

After the setup, start a manual run of the workflow on `main`. The run
deploys the relay, and the relay deploy makes the registry of live
previews. Each later pull request run then deploys its preview. A pull
request that was open before the setup gets its preview at its next push.

In each preview, connect only agent logins with a spending limit, as
[Shared keys and their risk](../pr-previews.md#shared-keys-and-their-risk)
says.
