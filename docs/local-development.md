# Local development

This page belongs to [Get started](../README.md#get-started) in the root
README. It gives the local storage, the app origin, the values that
GitHub sign-in and the cloud computers need in `.dev.vars`, and the
production values of `wrangler.jsonc`.

## Local storage

Local development needs no Cloudflare account. Wrangler provides local D1,
R2, and Durable Object storage under `.wrangler/`. The D1 ID and the R2
bucket name in `wrangler.jsonc` name the production database and bucket.
Local commands, such as `npm run db:migrate` and `npm run dev`, use only
the local storage.

This local setup creates no Cloudflare resources and deploys nothing. The
`Deploy` workflow in GitHub Actions deploys each push to `main`, as
[Automatic deploys](automatic-deploys.md) says. Put local secrets in
`.dev.vars`, which Git ignores.

## The app origin

The app origin is the scheme, host, and port of the web app. A deployed
Worker reads it from `APP_ORIGIN`, which `wrangler.jsonc` does not set.
`npm run dev` and `npm run preview` do not need `APP_ORIGIN`. An HTTP
request to `localhost`, `127.0.0.1`, or `[::1]` uses its own origin as the
app origin. An `APP_ORIGIN` value in `.dev.vars` does not change this. So
the app origin is `http://127.0.0.1:5173` in `npm run dev`, and
`http://127.0.0.1:5174` in `npm run preview`.

Host routing, the `Origin` check, the content policy, and GitHub sign-in use
the app origin of each request. The development page has the same content
policy as the built app. That policy allows no inline script. So, in
`npm run dev` only, a plugin in `vite.config.ts` moves each inline script of
the page into an external script file.

## GitHub sign-in

GitHub sign-in needs these values in `.dev.vars`:

| Name | Value |
| --- | --- |
| `GITHUB_CLIENT_ID` | The GitHub App's client ID |
| `GITHUB_CLIENT_SECRET` | The GitHub App's client secret |
| `SESSION_SIGNING_KEY` | 32 random bytes, encoded as Base64 |
| `BOAT_KEY_ENCRYPTION_KEY` | A separate 32 random bytes, encoded as Base64. It encrypts the stored secrets, such as the agent logins and the workspace tokens. |

In a deployment, the client secret and both keys are Worker secrets, as
[Deployment inputs](deployment.md#secrets) says. Open `/api/auth/github` to start sign-in. GitHub then returns to
`/api/auth/github/callback` on the same app origin. The GitHub App must
accept that callback address, for example
`http://127.0.0.1:5174/api/auth/github/callback` for `npm run preview`. The
GitHub App is "Conductive Build", with the slug `conductive-build`, in the
Firna-AI organization. It sends its webhooks to the address in
[The GitHub App](protocol/github-banner.md#the-github-app).
[The GitHub App](deployment.md#the-github-app) in the deployment guide
gives each setting of the GitHub App, with the address where GitHub returns
the user after an install.
Automated tests use fakes and need no credentials.

## Cloud computers

Every cloud computer runs in a provider account of the app. The `boat`
account is the app's own Boat organization. That organization holds only
the app's sandboxes and saved snapshots, and no other Boat work. The
Worker needs two values to start cloud computers on Boat:

| Name | Value |
| --- | --- |
| `BOAT_API_KEY` | An API key for the app's Boat organization, and the only Boat credential. It is a secret. |
| `BOAT_ORG_ID` | The ID of the app's Boat organization. It is not a secret. The Worker names it on every Boat call. |

[The app's Boat account](../worker/sandbox/README.md#the-apps-boat-account)
says how to make the key. Put both values in `.dev.vars` to start real cloud
computers in local development. In a deployment, `BOAT_API_KEY` is a
Worker secret, and `BOAT_ORG_ID` is a variable in the settings of the
Worker, as [Deployment inputs](deployment.md#how-to-set-the-inputs)
says.

Local development needs no E2B account. Without one, every new org gets
`boat`. A deployment can add the `e2b` account, as
[The app's E2B account](sandbox-provider-accounts.md#the-apps-e2b-account)
says. [The app's Boat key](protocol/isolation.md#the-apps-boat-key)
and [the app's E2B key](protocol/isolation.md#the-apps-e2b-key) state
how the Worker keeps each key away from the browser and the sandboxes.

## Production values

`wrangler.jsonc` also sets the production values: `MACHINE_ORIGIN` is
`https://api.conductive.build`, and `PREVIEW_DOMAIN` is `conductive.page`.
It sets `CONDUCTIVE_TITLE_MODEL` for automatic workspace names, as
[The title model](deployment.md#the-title-model) says.
It also holds the model list and the app default in `CONDUCTIVE_MODELS`
and `CONDUCTIVE_DEFAULT_CHOICE`. Edit these values in the repository.
The next deploy publishes them, as [Models](deployment.md#models) says.
A value in `.dev.vars` replaces the corresponding production value locally.
When `.dev.vars` sets `MACHINE_ORIGIN` or `MARKETING_ORIGIN` to a local address,
requests to that address keep that role. The
[marketing README](../src/marketing/README.md#development) uses this to preview
the built site through the Worker. For `npm run preview`, set
`MARKETING_ORIGIN=http://localhost:5174` and
`APP_ORIGIN=http://127.0.0.1:5174` in `.dev.vars`. Run `npm run build`
before `npm run preview`. Open `http://localhost:5174` for the site and
`http://127.0.0.1:5174` for the app. The Worker fills sign-in links from
`APP_ORIGIN` and serves Astro's built pages with their security headers.
