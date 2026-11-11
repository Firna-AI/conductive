# The preview relay

This page belongs to [Pull request previews](../pr-previews.md). The relay
is the Worker `conductive-preview-relay`, on the bare preview zone. It
gives GitHub events and install returns to each live preview. Reason: a
GitHub App has one webhook URL and one Setup URL. So one trusted Worker
must hand each event and each install return to the right preview.

Sign-in needs no relay. The callback URL of the preview GitHub App accepts
each subdomain of the zone, as
[The preview GitHub App](setup.md#the-preview-github-app) says.

## Its deploy

- The relay deploys only from `main`, on each push that changes it and on
  a manual run of the workflow.
- Its code lives in `tools/pr-previews/relay/`. The `relay` command of the
  preview tool deploys it.
- It holds the secret `GITHUB_WEBHOOK_SECRET`.
- Risk: the preview token of any pull request run can also deploy over the
  relay, as
  [Shared keys and their risk](../pr-previews.md#shared-keys-and-their-risk)
  says.

## The registry

- The registry lists the live previews. It is a KV namespace of the
  preview account, with one entry `pr-<n>` for each live preview.
- The relay deploy makes the namespace when it is missing.
- The deploy of a preview adds its entry as its last step. The delete of a
  preview removes the entry as its first step.
- The sweep removes each entry that has no Worker.
- Reason: with the registry, the relay needs no Cloudflare token to find
  the previews.

## GitHub events

On `POST /v1/github/webhooks`, the relay takes these steps:

1. It checks the GitHub signature with `GITHUB_WEBHOOK_SECRET`.
2. It answers GitHub at once.
3. It sends the raw body and the GitHub headers to `/v1/github/webhooks`
   on the machine hostname of each live preview.

- Reason: GitHub waits at most 10 seconds for an answer.
- Each preview checks the signature again. It keeps only the events of its
  own repositories, as
  [Refresh behavior](../../worker/github/README.md#refresh-behavior) says.
- Each preview answers a repeated delivery from its stored receipt.
- A preview that misses an event still shows the current state of its
  pull request bar. Each tab reads that state from GitHub when it opens, as
  [State of a branch](../protocol/github-banner.md#state-of-a-branch) says.

## Install returns

After an install or a change of the preview GitHub App, GitHub sends the
user to the Setup URL on the relay. The relay sends the user on to the
preview where the install started.

- Each preview sets `GITHUB_SETUP_RELAY_DOMAIN` to the preview zone.
- With that variable, the start of an install at `/github/install` also
  sets the relay cookie. The relay cookie holds the app origin of the
  preview.
- The relay cookie is for the domain of the zone and the path
  `/github/setup`. It lasts one hour.
- Reason: the app keeps the screen of an install in a cookie of the app
  hostname, as [The GitHub App](../protocol/github-banner.md#the-github-app)
  says. The relay cannot read that cookie.
- On `GET /github/setup`, the relay reads the relay cookie. It sends the
  user to `/github/setup` on that app origin, and deletes the cookie.
- The relay accepts only an origin of the shape
  `https://pr-<n>-app.<zone>`. So the relay is no open redirect.
- Without such a cookie, the relay shows the list of live previews.

## The list of previews

`GET /` on the relay lists the live previews, with their links.
