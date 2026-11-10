# Pull request previews

Status: Active. On branch `calummoore/pr-previews-setup`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

No pull request can be tested in a running app before it merges. The only
deployed copy is the test app at `conductive.build`.
`.github/workflows/deploy.yml` deploys each push to `main` there, as
[Automatic deploys](../docs/automatic-deploys.md) says. This change gives
each pull request from a branch of this repository its own copy of the
app, in a separate Cloudflare account. The copy is a Worker
`conductive-pr-<number>` with its own D1 database, its own Durable Objects,
and its own marketing, app, and machine hostnames. A bot comment on the
pull request links the copy. A close or a merge deletes it. One relay
Worker gives GitHub events and install returns to every preview.

The user chose the approach in a brainstorm on 9 and 10 November 2026:
decision 1 B and decision 2 D below. Decisions 3 and 4 came from the
options checks, and the user answered them on 10 November 2026: 3 A, and
the user provides the Boat key of decision 4. The notes, the checked facts, and the
earlier transcripts are in `.context/pr-previews/`. The change does not
cover port previews in a preview, the Mac app, or seed data for a new
preview. The design gives the reason for
each.

Contract owners:

- `docs/pr-previews.md`, new in Milestone 1.
- [Deployment inputs](../docs/deployment.md) and
  [Automatic deploys](../docs/automatic-deploys.md).
- The [repository README](../README.md) and [AGENTS.md](../AGENTS.md#ci).
- `tools/pr-previews/README.md`, new in Milestone 2.

## Decisions

### 1. Keep preview tokens away from the live app

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. The choice is a Cloudflare account and GitHub settings.
- **Terms:**
  - **Granular authorization:** Cloudflare's per-Worker roles for API tokens, from 15 September 2026. They cover Workers only. Roles for D1, R2, and KV are planned.
- **Background:**
  - Options B, C, and D of decision 2 deploy from pull request runs with a Cloudflare token.
  - A pull request run gives its token to the code of its branch. That code includes its workflow files and its npm packages.
  - The deploy workflow keeps the live token in the GitHub environment `production`. Only `main` can use that environment, as `docs/automatic-deploys.md` says.
  - A preview token must create and migrate D1 databases. Today a D1 permission covers the whole account.
  - Shared assumption: a preview never uses the live database, the live keys, or the agent logins of the live app. Source: the review focus in `AGENTS.md`, and decisions 3 and 4 of the deploy plan, which pull request #82 records. Kept.
  - Shared assumption of A and B: each pull request run holds the deploy token. Source: options B, C, and D of decision 2. It is not a requirement. C drops it.
  - Shared assumption: the token needs the right to create Workers and to write D1 on the whole account. Source: decision 2 D and Cloudflare's roles. Kept.
- **Problem:** In the `conductive.build` account, a preview token can also deploy the live Worker and write the live database. Every agent branch would hold that token.
- **Impact if no action:** A bad branch or a compromised package can change the live app or read its data with no merge. That data holds agent logins and GitHub tokens.
- **Root question:** How can pull requests deploy previews so that no code of a pull request can change the live app or read its data? The options check of 10 November 2026 gave this question. The first question named only the place where previews run, not the code that holds the token.
- **Options:**
  - **A.** Use the `conductive.build` account, with a token that can create Workers and D1 databases. Every pull request run can then change the live app. Effort: Small.
  - **B.** Use a separate Cloudflare account for previews, with its own domain. No preview token can reach the live app. The user makes the account and buys a domain, for about $10 to $15 a year. The Workers Paid plan, at $5 a month, may be necessary. Effort: Small.
  - **C.** Keep previews in the `conductive.build` account, in a zone of their own, and deploy them only from a trusted workflow on `main`. The pull request run builds with no secrets. A `workflow_run` workflow deploys the build as data, with the tool and Wrangler of `main`, and only `main` can read the token. The token has the power of the live deploy token, so a tool bug or a copied binding can touch live data. Effort: Medium. Added by the options check of 10 November 2026.
- **Left out:**
  - A per-Worker token in the live account, because a new Worker needs the Admin role on all Workers, and its D1 permission still reaches the live database. The options check added the first reason.
  - A required approval of each preview run, because it adds a manual step to each push and each close. An approved run also still gives the token to the code of the branch. The second options check found that the repository is public, so GitHub Team does offer required reviewers.
  - Short-lived tokens from GitHub OIDC through a token broker, because such a token still needs the right to create Workers and to write D1 on the whole account.
- **Wider fix:** B. It closes the path for every preview token, also for later preview jobs. C is a guard that works only while the trusted workflow runs no code of a pull request.
- **Previous examples:**
  - `calummoore/twilight-timer` PR #4, review finding 1: the package code of a pull request ran next to the deploy token.
  - `futex-ai/ui` gives its Storybook previews their own Pages token.
  - The deploy workflow limits the live token to `main`.
- **Related:** Decision 2. This decision applies to its options B, C, and D. Option A needs only a static host. Decision 3 uses the trusted workflow of C inside the preview account.
- **Recommendation:** B. It is the only option that keeps every preview token away from the live app. The options check kept B.
- **Action:** ask the user, because B needs a new Cloudflare account and a domain that only the user can make.
- **Chosen:** B, by the user on 10 November 2026, before the options check added C.

### 2. Choose how pull requests get a running app

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Process.
- **Location:** None. The change adds a workflow, a preview tool, and Cloudflare and GitHub settings.
- **Terms:**
  - **Fake API:** the fake backend that runs in the browser with `npm run dev`. It lives in `src/app/dev/` and keeps its data in memory.
  - **Worker Previews:** a Cloudflare feature from 22 September 2026. It runs isolated copies of one Worker, each at its own URL.
  - **Wildcard callback matching:** a GitHub App setting, configurable since August 2026. With it, a sign-in can return to any subdomain of the callback host.
- **Background:**
  - Today a pull request can be tested only when someone runs its branch.
  - A preview of the whole app needs its own database, Durable Objects, hostnames, GitHub App, Boat key, and secrets.
  - Worker Previews give each preview its own Durable Objects, variables, and secrets. CI must still create a D1 database for each preview. Previews get no routes and no cron.
  - With wildcard callback matching, one preview GitHub App can sign users in on every preview hostname. So no sign-in relay is necessary.
  - Shared assumption: a preview never uses the live database, the live keys, or the agent logins of the live app. Source: as decision 1. The approach "version overrides on the live Worker" drops it. It is left out below.
  - Shared assumption: the link reaches the pull request with no manual step. Source: the term "PR previews", and the user's `twilight-timer` request "for every PR, create a preview deploy and post the link as a comment". The approach "the dev fake in a cloud workspace" drops it. It is left out below.
  - Shared assumption of A to D: each option uses all real services or none. Source: the option texts. It is not a requirement. E drops it. The options check named it.
- **Problem:** No pull request can be tested in a running app before it merges. With the deploy workflow, a merge reaches `conductive.build` within minutes.
- **Impact if no action:** Each change gets its first test in the app that the user works in.
- **Root question:** How should each pull request give the user a running copy of its own version of the app?
- **Options:**
  - **A.** Fake-data previews. Each pull request hosts a static build of the web app with the fake API. It shows each screen and state with fake data. It shows no real sign-in, sandbox, agent, or terminal. The fake can drift away from the real API. Effort: Medium.
  - **B.** One shared staging copy, with its own hostnames, database, GitHub App, and Boat key. A pull request deploys to it on a label or a manual run, and the newest deploy wins. Every part works, also port previews and GitHub webhooks. The test org stays between deploys. Only one pull request is live at a time. The migrations of different pull requests pile up in one database. Effort: Medium.
  - **C.** Worker Previews. Each pull request runs `wrangler preview` on one preview Worker, with a new D1 database. A close deletes both. Cloudflare keeps the secrets of all previews, so CI holds none. The app and the sandboxes work. Port previews, the marketing site, and the cron do not. The feature is new, and in October 2026 Wrangler 4.152 marked it as open beta. Effort: Large.
  - **D.** A separate Worker for each pull request, with its own D1 database and its own marketing, app, and machine hostnames. A close deletes the Worker, the database, and its sandboxes. Every part works except port previews and live GitHub webhooks. It uses only Cloudflare features that are generally available. CI gives each new Worker its secrets. Port previews can follow, with a certificate add-on at about $10 a month. Effort: Large.
  - **E.** As D, but the Worker runs in a preview mode that answers GitHub, Boat, and runner calls with fakes based on `worker/test-support/`. The user tests the real backend, the migrations, and the Durable Objects with seeded data, and signs in with a fake GitHub account. No real sandbox, agent, or terminal appears. No GitHub App key, Boat key, or agent login reaches a preview. It needs new product code and a fake runner that can drift from the real one. Effort: Large. Added by the options check of 10 November 2026, which brought it back from the left-out list.
- **Left out:**
  - Version URL aliases, as in `twilight-timer` PR #4, because Cloudflare makes no Version URL for a Worker with Durable Objects.
  - Version overrides on the live Worker, because they cannot apply the migrations of a pull request, and they run unreviewed code on live data.
  - A preview of the web app against one shared backend, because on 9 November 2026 six of the ten open pull requests changed `worker/` or `migrations/`.
  - A cloud VM for each pull request that runs `npm run preview` behind a tunnel, because D is better on every point that remains. Its one gain, no Cloudflare token in pull request runs, decision 1 B makes harmless.
  - The dev fake in the cloud workspace of the pull request, because it puts no link on the pull request, and Conductor Cloud shuts down on 20 November 2026.
  - Workers for Platforms, because Workers Paid already allows 500 Workers, 250 cron triggers, and 1,000 routes in a zone.
  - Previews only on a label, because it changes nothing that the user can test.
  - Automated browser tests in place of previews, because the user asked to test the app during review.
- **Wider fix:** None. This decision adds a new capability, and no class of defect exists yet.
- **Previous examples:**
  - `calummoore/twilight-timer` PR #4 gave each pull request a Version URL alias and one bot comment. That app is static, with no database.
  - `calummoore/twilight-timer` PR #16 moved to `wrangler preview`, and deletes each preview when its pull request closes.
  - `mokly-ai/mokly-cloud` deploys to a staging copy before production.
  - Option E of decision 1 in the deploy plan was a staging Worker before each deploy. The user chose B there, a deploy on each push.
- **Related:** Decision 1 chooses the account for options B, C, and D. Decision 3: option E keeps every real key out of previews.
- **Recommendation:** D. It gives each open pull request its own full copy, and it shows the most of the app with generally available features. B is the smaller choice if one pull request at a time is enough. The options check kept D. E is better only if real keys must stay out of previews.
- **Action:** ask the user, because the options trade the parts that the user can test against the work and the running cost.
- **Chosen:** D, by the user on 10 November 2026, before the options check added E.

### 3. Keep each branch away from other previews

- **Severity:** High. **Effort:** Small.
- **Source:** Design. The options check of 10 November 2026 found it. A second options check on the same day widened it.
- **Category:** Security.
- **Location:** The design below: the GitHub environment `preview`, the deploy job, and the shared preview keys.
- **Terms:**
  - **`workflow_run`:** a GitHub Actions trigger. It starts a workflow of `main` when another workflow ends, and it runs the code of `main`.
  - **Branch rule:** a setting of a GitHub environment. It names the branches whose runs can read the secrets of the environment.
  - **Boat environment:** a part of one Boat organization. A key that is limited to it reaches only its sandboxes.
- **Background:**
  - `Firna-AI/remote-code` is public. Its only collaborator is `calummoore`, and the agents act on GitHub as that admin account.
  - A pull request from a fork gets no secrets, and its first run waits for an approval.
  - When a pull request run deploys its own preview, it holds the Cloudflare token and every preview secret. It runs the workflow file, the preview tool, and the packages of its own branch.
  - The token can write every preview Worker, every preview database, and the runner bucket. A replaced archive breaks the image builds of the other previews, because `image/install.sh` checks its SHA-256.
  - Each running preview Worker runs the code of its own pull request with the shared Boat key, GitHub App key, session key, and encryption key, and with the shared attachment bucket. No CI setting changes that.
  - The shared Boat key can run commands in every preview sandbox. So the code of any open pull request can read the agent login of a running turn in another preview, as `plans/follow-ups/agent-logins-readable-in-sandbox.md` explains.
  - One shared relay Worker, deployed only from `main`, gives GitHub events and install returns to every preview, as the design says. The token of a branch run under A can also deploy over that relay.
  - Shared assumption: previews use the real GitHub App and Boat keys. Source: decision 2 D. D drops it.
  - Shared assumption of A to D: all previews share one Boat key and one attachment bucket. Source: the design. It holds only for honest code. E drops it, and F drops it for the Boat key.
  - Shared assumption: each push deploys with no manual step. Source: decision 2. Kept.
- **Problem:** The code of one pull request can reach the other previews, through the deploy token in CI or through the shared keys in its running Worker.
- **Impact if no action:** A test login or a GitHub token that the user enters in one preview can leak through another open pull request.
- **Root question:** How can each pull request run its own preview, while its code in CI or in its running Worker cannot reach another preview? The second options check gave this question. The first one covered only the reach in CI.
- **Options:**
  - **A.** Each pull request run deploys its own preview, with hardening. The build job has no secrets. The deploy job installs Wrangler from the lockfile of `main`, with no install scripts, and unpacks the build in the temporary folder of the runner. The docs say that any open pull request can reach the data and the logins of every preview. Effort: Small.
  - **B.** Deploy from a trusted workflow. The pull request run builds with no secrets. A `workflow_run` workflow on `main` deploys that build as data, with the preview tool and Wrangler of `main`. The environment `preview` allows only `main`. The workflow must skip runs of forks and of Dependabot from the event data. It must check that the commit is the head of an open pull request. Its concurrency group names the pull request. A change to the preview tool reaches previews only after it merges, and the first real run comes after this change merges. The running Workers still share the keys. Effort: Medium.
  - **C.** As B, and give each preview its own session key and encryption key at its first deploy. Each signed token and each encrypted value also needs rows in the database of its own preview, so C adds little. Effort: Medium.
  - **D.** Keep every real key out of previews with option E of decision 2. Effort: Large. Ruled out by the answer of the user on 10 November 2026, which asks for a real preview GitHub App and the real Boat service.
  - **E.** As C, and give each preview its own attachment bucket, Boat environment, and Boat key, made by the trusted workflow at the first deploy. The delete then removes all sandboxes and snapshots of that environment, and the environment, the key, and the bucket. A running preview then shares only the GitHub App key. Only a Boat account key with `account.admin` can make keys, so E needs a Boat user who belongs only to the preview organization, and decision 4 B. Effort: Large. Added by the second options check.
  - **F.** As E, but one trusted proxy Worker, deployed only from `main`, holds the one preview Boat key. Each preview gets its own proxy token, and the proxy refuses each sandbox and snapshot that the preview did not make. It needs product code, because `worker/sandbox/transport.ts` fixes the Boat address. Effort: Large. Added by the second options check.
- **Left out:**
  - A required approval of each run. The repository is public, so GitHub Team offers it. But it adds a manual step to each push and each close, and the approver cannot see a compromised package. The second options check corrected the first reason.
  - A token broker, because its short-lived token still writes every preview.
  - One GitHub App for each preview, because GitHub registers each app by hand.
- **Wider fix:** E. It is the only option that also keeps a running preview to its own credentials and resources. It is blocked, because it needs a new Boat user and decision 4 B.
- **Previous examples:**
  - `calummoore/twilight-timer` PR #4, review finding 1, recommended the split of build and deploy.
  - The deploy workflow keeps its token in an environment that only `main` can use.
- **Related:** Decision 1: its option C uses the same trusted workflow in the live account. Decision 2: its option E removes the real keys. Decision 4: E needs its option B.
- **Recommendation:** A. B protects only against branch authors who already hold the admin GitHub token, and it adds a workflow that forks can start. The first recommendation and both options checks chose B. E best protects the previews.
- **Action:** ask the user, because the options trade the reach of a bad branch against a privileged workflow, a slower path for changes to the preview tool, and new Boat setup.
- **Answer so far:** On 10 November 2026 the user asked for a preview GitHub App to test with, which sends GitHub events to every preview and redirects correctly, with the real Boat service. That ruled out D and added the relay of the design.
- **Chosen:** A, by the user on 10 November 2026.

### 4. Choose the Boat account for preview sandboxes

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. The options check of 10 November 2026 found it. A second options check on the same day widened it.
- **Category:** Process.
- **Location:** None. The choice is a Boat setting and its cost.
- **Terms:**
  - **Boat plan:** the monthly price of a Boat organization. It sets the included VM hours, the sandboxes at once, the starts, and the saved snapshots.
- **Background:**
  - The first design gave previews a Boat organization of their own. No decision chose it, or its cost.
  - A Boat organization pays its plan from its first day, with no trial. The smallest plan costs $20 a month. It includes 555 VM hours, 100 sandboxes at once, 200 starts a day, and 10 saved snapshots. Each more snapshot costs $0.056 a day. With an empty wallet, a save above the included count fails.
  - One organization has one plan and one wallet. Its starts, its sandboxes at once, and its saved snapshots cover all its keys.
  - A key that is limited to a Boat environment reaches only the sandboxes of that environment.
  - Every preview Worker, and under decision 3 A every pull request run, holds the preview Boat key. So the account decides what a bad branch can use up.
  - `docs/protocol/isolation.md` requires that the app's Boat organization holds no other Boat work of the operator. The live app still runs in the shared "Firna" organization, as `plans/follow-ups/separate-boat-organization.md` says.
  - Shared assumption: previews need real Boat sandboxes. Source: decision 2 D. Kept. Decision 3 D drops it.
  - Shared assumption of A and B: the live app stays in "Firna" during this work. Source: decision 137 A of 8 November 2026. Its reason is weaker now, because the protocol and two follow-ups ask for the move before users arrive. C drops it.
- **Problem:** No decision names who pays for preview sandboxes, or whose limits they use.
- **Impact if no action:** Previews either add a monthly cost that nobody chose, or use up the starts, the wallet, and the saved snapshots of the live app.
- **Root question:** Where should preview sandboxes run and bill, so that no pull request can use up what the live app needs from Boat? The second options check gave this question.
- **Options:**
  - **A.** A key in the live Boat organization, limited to an environment for previews. No new plan. Previews share the wallet, the starts, the sandboxes at once, and the saved snapshots of the live app. It also breaks the rule of `docs/protocol/isolation.md`, so it needs a protocol decision. Effort: Small.
  - **B.** A Boat organization for previews, on the $20 plan. Previews get their own wallet and limits. It costs $20 a month from its first day. Effort: Small.
  - **C.** First move the live app to a new organization of its own, as option B of `plans/follow-ups/separate-boat-organization.md` says. Then make the preview key in "Firna", limited to an environment for previews. A bad branch can then use up the limits of the other Firna work, but not those of the live app. Each live org image needs a new build, and test workspaces lose their sandboxes. Effort: Small. Added by the second options check.
- **Left out:**
  - Fakes in place of Boat, because decision 3 D holds them.
  - One organization for each preview, because each costs $20 a month.
  - A capped member in the live organization, because a seat costs the plan price, and member caps do not limit starts or saved snapshots.
  - The personal Boat account of the user, because an account key can name any organization of its user, so a bad branch could bill the live organization.
- **Wider fix:** B. A separate payer keeps each later preview, and each bad branch, away from the limits of the live app. The second options check changed this from None.
- **Previous examples:** Decision 137 A of the Boat-native plan kept the live app in the shared "Firna" organization. `plans/follow-ups/separate-boat-organization.md` records the move to an organization of its own.
- **Related:** Decision 3: its option E needs B.
- **Recommendation:** B. With A, any branch can use up the starts of the live app for up to a day, spend its wallet, and fill its saved snapshots. C is the better choice if the live app moves before launch anyway, and the other Firna work can share its limits with previews.
- **Action:** ask the user, because B adds a monthly cost, A needs a protocol change, and C moves the live app. Only the user can make an organization or a key.
- **Chosen:** the user provides the preview Boat key and its organization, on 10 November 2026. The docs ask for a key limited to one environment, in an organization that holds no live work. A key in the live organization would share its starts, wallet, and saved snapshots, and would break the rule of `docs/protocol/isolation.md`.

## Design

Each item is an agent call of 9 or 10 November 2026, unless it says
otherwise. The user can override any of them.

**Account and settings.**

- Previews run in a separate Cloudflare account on the Workers Paid plan.
  Reason: decision 1 B. The free plan allows 10 D1 databases and 5 cron
  triggers, and 16 pull requests were open on 10 November 2026.
- The preview zone is a domain of the user's choice in that account. The
  workflow reads it from the variable `PREVIEW_ZONE`.
- A response header rule of the zone adds `X-Robots-Tag: noindex` to each
  response. Reason: previews stay out of search results, and Cloudflare
  adds the header itself only on `workers.dev`. A zone rule needs no
  product code.
- The GitHub environment `preview` holds the settings. It has no
  deployment branch rule, so each pull request run of this repository can
  read it, as decision 3 A says. Runs of forks and of Dependabot get no
  secrets.
  - Secrets: `CLOUDFLARE_API_TOKEN`, `GITHUB_CLIENT_SECRET`,
    `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`,
    `SESSION_SIGNING_KEY`, `BOAT_KEY_ENCRYPTION_KEY`, and `BOAT_API_KEY`.
  - Variables: `CLOUDFLARE_ACCOUNT_ID`, `PREVIEW_ZONE`, `GITHUB_CLIENT_ID`,
    `GITHUB_APP_SLUG`, `BOAT_ORG_ID`, `OPERATOR_GITHUB_IDS`, and the
    optional `CONDUCTIVE_FRAME_SOURCES`.
- `OPERATOR_GITHUB_IDS` names the GitHub user ID of each person who tests
  previews. Reason: a new account waits for app access, and the sign-in of
  an operator gives app access, as `docs/protocol/waitlist.md` says.
  Every preview database starts empty.
- The models, the default choice, and the title model come from the
  variables of `wrangler.jsonc` in the build. Reason: the build config
  already holds them, so a preview offers the models of its own commit.
- With none of the required settings, a run warns, deploys nothing, and
  succeeds. With only some of them, the run fails and names the missing
  ones. Reason: the always-on rules ask to warn and continue for
  recoverable input. The deploy workflow uses the same rule.
- The preview GitHub App is its own app, with the permissions and the
  webhook events of the live app. Its one callback URL is
  `https://<preview zone>/api/auth/github/callback`, with wildcard matching
  on. Reason: one app then signs users in on every preview hostname, with
  no relay for sign-in.
- Its Setup URL is `https://<preview zone>/github/setup`, and its webhook
  URL is `https://<preview zone>/v1/github/webhooks`, with the secret
  `GITHUB_WEBHOOK_SECRET`. The relay below serves both. Its user
  authorization during an install stays off, as for the live app. Changed
  on 10 November 2026 by the answer of the user, who asked for events in
  every preview and correct redirects. The first design had no webhook and
  no Setup URL.
- The tool prints a GitHub App manifest for the zone, so the user makes
  the app in one step on GitHub. The user then turns on wildcard matching
  for the callback URL, because a manifest cannot set it. The docs list
  the permissions and the events, which the user confirms against the live
  app. Reason: the user asked to make a preview app in GitHub.
- The zone holds only hostnames that the preview Workers, the relay, and
  the runner bucket serve. Reason: with wildcard matching, a sign-in code
  can go to any subdomain of the zone.
- Previews use a Boat key of their own, with the actions of
  `worker/sandbox/README.md`, limited to one environment. Decision 4
  chooses its Boat organization. `SANDBOX_PROVIDER_ACCOUNTS` stays unset,
  as in production. Reason: the live key reaches every live sandbox.
- All previews share one private R2 bucket for chat attachments,
  `conductive-preview-attachments`, in Western Europe. Reason: each object
  key starts with the org ID, so honest previews do not meet, and one
  bucket needs no create or delete in each run. The code of any preview can
  still read every object of the bucket, as decision 3 says.
- Workers AI of the preview account writes the workspace titles. Reason:
  the build config binds `AI`, and the use is small.
- All previews share one session key and one encryption key, which the
  user makes once. Reason: each preview has its own database, so a shared
  key reaches only preview data.
- Docs advise an agent login with a spending limit in previews. Reason:
  the code of any open pull request can read the logins used in any
  preview, as decision 3 says.

**Names and hostnames.**

- For pull request `<n>`, the Worker and the D1 database are both named
  `conductive-pr-<n>`. The database gets the location hint for Western
  Europe. Reason: the Durable Objects also run in Western Europe.
- The marketing hostname is `pr-<n>.<preview zone>`, the app hostname is
  `pr-<n>-app.<preview zone>`, and the machine hostname is
  `pr-<n>-api.<preview zone>`. Reason: one subdomain level stays inside
  the free certificate of the zone.
- Each hostname is a route of the preview Worker, on a proxied wildcard
  DNS record of the zone. Reason: a zone allows 100 Workers custom domains
  but 1,000 routes. Three custom domains for each preview would allow only
  33 previews, and each new custom domain waits for its own certificate.
- The variables set `APP_ORIGIN`, `MARKETING_ORIGIN`, and `MACHINE_ORIGIN`
  to those origins, and `GITHUB_INSTALL_STATE_PREFIX` to `pr-<n>`.
  `PREVIEW_DOMAIN` stays unset. The bare zone belongs to the relay. Reason: the Worker reads
  each hostname from its variables, so previews need no product code
  change. Without `PREVIEW_DOMAIN`, a port preview answers
  `503 preview_unavailable`.
- The sign-in screen still links the Terms and Privacy pages of
  `conductive.build`. Reason: `docs/mockups/src/brand.ts` holds the product
  domain as a constant, and the marketing hostname of a preview still
  shows its own pages.
- Previews get no Resend key. An invite then fails with the existing
  `502 invite_email_failed` error, but the invitation stays pending. The
  invited person signs in with a GitHub account that has the invited
  address as a verified email, and accepts it in the app, as
  `docs/protocol/orgs-and-members.md` says. An approval still gives app
  access.
  Reason: invitation and approval emails come only from
  `invites@mail.conductive.build`, so a key would let preview code send
  mail as the live product. Changed on 10 November 2026 by the options
  check: the brainstorm call gave previews an email key.
- Previews keep the waitlist of the live app. Other people who sign in
  wait, and an operator can approve them.
- No protocol doc, architecture doc, legal page, or public guide changes.
  Reason: previews change no product requirement. The one product code
  change below keeps the behaviour of the live app.

**Build and deploy.**

- `.github/workflows/preview.yml` runs on the pull request events opened,
  synchronize, reopened, and closed. It also runs the sweep on a daily
  schedule and on a manual run. It skips pull requests from forks and from
  Dependabot with a notice. Reason: their runs get no secrets.
- The runs of one pull request share one concurrency group. They queue,
  and no run cancels another. GitHub keeps only the newest waiting run, so
  a burst of pushes deploys the newest commit. Reason: a cancelled delete
  can stop after its Boat and attachment steps, and leave database rows
  for resources that no longer exist. Changed on 10 November 2026 by the
  options check: the first design let a new push or a reopen cancel a
  running run.
- A build job with no secrets runs `npm ci` and `npm run build`. It
  uploads `dist/` and `migrations/` as an artifact for one day. Reason:
  the install scripts and the build plugins of the packages of a pull
  request then never run next to the token.
- A runner job with no secrets packages the runner archive with
  `--base-url https://runner.<preview zone>/`. It asks the public bucket
  whether that digest exists, with a query string on the request, so that
  the answer never enters the cache of the archive URL. Only a missing
  archive goes into an artifact for one day. Reason: the archive is
  319 MiB, and most pull requests do not change it.
- Changed on 10 November 2026 during planning: the brainstorm call let a
  pull request publish its own archive only when it changed `runner/` or
  `image/`. Now each run packages the archive. Reason: the runner bundle
  also takes code from `src/shared/`, so a path filter can miss an input.
  The packager gives the same digest for the same input, so an unchanged
  runner reuses the archive in the preview bucket.
- The deploy job uses the environment `preview`, and it sets the
  environment URL to the app hostname.
- The deploy job runs in the pull request run, as decision 3 A says. It
  runs the workflow file and the preview tool of the branch next to the
  token. Corrected on 10 November 2026 by the options check: the first
  design said that no package code of a pull request runs next to the
  token.
- The deploy job installs the packages of `main` in a temporary folder,
  with `npm ci --ignore-scripts`, and runs that Wrangler. It unpacks the
  build in the temporary folder of the runner, never in its working
  folder. Reason: no package of the branch, no install script, and no
  `.env` file of the build runs or loads next to the token. Added on
  10 November 2026 from the second options check.
- The config writer builds the preview config from an allow list of keys
  and fixed paths. It fails with a clear error for an unknown binding, a
  binding with `script_name`, or a migration other than new classes.
  Reason: a branch must not bind the Durable Objects of another preview,
  and a binding that the preview account cannot serve must fail early.
  A pull request that adds a binding adds it to the allow list too.
  Added on 10 November 2026 from the second options check.
- The deploy job runs the preview tool in this order:
  1. It creates the D1 database, or it finds the one from an earlier run.
     When a migration that the database applied has changed or gone, it
     runs the Boat and attachment steps of the delete, then creates the
     database again. The comment then says that the preview data was
     reset. Reason: Wrangler records only the name of each applied
     migration, so a changed migration would not apply again. The tool
     keeps the SHA-256 of each applied migration in a table of its own in
     the preview database. Added on 10 November 2026 from the options
     check.
  2. It writes a Wrangler config beside the built config in
     `dist/conductive/`. The config keeps the bindings and the migrations
     of the build. It changes the name, the routes, the variables, the D1
     database, the attachment bucket, and `keep_vars`. It drops
     `PREVIEW_DOMAIN`.
  3. It applies the D1 migrations with that config.
  4. It uploads a missing runner archive to the preview bucket through
     the S3 API of R2, as `.github/workflows/deploy.yml` does.
  5. It deploys with `wrangler deploy --config <file> --secrets-file <file>`,
     with the short commit as the tag. The secrets file lives in the
     temporary folder of the runner, and the job deletes it.
  6. It checks that `/api/health` on the app hostname answers
     `{"status":"ok"}` within 2 minutes. Reason: a new route can need
     some seconds to reach every Cloudflare location.
  7. It adds `pr-<n>` to the registry of the relay.
- A dry run of steps 2 and 5 on `main` at `fe295f38` passed on
  10 November 2026, with the routes, the attachment bucket, and all 32
  migrations. Evidence: `.context/pr-previews/proof/dry-run.log` and
  `migrations-list.log`.
- One bot comment on each pull request holds the links, the commit, and
  the state: deploying, live, failed with a link to the run, or deleted.
  Each run edits that comment. A hidden marker finds it.
- A new preview starts empty. The user signs in, makes an org, and builds
  its image in each preview. Reason: previews that share a seed image can
  break when one preview rebuilds it. A seed can come later.

**GitHub events and install returns.**

Added on 10 November 2026 from the answer of the user to decision 3.

- One relay Worker, `conductive-preview-relay`, serves the bare preview
  zone. It deploys only from `main`, on each push that changes it and on a
  manual run. Reason: a GitHub App has one webhook URL and one Setup URL,
  so one trusted Worker must hand each event and each install return to
  the right preview.
- On `POST /v1/github/webhooks`, the relay checks the GitHub signature
  with `GITHUB_WEBHOOK_SECRET`. It answers GitHub at once, then sends the
  raw body and the GitHub headers to `/v1/github/webhooks` on the machine
  hostname of every live preview. Each preview checks the signature
  again, keeps the events of its own repositories, and answers a repeated
  delivery from its stored receipt, as `worker/github/README.md` says. Reason: GitHub waits at most
  10 seconds for an answer. A preview that misses an event still reads the
  state of its pull request bar when a tab opens.
- The relay finds the live previews in a KV namespace, which the relay
  deploy creates when it is missing. The deploy adds `pr-<n>`, and the
  delete removes it. The sweep removes each entry with no Worker. Reason:
  the relay then needs no Cloudflare token.
- The relay sets the compatibility flag `global_fetch_strictly_public`.
  Reason: a Worker cannot call a Worker on a route of the same zone
  without it, as the Cloudflare docs on custom domains say.
- On `GET /github/setup`, the relay reads `state` as `pr-<n>.<source>`.
  It sends the user to `/github/setup` on the app hostname of `pr-<n>`,
  with `state` set to `<source>` and the other GitHub values unchanged.
  It refuses any other `state` with a short page. Reason: only a known
  preview hostname can be the target, so the relay is no open redirect.
- `GET /` on the relay lists the live previews with their links.
- Product code change: a new optional Worker variable,
  `GITHUB_INSTALL_STATE_PREFIX`, puts `state=<prefix>` on the install URL
  of the API. `githubInstallLink` in `src/shared/github-setup.ts` then
  keeps that value as a prefix: `<prefix>.<source>`. Without the variable,
  the link stays as today. Each preview sets it to `pr-<n>`. Reason: the
  `state` of an install is the only value that GitHub gives back to the
  Setup URL.

**Delete and sweep.**

- A close or a merge runs the delete, in this order:
  1. It removes `pr-<n>` from the registry of the relay, and it reads the
     org IDs and the image build IDs from the preview database.
  2. It deletes each Boat sandbox whose `org` label names one of those
     orgs, and each saved snapshot of one of those builds. It names a
     snapshot with the helper in `worker/lifecycle/image-names.ts`.
  3. It deletes each attachment object under `attachments/<org ID>/` of
     those orgs.
  4. It deletes the Worker and its routes.
  5. It deletes the D1 database.
- A failed step stops the delete, so a rerun or the sweep finds the
  resources again. Reason: the database is the only record of the Boat
  resources and the attachments of a preview.
- The daily sweep lists the Workers and the D1 databases named
  `conductive-pr-<n>`. It runs the delete for each pull request that is
  closed. Reason: a missed close event must not leave resources that Boat
  and Cloudflare bill.

**Scope limits.**

- Port previews stay out. Reason: a preview needs a preview domain of two
  levels, which needs a second domain and a certificate add-on. The
  post-merge section holds the task.
- The Mac app stays out. Reason: a preview build would share the
  `conductive://` sign-in address with the installed Mac app. Mac CI
  already tests each change to it.

**Code and tests.**

- The preview tool is TypeScript for Node 24, in `tools/pr-previews/`. It
  has the commands `deploy`, `delete`, `sweep`, `relay`, and `manifest`.
  The relay Worker lives in `tools/pr-previews/relay/`. Reason: the
  workflow stays short, and the logic gets unit tests.
- Unit tests cover the logic with fake command and HTTP replies: the
  config, the hostnames, the settings check, the comment, the choice of
  resources to delete, the sweep, the relay fan-out, and the relay
  redirect. No test reads the workflow YAML, as
  the `testing` skill says. The workflow is checked once with actionlint,
  and by its runs.
- The deploy workflow merged on 9 November 2026 in pull request #82. This
  plan reuses its `--base-url` option and fixed file modes of
  `image/package-runner.mjs`, and the S3 upload steps of
  `.github/workflows/deploy.yml`. Changed on 10 November 2026: the
  brainstorm call waited for that merge, which has now happened.

## Setup by the user

The workflow skips each run until this setup exists. `docs/pr-previews.md`
gives each step.

- [ ] Make a Cloudflare account for previews, on the Workers Paid plan.
- [ ] Add a domain for previews as a zone of that account.
- [ ] Add a proxied DNS record for the bare zone, and a proxied wildcard
      DNS record.
- [ ] Add the response header rule `X-Robots-Tag: noindex` to the zone.
- [ ] Make the R2 bucket `conductive-preview-runner`, with the public
      custom domain `runner.<preview zone>`.
- [ ] Make the private R2 bucket `conductive-preview-attachments`, with
      the location hint for Western Europe.
- [ ] Make a Cloudflare API token for that account, as the docs say.
- [ ] Make the preview GitHub App from the manifest that the tool prints.
      Turn on wildcard matching for its callback URL. Install it on test
      repositories.
- [ ] Give the preview Boat key and its organization ID, as decision 4
      says.
- [ ] Make the GitHub environment `preview` with its secrets and
      variables, and with no branch rule.
- [ ] For the smoke test of Milestone 7, put a token of the preview
      account in this workspace.

## Milestone 1: Documentation

Depends on: none

The docs state what a preview is, its setup, its relay, and its life.

- [ ] Add `docs/pr-previews.md`. Give what a preview is and when it runs,
      the hostnames, and what works and what does not.
- [ ] In the same page, give the setup by the user with each setting, each
      token permission, and the permissions and events of the preview
      GitHub App.
- [ ] In the same page, warn that the code of any open pull request can
      reach the data and the logins of every preview, and the relay. Ask
      for agent logins with a spending limit, and for the preview GitHub
      App only on test repositories, as decision 3 A says.
- [ ] In the same page, give the relay, the life of a preview, the sweep,
      a recovery by hand, and the costs.
- [ ] `docs/deployment.md`: add the optional variable
      `GITHUB_INSTALL_STATE_PREFIX`. Link the new page, and say that a
      preview sets the same inputs with its own values.
- [ ] `README.md`: name previews in the status and in the CI paragraph.
- [ ] `AGENTS.md`, "CI": add the preview workflow and its link.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 2: Install state prefix

Depends on: 1

An install from a preview returns to that preview through the relay. The
live app keeps its behaviour.

- [ ] Add `GITHUB_INSTALL_STATE_PREFIX` to `worker/env.ts`. Put
      `state=<prefix>` on the install URL of the API when it is set.
- [ ] Make `githubInstallLink` keep a `state` of the install URL as the
      prefix `<prefix>.<source>`.
- [ ] Add tests for the link with and without a prefix, and for the
      install URL of the API, and see each fail once.

## Milestone 3: Preview configuration

Depends on: 1

The preview tool computes the names, the hostnames, the settings, and the
Wrangler config of a preview.

- [ ] Add `tools/pr-previews/` with the settings check, the names and
      hostnames, the config writer with its allow list, and the secrets
      file writer, as the design says.
- [ ] Add unit tests for each, and see each fail once.
- [ ] Add the tool to the type check, the lint, Vitest, and the exports
      check.
- [ ] Add `tools/pr-previews/README.md` with the commands and the key
      code.
- [ ] Run a dry run of a generated config. Save the output under
      `.context/pr-previews/`.

## Milestone 4: Deploy, delete, and sweep commands

Depends on: 3

The tool deploys, deletes, and sweeps previews.

- [ ] Add `deploy`: the D1 database with its reset after a changed
      migration, the migrations, the runner archive, the deploy, the
      health check, and the registry entry.
- [ ] Add `delete`: the registry entry, the Boat sandboxes and snapshots,
      the attachments, the Worker and its routes, then the database. A
      failed step stops it.
- [ ] Add `sweep`: the list of preview Workers, databases, and registry
      entries, and the delete of each closed pull request.
- [ ] Add unit tests with fake command, Boat, Cloudflare, and GitHub
      replies, and see each fail once.

## Milestone 5: Relay and GitHub App manifest

Depends on: 4

The relay gives GitHub events and install returns to every preview. The
tool prints the manifest of the preview GitHub App.

- [ ] Add the relay Worker: the signature check and the fan-out of
      webhooks, the redirect of install returns, and the list of previews.
- [ ] Add the `relay` command, which creates the KV namespace when it is
      missing and deploys the relay.
- [ ] Add the `manifest` command, which prints the manifest for a zone.
- [ ] Add unit tests with fake GitHub deliveries, KV entries, and preview
      replies, and see each fail once.

## Milestone 6: Preview workflow

Depends on: 2 and 5

`.github/workflows/preview.yml` runs the tool for each pull request, and
deploys the relay from `main`.

- [ ] Add the workflow with its triggers, permissions, concurrency, and
      jobs: build, runner, deploy, delete, sweep, comment, and relay. The
      deploy, delete, and comment jobs run in the pull request run, as
      decision 3 A says.
- [ ] Skip forks and Dependabot with a notice. Warn and skip without the
      settings.
- [ ] Install the packages of `main` for the deploy job in a temporary
      folder, and unpack the build there.
- [ ] Check the workflow once with actionlint. Save the output under
      `.context/pr-previews/`.

## Milestone 7: Smoke test

Depends on: 6, and the setup by the user

A real preview works, its relay works, and the delete leaves nothing
behind.

- [ ] Deploy the relay and a preview for the test number 0 with the tool
      from this workspace.
- [ ] Check the health route, the marketing page, the app page, and the
      machine hostname.
- [ ] Check that GitHub accepts the sign-in redirect of the app hostname.
- [ ] Send a signed test delivery to the relay, and check that the
      preview records it.
- [ ] Check that the relay sends `state=pr-0.get-started` to
      `/github/setup` of the preview, and refuses another `state`.
- [ ] Delete the preview. Prove that no Worker, route, D1 database,
      Durable Object storage, attachment, Boat sandbox, saved snapshot, or
      registry entry remains. If a route or Durable Object storage
      remains, add its delete to the tool first.
- [ ] Save the evidence under `.context/pr-previews/`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Check the first real preview of the next pull request: the links,
      the comment, sign-in, an install, an org, an image build, a
      workspace, chat, the terminal, and a live update of the pull request
      bar.
- [ ] Check that the preview of this pull request was deleted when it
      merged, and that the first daily sweep passed.
- [ ] Add port previews to previews: a second domain for preview
      hostnames, a certificate add-on for two-level hostnames, and the
      variable `PREVIEW_DOMAIN` of each preview.
