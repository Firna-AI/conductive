# Pull request previews

Each pull request from a branch of this repository gets its own copy of
the app, a preview. The GitHub Actions workflow
`.github/workflows/preview.yml` deploys the preview. A bot comment on the
pull request links it. A close or a merge of the pull request deletes it.
All previews run in a Cloudflare account of their own, apart from the live
app.

This guide calls the test deployment at `conductive.build` the live app.
[Automatic deploys](automatic-deploys.md) says how each push to `main`
deploys it. This guide says what a preview is, what works in it, what it
shares with other previews, and what it costs. Three linked pages give the
rest:

- [Setup](pr-previews/setup.md): the accounts, the settings, the token,
  the GitHub App, and the Boat key that a person sets up once.
- [Life of a preview](pr-previews/life.md): the runs, the comment, the
  deploy, the delete, the daily sweep, and a recovery by hand.
- [The relay](pr-previews/relay.md): the Worker that gives GitHub events
  and install returns to each preview.

## Terms

- **Preview:** a copy of the app for one pull request. It has its own
  Worker, D1 database, Durable Objects, and hostnames.
- **Preview account:** the Cloudflare account of the previews. It holds no
  resource of the live app.
- **Preview zone:** the domain of the previews, a zone of the preview
  account. In the hostnames of these pages, `<zone>` stands for it.
- **Preview tool:** the TypeScript tool in `tools/pr-previews/`. It
  deploys, deletes, and sweeps previews. It also deploys the relay, and it
  prints the manifest of the preview GitHub App.
- **Relay:** the Worker `conductive-preview-relay` on the bare preview
  zone. It gives GitHub events and install returns to each live preview.
- **Port preview:** a different feature, the address of a port in a cloud
  computer, as [Port previews](protocol/port-previews.md) says. A preview
  has no port previews.

## When a preview runs

The workflow runs on these pull request events:

- `opened`, `synchronize`, and `reopened`: it deploys the head commit of
  the pull request. A `synchronize` event is a push to the branch of the
  pull request.
- `closed`, also after a merge: it deletes the preview.

More facts:

- The workflow runs only for a pull request from a branch of this
  repository. It skips a pull request from a fork or from Dependabot, with
  a notice. Reason: GitHub gives such a run no secrets.
- It does not wait for CI. So a commit gets a preview also when its CI run
  fails.
- It runs the sweep each day and on each manual run, as
  [The daily sweep](pr-previews/life.md#the-daily-sweep) says.
- It deploys the relay only from `main`, as
  [The relay](pr-previews/relay.md#its-deploy) says.
- Until the setup exists, each run warns and deploys nothing, as
  [The settings check](pr-previews/setup.md#the-settings-check) says.

## Hostnames

For pull request `<n>`, the Worker and the D1 database of the preview are
both named `conductive-pr-<n>`. The preview zone holds these hostnames:

| Hostname | What it serves |
| --- | --- |
| `pr-<n>.<zone>` | The marketing site of the preview, as `conductive.build` does for the live app |
| `pr-<n>-app.<zone>` | The web app and the API of the preview, as `app.conductive.build` does |
| `pr-<n>-api.<zone>` | The routes for machines of the preview, as `api.conductive.build` does |
| `<zone>` | The relay |
| `runner.<zone>` | The runner archives, from the R2 bucket `conductive-preview-runner` |

- [Hostnames](architecture.md#hostnames) in the architecture doc says what
  each hostname of the live app serves.
- Each preview hostname is a route of the Worker of its preview, on the
  proxied wildcard DNS record of the zone.
- Reason: a zone allows 100 Workers custom domains, but 1,000 routes.
  Three custom domains for each preview would allow only 33 previews.
- Each hostname is one level below the zone. So the free certificate of
  the zone covers it.
- The zone holds no other hostname. Reason: the preview GitHub App can send
  a sign-in code to any subdomain of the zone.
- A response header rule of the zone adds `X-Robots-Tag: noindex` to each
  response. So previews stay out of search results.
- The D1 database of each preview is in Western Europe, near its Durable
  Objects.

## What works in a preview

A preview runs the real backend, with its own database, which starts
empty. These parts work:

- GitHub sign-in on the app hostname, through the preview GitHub App. The
  sign-in needs no relay. The callback URL of the app accepts each
  subdomain of the zone.
- The waitlist. A new account waits for app access, as
  [Who waits](protocol/waitlist.md#who-waits) says.
- App access for the testers. Each person that `OPERATOR_GITHUB_IDS` names
  gets app access at sign-in, as [Ways in](protocol/waitlist.md#ways-in)
  says. Such an operator can approve the other people who wait.
- Orgs, members, and the repositories of the test accounts that install the
  preview GitHub App.
- Image builds. A preview has no software image, so each first build
  installs the app's own software from the base image. Such a build is
  slower, but it does not fail for that reason, as
  [The software image](protocol/org-image.md#the-software-image) says.
- Workspaces, with real cloud computers in the Boat organization of the
  preview Boat key.
- Chat with the agents, on the agent logins that you connect in the
  preview.
- The terminal.
- The pull request bar and the Checks tab. GitHub events reach the preview
  through the relay.
- Installs and changes of the preview GitHub App. Each one returns to its
  preview through the relay.
- Workspace titles, from Workers AI of the preview account.
- The model list and the default choice from the `wrangler.jsonc` of the
  commit.

The app hides Desktop for now, as
[Desktop](protocol/workspace-tools.md#desktop) says. When a pull request
shows Desktop again, its stream needs `CONDUCTIVE_FRAME_SOURCES` in the
GitHub environment `preview`.

## What does not work in a preview

- Port previews. A preview sets no `PREVIEW_DOMAIN`, so each port preview
  answers `503 preview_unavailable`. Reason: port previews need a second
  domain, with hostnames two levels deep. Such hostnames need a certificate
  add-on.
- The Mac app. A preview build would share the `conductive://` sign-in
  address with the installed Mac app. The Mac workflow already tests each
  change to the Mac app.
- Invitation emails. A preview has no Resend key, so an invite answers
  `502 invite_email_failed`. The invitation stays pending. The invited
  person signs in with a GitHub account that has the invited address as a
  verified email. That person then accepts the invitation in the app, as
  [Members and roles](protocol/orgs-and-members.md#members-and-roles) says.
- Approval emails. An approval by an operator still gives app access.
- Feedback emails. A preview sets no `FEEDBACK_EMAIL`, so each feedback
  send answers 503.
- Seed data. Each preview starts empty. In each preview, you sign in, make
  an org, and build its image. Reason: previews that share a seed image can
  break when one preview rebuilds it.

A preview gets no Resend key, because the invitation and approval emails
come only from `invites@mail.conductive.build`. With a key, the code of a
pull request could send mail as the live product.

The sign-in screen of a preview links the Terms and Privacy pages of
`conductive.build`. Reason: `docs/mockups/src/brand.ts` holds the product
domain as a constant.

## Shared keys and their risk

**Warning:** the code of any open pull request can reach the data and the
logins of every preview, and the relay. So install the preview GitHub App
only on test repositories. Connect only agent logins with a spending limit.

- Each pull request run holds the preview token and every secret of the
  GitHub environment `preview`. The workflow file and the preview tool of
  its branch run next to them.
- The preview token can change every preview Worker, every preview
  database, the runner bucket, and the relay.
- Each preview Worker runs the code of its own pull request. It holds the
  Boat key, the GitHub App key, the session key, and the encryption key
  that all previews share.
- The shared Boat key can run commands in every preview sandbox. So the
  code of any open pull request can read the agent login of a running turn
  in another preview.
- The shared GitHub App key can act as the preview GitHub App on each
  repository where the app is installed.
- Each preview binds the shared attachment bucket. So its code can read
  every file that a user attached in any preview.
- So a test login or a GitHub token that you enter in one preview can leak
  through another open pull request.
- A branch can replace an archive in the runner bucket. The image builds of
  the other previews that use that archive then fail. Reason: each build
  checks the SHA-256 digest of its archive.
- The session key and the encryption key reach only preview data, because
  each preview has its own database.

The deploy keeps the packages of a branch away from the token, as
[Runs of a pull request](pr-previews/life.md#runs-of-a-pull-request) says.
The workflow file and the preview tool of the branch still run next to it.
So treat each secret of the GitHub environment `preview` as readable by
each branch of this repository.

## Costs and limits

- The preview account needs the Workers Paid plan, at $5 a month. Reason:
  the free plan allows only 10 D1 databases and 5 cron triggers.
- The preview zone is a domain of your choice, at about $10 to $15 a year.
- Each preview sandbox and saved snapshot uses the plan and the wallet of
  the Boat organization of the preview Boat key.
- A Boat organization pays its plan from its first day, with no trial. The
  smallest plan costs $20 a month. It includes 555 VM hours, 100 sandboxes
  at once, 200 starts a day, and 10 saved snapshots.
- Each saved snapshot above the included count costs $0.056 a day. With an
  empty wallet, a save above that count fails.
- Each pull request run uses GitHub Actions minutes for its jobs.
- Old runner archives stay in the runner bucket. Each is about 320 MiB, and
  the preview tool deletes none.

These limits apply:

- At most 125 previews run at once. Each preview has the 2 cron triggers
  of `wrangler.jsonc`, and Workers Paid allows 250 in an account.
- A zone allows 1,000 routes. Each preview uses 3 routes.
- Workers Paid allows 500 Workers. Each preview uses one Worker, and the
  relay uses one.
