# Public port previews

Status: Active. On branch `calummoore/port-preview-authentication-toggle`,
no pull request yet. The pull request that completes the work deletes
this plan, as the `plans` skill says.

Today each request to a port preview needs the credential cookie of that
preview (decision 83). A request that cannot carry the cookie gets 404.
Examples are CORS preflights, cross-origin calls from another preview,
webhooks, `curl`, mobile apps, and people outside the org. On
11 November 2026 the user asked for "a toggle for authenticated or not for
port previews", because "authentication can break some apps". That
message chooses the approach: a switch on each preview that turns its
sign-in check off.

This change adds the switch, the public path of the preview proxy, and
the docs. Decisions 1 to 5 below are open. Decision 1 chooses where
public previews live. Decision 2 chooses which headers of the previewed
app pass the proxy, because the header lists break some apps also in a
public preview. The change does not cover stable links that outlive a
stop, or port forwarding to a Mac. The brainstorm "Preview Links & Port
Forwarding" of 9 November 2026 holds those questions, and they stay
unanswered.

Contract owners:

- [Terminal, previews, and desktop](../docs/protocol/terminal-previews-and-desktop.md#port-previews).
- [Port previews](../docs/protocol/port-previews.md).
- [Mac app](../docs/protocol/desktop-app.md#port-previews).
- [Previews and their viewers](../docs/protocol/suspension-workspaces.md#previews-and-their-viewers).
- The [preview backend README](../worker/previews/README.md).
- The [Preview tool README](../src/previews/README.md).

## What breaks today

- The proxy refuses each request without a valid credential cookie,
  before any sandbox call, at `worker/previews/proxy.ts:83-97`. These
  requests never carry the cookie:
  - CORS preflights, because a browser sends no cookie with a preflight.
  - Cross-origin calls in the default credentials mode, such as a
    frontend on one port that calls an API on another port. The
    [preview backend README](../worker/previews/README.md) says so.
  - The web app manifest, which a browser fetches without cookies by
    default.
  - Webhooks, `curl`, Postman, and mobile apps.
  - A browser that did not load the launch address in that cookie
    partition, such as a phone or the browser of a teammate.
- People outside the org cannot open a preview at all.
- A second cause: the proxy forwards only 14 request headers and 15
  response headers, at `worker/previews/headers.ts:8-40`. It drops
  `Authorization`, each `X-` header, `WWW-Authenticate`, and framework
  headers such as `Next-Action`. So token sign-in, HTTP Basic sign-in,
  CSRF headers, and Next.js server actions fail, also with a valid
  cookie. Decision 2 covers this cause.

## Approaches not chosen

The task message chose the switch. These approaches came up in the
research on 11 November 2026, and they stay out of this change:

- A secret token in a header or a query, for programs. GitHub Codespaces
  (`X-Github-Token`), Microsoft dev tunnels (`X-Tunnel-Authorization`),
  and Vercel (`x-vercel-protection-bypass`) work this way. It keeps a
  check that a stranger or a webhook without the secret cannot pass.
- Preflights with no cookie check, as the OPTIONS Allowlist of Vercel
  does. It fixes only the preflight. The call after the preflight still
  needs a cookie.
- Port forwarding to localhost in the Mac app. It is item 1 of the
  9 November brainstorm, and it serves only the Mac app.
- The public address of Boat, from `host <port> --public` in the sandbox.
  Each answer must come from the relay (decision 219). Boat keeps such an
  address through each stop and resume. The app must never name Boat.
- No change, with a same-origin proxy in the dev server. It fails
  webhooks and people outside the org.

Sources:
[GitHub Codespaces port forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace),
[Coder port forwarding](https://coder.com/docs/admin/networking/port-forwarding),
[VS Code port forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding),
[dev tunnels security](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/security),
[Vercel protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection),
and [Boat public URLs](https://docs.boat.dev/hosting.md). The help of
`conductor preview set` says that the preview URL of Conductor needs
sign-in too.

## Design

These points hold for each option of the decisions below. Each point is
my call, made on 11 November 2026, unless a decision says otherwise.

- The switch belongs to one preview, not to a port or a workspace.
  Reason: each open gets a new ID and a new hostname (decision 86). So a
  forgotten public choice never comes back by itself.
- A new preview is private. Reason: the sign-in check stays the safe
  default. Codespaces, VS Code, and Coder also start each port private.
- Each member who may close a preview may also turn its switch off.
  Reason: a close already ends public access.
- A public preview keeps each end of a preview: a stop, a close, 24 hours
  after its open, and each suspension that ends previews. A change of the
  switch does not reset the 24 hours. Reason: these ends are requirements
  in force.
- When the switch turns off, public access ends at once. The workspace
  closes each connection that came without a credential cookie, as a
  revocation does. Members with a cookie keep their access.
- Each public request and each data batch reads the preview, its public
  state, and the shared sandbox access rule again. Reason: a stop or a
  suspension must end public access as fast as it ends the access of a
  viewer. Decision 3 says whether the check also reads the access of the
  member who turned the switch on.
- Decision 5 says whether public requests count as activity.
- The proxy still strips each credential cookie, the `_port_auth` cookie
  of Boat, and the reserved app cookies from public requests.
- The frame and "Open" of a public preview load its public address
  directly, with no launch page. Reason: a member then sees what a
  visitor sees, and the frame needs no third-party cookie.
- Only a public preview shows "Copy link". Reason: a copied address of a
  private preview gives no access, as the
  [public guide](../src/marketing/docs/terminal-and-previews.md) says.
- Each open tab of the workspace shows the current state of the switch.
  A new workspace event, `preview.updated`, carries the new state of one
  preview. Reason: a member must not miss that another member made a
  preview public.
- The Mac app opens a public preview in the default browser at its
  public address, with no grant.
- The operator search takes each public preview address, also the
  address of a preview that ended. When each turn-on makes a new address,
  a record keeps each past address. Reason: the Terms ask an abuse
  reporter for the address of the preview.
- No code on a public preview domain sets a cookie with a `Domain`
  attribute. Reason: a later entry of that domain on the Public Suffix
  List then needs no change of code.

## Decisions

An options check on 11 November 2026 added options to each decision. It
changed the recommendations of decisions 3 and 4. Its report is
`.context/public-port-previews/options-check-report.md`.

These terms hold for all five decisions:

- **Preview:** one open of one port of the cloud computer of a
  workspace, with a random hostname on `conductive.page`.
- **Credential cookie:** the cookie that lets one browser partition open
  one preview, for one signed-in member. The authorizer sets it.
- **Private preview:** a preview whose switch is off. Each of its
  requests needs a credential cookie.
- **Public preview:** a preview whose switch is on. Its address needs no
  cookie and no sign-in.
- **Preview proxy:** the Worker code that checks each request to a
  preview hostname, then sends it to the relay in the sandbox.
- **Workspace object:** the Durable Object of one workspace. It runs the
  preview proxy and also serves the chat of the workspace.

### 1. Public previews would share the site of private previews

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Security.
- **Location:** `PREVIEW_DOMAIN` in `wrangler.jsonc:32`, the hostname
  check in `worker/previews/proxy.ts:70-82`, and "Port previews" in
  `docs/protocol/terminal-previews-and-desktop.md`.
- **Terms:**
  - **Site:** a registrable domain, such as `conductive.page`. Page code
    on one hostname of a site can set cookies for each hostname of that
    site.
  - **Public Suffix List:** a list that browsers use to find where a site
    starts. Each hostname below a listed name is a site of its own.
- **Background:**
  - Each preview of each org has a hostname one level under
    `conductive.page`. That domain is one site. It is not on the Public
    Suffix List, because the authorizer sets its cookie for the whole
    domain.
  - Today only members of an org can load the code of its previews. A
    person in two orgs already runs the code of both orgs on one site.
  - A public preview lets anyone load sandbox code.
  - The protocol relies on the rule that another site gets no credential
    cookie. A public preview on `conductive.page` is not another site.
  - Abuse, such as a phishing page, can make browsers flag a domain, or
    make its host suspend it. Such an action can hit the whole domain.
  - Each option gives a public preview a hostname with 128 random bits.
    Each option sends public requests through the same proxy and relay.
- **Problem:** On `conductive.page`, the code of a public preview runs on
  the site of each private preview. It can set cookies that reach the
  private previews of a member of another org. It can also send requests
  to a private preview whose hostname it learned, and the browser of the
  member adds the credential cookie. An abuse action against one public
  page can stop each preview.
- **Impact if no action:** A stranger's page can plant cookies in the
  dev apps of a member, such as a fixed sign-in session, or send requests
  as that member. A flagged or suspended domain stops the previews of
  each org.
- **Root question:** Where do public previews live, so that the code and
  the content of one public preview cannot harm private previews or the
  previews of other orgs?
- **Options:**
  - **A.** Keep the domain and the hostname. The switch changes only the
    access rule of the hostname. Effort: Large.
    - This is the smallest job: no new domain, DNS record, or
      certificate.
    - The cookie, request, and abuse risks above stay.
    - A hostname that leaked while private becomes a working address.
      Decision 83 records that page requests send the hostname to other
      sites in `Origin`.
  - **B.** Keep the domain. Give a public preview a new hostname at each
    turn-on. The private hostname keeps working for members.
    Effort: Large.
    - No leaked hostname becomes a working address.
    - The cookie, request, and abuse risks above stay.
    - The cookies of the previewed app do not move to the new hostname.
      So its sign-in in the frame starts again once.
  - **C.** B on a second registrable domain only for public previews,
    such as `conductive.site`. Effort: Large.
    - The code of a public preview never runs on the site of private
      previews.
    - An abuse action against the public domain leaves private previews
      working.
    - The user buys the domain and adds it to Cloudflare. The Worker
      gets a route and host checks, the app gets a frame rule, and the
      Mac app gets a frame origin.
    - Public previews of different orgs still share one site.
  - **D.** C, and ask for the public domain on the Public Suffix List.
    Effort: Large.
    - Each public hostname is then a site of its own. No public preview
      can set cookies for another.
    - The list declines most small, test, or beta projects, and projects
      with fewer than thousands of users. An entry needs more than two
      years of registration left. Review and browser updates have no
      fixed time.
  - **E.** C, with the public domain in a second Cloudflare account. A
    small Worker in that account takes each public request, and it calls
    the main Worker for each check and each body. Effort: Large.
    - An action against that account leaves the app and the private
      previews working.
    - It needs a second account, a service credential between the
      Workers, a second deploy, and one more hop for each request.
- **Left out:**
  - A listed suffix under `conductive.page`, such as
    `public.conductive.page`. It keeps one Cloudflare zone, so an action
    against one public page still stops each preview. Its two-level
    wildcard also needs a paid certificate. It fails the goal.
  - A site of its own for each preview, also each private preview. The
    protocol rejects a handoff on the preview hostname, so the authorizer
    must share one site with each private preview.
  - The public address of Boat. Each answer must come from the relay
    (decision 219), Boat keeps the address through each stop, and the
    app must never name Boat.
  - A tunnel that the sandbox starts, such as a Cloudflare quick tunnel.
    Its traffic never passes the Worker, so no check runs, and sandbox
    code can keep it open after a turn-off. It fails the goal.
  - A domain that each org owns. Each org must first set up DNS and a
    certificate, so it fails the goal of a switch. It can come later as
    its own feature.
  - A check of `Sec-Fetch-Site` that refuses requests from other preview
    hostnames. A planted cookie still reaches the private preview on the
    requests of the member, so it fails the goal.
- **Wider fix:** D. It also removes the shared site between any two
  public previews. The list can decline it, so C must be safe alone.
- **Previous examples:** Decision 6 put previews on their own
  registrable domain, so that preview code is never same-site with the
  app. ngrok (`ngrok-free.app`), Cloudflare quick tunnels
  (`trycloudflare.com`), Vercel (`vercel.app`), and Replit
  (`*.replit.dev`) serve user content on names that the Public Suffix
  List holds. GitHub Codespaces serves private and public ports on one
  site, `app.github.dev`, which the list does not hold.
- **Related:** Item 4: C, D, and E keep an abuse action away from private
  previews, so item 4 needs fewer limits.
- **Recommendation:** C. It keeps the code of public previews off the
  site of private previews, and abuse actions against it miss them, for
  the price of one domain. D protects most, but the list can decline it.
- **Action:** ask the user, because C, D, and E need a domain that only
  the user can buy, and each option trades speed against isolation.

### 2. Previews drop the headers of the previewed app

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `requestHeaders` and `responseHeaders` in
  `worker/previews/headers.ts:8-40`, and "Proxies and ports" in
  `docs/protocol/terminal-previews-and-desktop.md`.
- **Background:**
  - The protocol says that the proxies forward only an allowlist of
    headers and cookies.
  - The preview proxy forwards 14 request headers. It drops
    `Authorization`, each `X-` header, `User-Agent`, and framework
    headers such as `Next-Action` and `RSC`.
  - It forwards 15 response headers, apart from `Set-Cookie` and
    `Location`. It drops `WWW-Authenticate`, each `X-` header,
    `Content-Security-Policy`, and `Cross-Origin-Opener-Policy`.
  - So an API that reads a bearer token, a form with a CSRF header, HTTP
    Basic sign-in, and Next.js server actions fail in each preview.
  - The cookie filter already works as a block list. It passes each valid
    app cookie except the reserved names.
  - The proxy replaces `Cache-Control` with `no-store`. On 11 November
    2026 the user chose option C of
    [preview-no-store-full-reloads.md](follow-ups/preview-no-store-full-reloads.md):
    pass the `Cache-Control` of the app, with `private` added. The branch
    `calummoore/untitled-v4` applies it.
  - Each option keeps the Preview frame, which the protocol requires.
    Rails, Django, Spring Security, and helmet for Express forbid frames
    by default. Today the proxy drops those headers, so such apps show in
    the frame.
  - The public switch does not change these lists. *Guess:* some of the
    breakage that the user saw comes from these lists, not from the
    sign-in check.
- **Problem:** The sign-in headers and the framework headers of the
  previewed app do not reach the server or the browser. Such apps fail,
  also in a public preview.
- **Impact if no action:** Apps with token or header sign-in, and
  Next.js apps with server actions, stay broken after the switch ships.
- **Root question:** Which headers does the preview proxy pass, so that
  the app works as on localhost and no credential or viewer address
  reaches the sandbox?
- **Options:**
  - **A.** Keep the lists. The apps above stay broken. Effort: Small.
  - **B.** Add a fixed set of common app headers to both lists. Examples
    are `Authorization`, `WWW-Authenticate`, `X-CSRF-Token`,
    `X-Requested-With`, and the headers of Next.js, htmx, and Inertia.
    Effort: Small.
    - It keeps the allowlist rule.
    - An app with another custom header, such as `X-API-Key`, still
      fails.
  - **C.** Forward each header except a fixed block list, on each
    preview. Effort: Medium.
    - The block list holds the hop-by-hop headers, the Cloudflare and
      forwarding headers that carry the address of the viewer, `Host`,
      the headers of the relay, and `Clear-Site-Data`.
    - While the frame stays, the proxy also drops `X-Frame-Options`, and
      it removes the `frame-ancestors` directive from
      `Content-Security-Policy`.
    - The cookie filter stays. The protocol then states both filters as
      block lists.
    - It fixes each custom header at once.
    - It changes the allowlist rule of the protocol, and the review focus
      in `AGENTS.md`. A header that the block list misses reaches the
      sandbox, so the list needs a security review.
  - **D.** C for public previews only, and A or B for private previews.
    Effort: Medium.
    - It makes a user turn a preview public only to fix its headers.
      That exposes the app more than it needs.
  - **E.** B, and pass each header whose name starts with `X-`, `HX-`, or
    `Next-`, in both directions. The exceptions are `X-Forwarded-*`,
    `X-Real-IP`, `X-Conductive-*`, and `X-Frame-Options`. Effort: Small.
    - It keeps the allowlist rule.
    - It fixes `X-API-Key`, `X-CSRF-Token`, Inertia, htmx, and Next.js.
    - Names without these prefixes still fail, such as `apikey` and
      `Prefer` of a local Supabase stack.
  - **F.** B, and a list of more header names that an admin adds in the
    org settings. Effort: Medium.
    - It keeps the allowlist rule, and new browser headers stay out.
    - The user must first find the missing name, and the failure is
      silent.
    - It needs a setting, an API, a mockup, and a screen.
- **Left out:**
  - The relay as the place of the filter. The relay runs in the sandbox,
    and the filter must keep the address of the viewer and each
    credential out of the sandbox.
  - A notice that names each dropped header. It explains a failure but
    fixes no app, so it fails the goal.
- **Wider fix:** C. A new framework header then needs no change.
- **Previous examples:** Commit `33236e4a` added the two preflight
  request headers to the list, after review finding 6 of Milestone 11.
  The 9 November brainstorm noted that the proxy loses `Authorization`
  and custom headers.
- **Recommendation:** C, with the frame headers above. The previewed app
  then gets the headers that it sends, and the block list keeps each
  credential and the address of the viewer out. E is the smaller fix if
  the allowlist rule must stay.
- **Action:** ask the user, because C changes the allowlist rule of the
  protocol, and no recorded decision covers that change.

### 3. No rule says who can make a preview public

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** The preview routes in `worker/previews/handler.ts:56-152`,
  the suspension revocations in `worker/operator/events-data.ts:12-22`,
  and "Port previews" in `docs/protocol/terminal-previews-and-desktop.md`.
- **Background:**
  - Each member of the org can list and close the previews of each
    workspace of the org. Each member can open a preview while the
    workspace runs.
  - Each member can use the shared terminal, which runs as the owner of
    the workspace. Sandbox code can already make a port public through
    Boat, as the protocol says.
  - A user suspension revokes only the previews of the workspaces that
    the user owns. A leave or a removal of a member revokes no preview.
    The viewer check then refuses only the cookies of that member.
  - Each option lets each member turn the switch off, as the design
    says.
  - Codespaces and VS Code let the person who forwards a port make it
    public. Codespaces lets org owners forbid public ports. Coder lets
    template admins set the widest level. The paid edition of Coder
    starts with port sharing off.
- **Problem:** No rule says who may turn off the sign-in check of a
  preview. No rule says what ends public access when that member loses
  access.
- **Impact if no action:** The plan cannot build the switch. A member who
  is suspended or leaves can keep an address of the org public until the
  preview ends.
- **Root question:** Who may make a preview public, and what ends that
  access when that person loses access?
- **Options:**
  - **A.** Each member who may open a preview of the workspace.
    Effort: Small.
    - It matches who may open and close previews today.
    - A member can expose a server in the workspace of another member.
    - Public access stays after that member is suspended or leaves,
      until the preview ends.
  - **B.** Only the owner of the workspace. Effort: Small.
    - Other members must ask the owner, also when they started the
      server.
    - A suspension of the owner stops the sandbox, so it always ends
      public access.
  - **C.** A, and an org setting that lets admins turn public previews
    off for the org. Effort: Medium.
    - It adds a setting, its API, and a refusal while the setting is
      off.
    - The setting can start on or off. Codespaces allows public ports
      until an org owner sets a policy.
  - **D.** A, and public access lasts only while the member who turned it
    on stays in the org and is not suspended. A sign-out does not end it.
    Effort: Medium.
    - When that member is suspended, leaves, or is removed, the switch
      turns off. The public connections close, and the workspace sends
      `preview.updated`.
    - It needs a record of that member, one more join in each public
      check, and changes in the suspension, leave, and removal code.
  - **E.** Only the owner and the admins of the org. Effort: Small.
    - Each other member must ask an admin, also for a server that the
      member started.
- **Left out:** The member who opened the preview. Each member can open a
  new preview of the same port, so this rule gives the same power as A.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** None found.
- **Related:** Item 4: its D keeps the same record of the member. C here
  is also a limit against abuse.
- **Recommendation:** D. Each member gets the switch, as in A, and a
  suspension or a leave of that member ends the public access. The first
  recommendation was A.
- **Action:** ask the user, because the switch adds a new boundary, and
  no requirement says who may cross it.

### 4. No limit on the misuse of public previews

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `portResponseHeaders` in `worker/previews/headers.ts:123-149`,
  `routePreview` in `worker/features/router.ts:20-40`, and "Report abuse"
  in `src/marketing/terms.ts:175-182`.
- **Background:**
  - Free public addresses on cloud computers attract phishing and spam.
  - New people wait for app access, unless an operator turns the
    waitlist off. An operator can suspend a user or an org. The Terms
    give an abuse address.
  - A user suspension ends only the previews of the workspaces that the
    user owns, as item 3 says.
  - The preview record holds no member today.
  - Each request to an active preview hostname enters the workspace
    object, also without a cookie.
  - A search engine can list a public address that someone posts on a
    public page.
- **Problem:** No rule limits the harm of a misused public preview. An
  abuse report leads only to the org, not to the member.
- **Impact if no action:** A misused public preview can harm its
  visitors, load the workspace object, and bring abuse reports against
  the preview domain.
- **Root question:** What limits the harm of a misused public preview to
  visitors, the domain, and the shared service, and how does an operator
  end it fast?
- **Options:**
  - **A.** No new limit. The waitlist, suspensions, and the abuse
    address stay the limits. Effort: Small.
  - **B.** Each preview answer carries `X-Robots-Tag: noindex, nofollow`.
    Search engines then list no preview. Apps do not change.
    Effort: Small.
  - **C.** B, and a warning page on the first browser visit to a public
    preview. A visitor continues with one click. The page shows only for
    a `GET` that asks for HTML. Effort: Medium.
    - It makes phishing harder.
    - Each visitor sees one more page. A return from a sign-in provider
      by a `GET` can stop at that page.
  - **D.** B, and one record for each public address: the address, the
    member who turned it on, and the times of the turn-on and the
    turn-off. The operator search names that member. Effort: Medium.
    - An abuse report then leads to one person.
    - It needs the record, one field in the search result, and a mockup
      of that result. Item 3 D needs the same record.
  - **E.** An operator switch that turns public previews off for each
    org at once, and ends each public preview. Effort: Medium.
    - It needs a setting, an operator route and screen, a check in the
      switch and the proxy, and a sweep of the open public previews.
  - **F.** A request limit for each public preview, with the rate limit
    of Cloudflare Workers, and a 429 answer above the limit.
    Effort: Small.
    - It caps a public preview that serves large files or traffic, and it
      protects the workspace object.
    - A Vite dev page can make about 1,000 requests for each load. So the
      limit must be high, or it must count each visitor.
- **Left out:**
  - A shorter public life. The 24-hour end already limits each address,
    and a shorter end stops real demos and webhook tests. It fails the
    goal.
  - A scan of public pages at turn-on. A dev server changes its pages at
    each edit, so one scan proves nothing later. It fails the goal.
  - A banner that the proxy adds to each page. It changes the HTML of the
    app, and C gives the same warning without that change.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** Microsoft dev tunnels show a warning page on the
  first visit to an address. They skip it for each method other than
  `GET`, for an `Accept` header without `text/html`, and for a skip
  header. The waitlist switch of pull request #135 is a global operator
  switch.
- **Related:** Item 1: C, D, and E keep an abuse action away from private
  previews. Item 3: its C lets admins turn public previews off, and its D
  needs the record of D here.
- **Recommendation:** D. The record leads an abuse report to one member,
  which a suspension needs when each member can turn the switch on, and
  noindex keeps previews out of search. The first recommendation was B.
  With B or D, the plan adds a follow-up item: add C before an operator
  turns the waitlist off.
- **Action:** ask the user, because each option adds behaviour at the
  boundary that no requirement covers.

### 5. Strangers can keep a sandbox running

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The `recordActivity` call at
  `worker/previews/proxy.ts:101`, and "Stop and resume" in
  `docs/protocol/workspace-life.md:76-86`.
- **Background:**
  - A sandbox stops after 30 minutes without user activity and without an
    agent turn (decision 29). The protocol counts each request to a port
    preview as activity.
  - Public requests come from people who are not members, and from
    programs such as webhooks, monitors, and crawlers.
  - The app pays the sandbox provider for each hour of each sandbox.
  - [preview-polling-activity.md](follow-ups/preview-polling-activity.md)
    asks which preview use counts. The user deferred it on 8 November
    2026.
- **Problem:** No rule says whether the requests of strangers count as
  user activity. With the current rule, each public request moves the
  idle stop.
- **Impact if no action:** A webhook, a monitor, or a crawler can keep a
  forgotten public preview's sandbox running until the preview ends, up
  to 24 hours.
- **Root question:** Which requests to a public preview keep its sandbox
  running?
- **Options:**
  - **A.** Each public request, as each preview request counts today.
    Effort: Small.
    - A demo for a client and a webhook test keep the sandbox running.
    - A forgotten public preview with outside traffic can run for up to
      24 hours.
  - **B.** Only requests with a credential cookie. Effort: Small.
    - Only the use of members keeps the sandbox running.
    - A demo for a client stops after 30 minutes without member activity,
      and the stop ends the public address.
  - **C.** Public page loads only. A load, a reload, and a link or a form
    that opens a page count. Fetches, files, and socket handshakes do not.
    Effort: Small.
    - Webhooks, monitors, and fetch loops do not keep the sandbox
      running.
    - A single-page app makes few page loads, so a long demo can stop.
  - **D.** Public requests count only up to a fixed time after the last
    member activity, such as 2 hours. Effort: Medium.
    - A demo runs for that time after the member leaves. A forgotten
      public preview runs at most that time and 30 minutes more.
    - The protocol gains a new time limit, which the user chooses.
- **Left out:** A warning before the stop, alone. Outside traffic keeps
  moving the stop, so the warning never shows. It fails the goal.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** The terminal once counted automatic replies of
  the browser as activity. Commit `f4eb5351` fixed it.
- **Related:** `preview-polling-activity.md`: the same rule for private
  previews. Its answer can change this item.
- **Recommendation:** A. It keeps one rule for each preview request, and
  the deferred follow-up decides the limits of each preview at once. D
  limits the cost best.
- **Action:** ask the user, because the protocol counts user activity,
  and no requirement says whether the requests of strangers count.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the switch of the Preview tool, on desktop and on a phone, in
`docs/mockups/src/components/tools/`. Read the `mockups` and `product-ui`
skills first.

- [ ] Draw the access control of the selected preview in `PortPreview.tsx`
      and its words in `previewCopy.ts`: private, public with its address
      and "Copy link", a change in progress, and a failed change.
- [ ] Draw how a preview tab shows that its preview is public.
- [ ] Draw the warning page, if decision 4 chooses C.
- [ ] Draw the operator search result with the member of a public
      address, if decision 4 chooses D.
- [ ] Draw the operator switch, if decision 4 chooses E.
- [ ] Draw the org setting in the org settings screen, if decision 3
      chooses C.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the public preview requirements and the chosen decisions in the
protocol docs and the guides.

- [ ] Update "Port previews" and "Proxies and ports" in
      `docs/protocol/terminal-previews-and-desktop.md`: the switch, the
      exception to the credential cookie rule, who may use the switch,
      the end of public access, the domain of decision 1, the headers and
      the cookie filter of decision 2, and the limits of decision 4.
- [ ] Update `docs/protocol/port-previews.md`: the switch, "Copy link",
      the frame address of a public preview, and the mark on its tab.
- [ ] Update "Port previews" in `docs/protocol/desktop-app.md`: a public
      preview opens at its public address.
- [ ] Update "Previews and their viewers" in
      `docs/protocol/suspension-workspaces.md`, and the suspension and
      leave rules, as decision 3 chooses.
- [ ] Update "Stop and resume" in `docs/protocol/workspace-life.md`, as
      decision 5 chooses.
- [ ] Update the operator search rule in `docs/protocol/isolation.md` and
      `docs/protocol/operator-section.md`: it takes a public preview
      address, and it names the member if decision 4 chooses D.
- [ ] Update the operator rules, if decision 4 chooses E.
- [ ] Update the hostnames table and the terms of `docs/architecture.md`,
      and the preview flow of `docs/architecture/flows.md`, if decision 1
      chooses C, D, or E.
- [ ] Update the review focus in `AGENTS.md`, if decision 1 chooses C, D,
      or E, or decision 2 chooses C or D.
- [ ] Update the org settings rules, if decision 3 chooses C.
- [ ] Update `src/marketing/docs/terminal-and-previews.md` and
      `src/marketing/docs/security.md`. Read each public guide in full,
      and update each sentence that restates a changed fact.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in
      full. Update each sentence that restates a changed fact. Raise a
      decision if the Privacy page needs a new fact about visitors of
      public previews.
- [ ] Update the notes of the "Port forwarding", "Automatic port
      detection", and "Shared preview URL" rows in
      `src/marketing/from-conductor/areas/cloud.ts`, which say "private".
      Follow the claim rules of `docs/protocol/conductor-comparison.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Public preview domain

Depends on: 2

Keep this milestone only if decision 1 chooses C, D, or E. It sets up
the second domain for public previews.

- [ ] User: buy the domain, add it to Cloudflare, and add a wildcard DNS
      record. Universal SSL covers its one-level hostnames. For E, use a
      second Cloudflare account.
- [ ] Add `PUBLIC_PREVIEW_DOMAIN` and its Worker route to
      `wrangler.jsonc` and `worker/env.ts`, with a test domain for local
      runs.
- [ ] Route the public domain in `worker/hosts.ts` and
      `worker/features/router.ts`, and check it with the domain rules of
      `worker/previews/handler.ts:28-46`.
- [ ] Add the domain to the frame rule in
      `worker/security/content-security.ts`.
- [ ] Add the domain to the frame origins of the Mac app builds.
- [ ] Update `docs/deployment.md` with the setup steps.
- [ ] If decision 1 chooses D, send the request to the Public Suffix List
      and record it as a follow-up item.
- [ ] If decision 1 chooses E, add the Worker of the second account, its
      service credential, and its deploy.

## Milestone 4: Public access in the Worker

Depends on: 2, and 3 if it is kept

Give the preview proxy its public path and the API its switch. Read the
`databases`, `shared-types`, `testing`, and `typescript` skills first.

- [ ] Add a migration for the public state of a preview. Keep one record
      for each public address with the member and the times, if decision
      1 chooses B to E, decision 3 chooses D, or decision 4 chooses D.
- [ ] Add the access state and the public address to `Preview` in
      `src/shared/previews.ts`, and a request type for the switch.
- [ ] Add `PATCH` of the preview path in `worker/previews/handler.ts`. It
      checks the rule of decision 3.
- [ ] Add the public path to `worker/previews/proxy.ts` and
      `worker/previews/registry.ts`, with a fresh check for each request
      and each data batch.
- [ ] Close each public connection at once when the switch turns off.
- [ ] End public access when its member is suspended, leaves, or is
      removed, if decision 3 chooses D.
- [ ] Count public requests as decision 5 chooses.
- [ ] Publish `preview.updated` in the workspace events.
- [ ] Add the limits that decision 4 chooses.
- [ ] Let the operator search take a public preview address.
- [ ] Add tests for the switch, the public path, the end of public
      access, suspensions, activity, and the event.
- [ ] Update `worker/previews/README.md`.

## Milestone 5: App headers in the preview proxy

Depends on: 2

Keep this milestone only if decision 2 chooses B to F. Start after
`calummoore/untitled-v4` merges, because it changes `Cache-Control` in
the same function.

- [ ] Change the header filters in `worker/previews/headers.ts` as
      decision 2 chooses.
- [ ] Add a test for each header class: an app header that passes, each
      blocked header, and each frame header.
- [ ] Update `worker/previews/README.md`.

## Milestone 6: Settings for public previews

Depends on: 2

Keep this milestone only if decision 2 chooses F, decision 3 chooses C,
or decision 4 chooses E.

- [ ] Add each chosen setting, its API, and its refusal, with tests.

## Milestone 7: The switch in the Preview tool

Tags: ui

Depends on: 1, 4, and 6 if it is kept

Build the switch as the mockups show. Read the `product-ui` and
`typescript` skills first.

- [ ] Add the switch and "Copy link" to `src/previews/PreviewToolbar.tsx`,
      and the call to `src/previews/previewsApi.ts`.
- [ ] Load the public address in the frame and in "Open" of a public
      preview, in `src/previews/PreviewFrame.tsx`.
- [ ] Apply `preview.updated` in `src/previews/previewsState.ts`.
- [ ] Mark the tab of a public preview.
- [ ] Add the screens of each setting of Milestone 6, and the operator
      search field of decision 4 D.
- [ ] Add DOM tests for each state of the switch.
- [ ] Update `src/previews/README.md`.

## Milestone 8: Public previews in the Mac app

Depends on: 4

- [ ] Open a public preview in the default browser at its public
      address, in `desktop/src/preview.ts`.
- [ ] Add tests in `desktop/src/preview.test.ts`.
- [ ] Update `desktop/README.md` if its commands or its behaviour change.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, then `npm --prefix desktop ci`,
      `npm ci --prefix runner`, and `npm run check`.
- [ ] Smoke-test with `npm run dev`: make a preview public, open its
      address in a browser profile with no session, turn the switch off,
      and check that the address stops working. If the local Worker
      cannot reach a sandbox, smoke-test the switch with the fixtures in
      `src/terminal/dev/`, and keep the real check for the post-merge
      task.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, make a preview public. Open it from a
      browser with no session and from `curl`. Turn the switch off, and
      check that both get 404.
