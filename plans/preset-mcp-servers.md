# Preset MCP servers for cloud agents

Status: Active. On branch `calummoore/perth-75ko`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive gives the agents of each cloud computer two built-in MCP
servers, `conductive` and `computer`. An MCP server gives an agent the
tools of a service, through the Model Context Protocol. A repository can
already add servers in its own `.mcp.json` and `.codex/config.toml`, with
keys in org env vars. This works only as a side effect of other runner
settings, and no doc says so. No server that needs an OAuth sign-in works.

On 13 November 2026 the user asked for preset MCP servers "like here".
The screenshot showed the MCP settings grid of Conductor, a competing
product. It had an Import from local tile and 24 tiles of services, from
Granola to Exa. The Stripe tile had an Installed mark. The design calls
list the 24 services.

This change adds an MCP servers tab to the org settings, with a catalogue
of preset servers. A person picks a tile, signs in at the vendor or pastes
a key, and gives the connection a scope: personal or org. Each turn then
gives both agents the servers whose connections act in that turn. The
agents call a Worker address with the turn token. The Worker checks the
turn, adds the credential, and streams each request to the vendor.

The user chose this approach as MCP decision 1, and the scopes as MCP
decision 2, on 13 November 2026. MCP decisions 3 to 14 are open. The
design calls below are mine, with their dates and reasons. The change does
not cover these parts:

- MCP servers that run as programs in the cloud computer.
- MCP servers on the Mac of a member.
- The hosted MCP server for outside apps.
- A choice of servers for each session.
- A guide for the repository files that already work.

Contract owners:

- `docs/protocol/mcp-servers.md` and `docs/protocol/mcp-gateway.md`, which
  Milestone 2 adds.
- [Model gateway](../docs/protocol/model-gateway.md) and
  [Version pins](../docs/protocol/version-pins.md), for the turn token and
  its risks.
- [Access and security](../docs/protocol/access-and-security.md),
  [Isolation of orgs and sandboxes](../docs/protocol/isolation.md), and
  [Tokens and secrets](../docs/protocol/tokens-and-secrets.md).
- [Agent tools](../docs/protocol/agent-tools.md) and
  [Agent runner](../docs/protocol/agent-runner.md).
- [Orgs and members](../docs/protocol/orgs-and-members.md) and
  [Routines](../docs/protocol/routines.md).
- [Command palette: actions and settings](../docs/protocol/command-palette-actions.md).
- [Conductor comparison](../docs/protocol/conductor-comparison.md), for the
  rows of the comparison page.
- The [architecture doc](../docs/architecture.md), with
  [Components](../docs/architecture/components.md),
  [Flows](../docs/architecture/flows.md),
  [Data and trust boundaries](../docs/architecture/data-and-trust.md), and
  [Protocol docs](../docs/architecture/protocol-docs.md).
- The [Worker README](../worker/README.md), the
  [model gateway README](../worker/model-gateway/README.md), the
  [runner README](../runner/README.md), and
  [Runner agent tools](../runner/agent-tools.md).
- The [mockups README](../docs/mockups/README.md) and the
  [mockup catalogue](../docs/mockups/catalogue.md).
- The [marketing README](../src/marketing/README.md), for the legal pages
  and the public guides.

## Terms

- **MCP server:** a program or a web address that gives an agent the tools
  of a service, through the Model Context Protocol.
- **Vendor:** the company that runs an outside service, such as Linear, and
  its MCP server.
- **Preset:** an entry of the catalogue for one outside service. It gives
  the name, the logo, the MCP address, the regions, the sign-in kinds, and
  the key header.
- **Tile:** the card of one preset on the MCP servers tab.
- **Connection:** the stored sign-in or pasted key of one preset. The
  Worker keeps it encrypted.
- **Scope:** the reach of a connection, chosen when a person makes it:
  personal or org.
- **Personal connection:** a connection with the outside account of the
  member who made it.
- **Org connection:** a connection that one org shares. It can act in the
  turns of each member of that org.
- **Sender:** the member whose message started the running turn. The
  GitHub token and the Mac requests of a turn follow its sender.
- **Starter:** the member who started a session. Each turn of the session
  runs on the agent login of the starter (decision 105).
- **Turn token:** a secret of one turn. The agent programs send it to the
  Worker in place of a login. It works only while its turn runs.
- **MCP route:** the new Worker route on `api.conductive.build` that takes
  the MCP requests of the agents with the turn token.
- **CIMD:** a client ID metadata document. It is a JSON file at an HTTPS
  address of the app, and that address is the OAuth client ID at a vendor.
- **DCR:** dynamic client registration. The app registers itself as an
  OAuth client at a vendor with one request.
- **Pre-registered client:** an OAuth client that a person registers in
  advance in the console of a vendor.
- **Runner with MCP support:** a runner whose hello declares support for
  MCP servers. The protocol docs use "newer runner" for protocol version 2
  or later, so this plan does not use that name for MCP support.

## Decisions

An MCP decision number, such as MCP decision 4, names a decision of this
change. The protocol docs cite it so, as
[Decision numbers](../docs/architecture.md#decision-numbers) says. A
conversation item number names the question in the conversation with the
user on 13 November 2026. The brainstorm notes of that conversation are in
`.context/mcp-feature/widen-narrow.md` and
`.context/mcp-feature/round-2-presets.md`. No milestone applies an option
of an open decision.

The options check of 13 November 2026 changed the root questions of MCP
decisions 3, 6, 10, 11, and 12. It added options to each open decision,
and it changed the recommendation of MCP decision 11 from A to F. Its new
problems added MCP decisions 13 and 14, and they changed some design calls
and TODOs. Its report is in
`.context/preset-mcp-servers/options-check-report.md`.

| MCP decision | Conversation item | Title | Severity | Effort | State |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | No path from agents to outside services | High | Large | Answered: N |
| 2 | 3 | No rule for whose account acts | High | Large | Answered: the user's own option D |
| 3 | 6 | Agents can change data at outside services | High | Medium | Open. Recommended: A |
| 4 | 8 | No rule for who makes org connections | High | Small | Open. Recommended: A |
| 5 | 9 | No rule for where personal connections act | High | Small | Open. Recommended: A |
| 6 | New | Vendors can refuse requests from the Worker | High | Small | Open. Recommended: A |
| 7 | 4 | No rule for the orgs of personal connections | Medium | Small | Open. Recommended: A |
| 8 | 5 | The whole feature is large for one release | Medium | Large | Open. Recommended: A |
| 9 | 7 | No rule for who sees personal connections | Medium | Small | Open. Recommended: B |
| 10 | 10 | Two connections can serve one preset | Medium | Small | Open. Recommended: A |
| 11 | New | Custom server addresses have no rule | Medium | Small | Open. Recommended: F, changed from A |
| 12 | New | An org connection outlives its maker's access | Medium | Small | Open. Recommended: B |
| 13 | New | Another person can finish a member's sign-in | High | Medium | Open. Recommended: B |
| 14 | New | No admin control over the presets | Medium | Small | Open. Recommended: A |

### 1. No path from agents to outside services

- **Answer:** N, on 13 November 2026.
- **Severity:** High. **Effort:** Large.
- **Source:** Design. Conversation item 1.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/claude.ts:143-150`,
  `runner/src/providers/codex.ts:96-109`,
  `docs/protocol/model-gateway.md:167`.
- **Background:**
  - Each cloud computer gives both agents two built-in MCP servers,
    `conductive` and `computer`.
  - Repository files can add servers, with keys from org env vars. A call
    then acts as the owner of the key, never as the member.
  - The model gateway keeps agent logins out of the sandbox (decision 120).
    The agents send a turn token, and the Worker adds the login.
  - Conductor has a cloud settings page with preset tiles. Its changelog
    says that a person adds a server there for cloud workspaces.
  - All options except P assume that Conductive is the OAuth client of each
    vendor. The source is the request for presets like Conductor's. P drops
    the assumption.
- **Problem:** Conductive has no catalogue of outside services, no sign-in
  to them, and no place to keep their credentials.
- **Impact if no action:** Members cannot give the agents Granola, Hex,
  Vercel, or another service that takes only a sign-in. The comparison row
  "MCP servers for cloud" stays Under consideration.
- **Root question:** How do the agents of a cloud computer use an outside
  service that a person connected once?
- **Options:**
  - **E.** The cloud computer gets the sender's credential for each turn. A
    helper asks the Worker for the access token or key, and the agents call
    each vendor directly. Every process in the sandbox can read the
    credential while the turn runs. A copied key works until someone
    replaces it. Effort: Large.
  - **N.** The agents call a Worker address with the turn token. The Worker
    checks the running turn, picks the connection, adds its credential, and
    streams each MCP request to the vendor. No outside credential reaches
    the cloud computer. It depends on vendors that accept requests from
    Cloudflare Workers. Effort: Large.
  - **F.** The Worker is the MCP client of each vendor, with a proxy for
    tool calls in the sandbox. It keeps the credentials out, as N does. It
    passes tools only, and it needs more Worker code. Effort: Large, the
    largest.
  - **P.** A broker company, such as Composio or Pipedream Connect, holds
    the sign-ins and hosts an address for each person. A new processor sees
    each token and each call, with fees and lock-in. Effort: Large, with a
    contract.
- **Left out:**
  - Repository files only, the earlier approaches A and B: they fail the
    services that take only a sign-in, and each repository needs a commit.
  - Org keys only, C, and personal keys only, D: they fail the same
    services. D also puts the keys in the sandbox.
  - Servers on the Mac, G: the tools stop when the Mac sleeps, and routines
    cannot use them.
  - A sign-in inside the cloud computer: it needs a sign-in in each
    workspace for each agent, and it leaves tokens on the disk.
  - Reads of the official MCP registry while the app runs: the registry
    asks host apps not to read it directly. Five presets are also missing
    from it.
- **Wider fix:** N. It removes the class "an outside credential that
  sandbox code can read" for each service that a person connects.
- **Previous examples:** Decision 120 put agent logins behind the model
  gateway. Commit `dfd2ebf15` sends the chatgpt.com requests of the gateway
  through an egress proxy.
- **Related:** N changes the rule "A turn token works only on the gateway
  routes" at `docs/protocol/model-gateway.md:167`. The answer covers that
  change. MCP decision 6 probes the main risk of N: a vendor can refuse
  requests from Cloudflare Workers, as OpenAI does on chatgpt.com. No probe
  has run from a deployed Worker yet.
- **Recommendation:** N. It keeps every outside credential out of the
  sandbox, reuses the turn token and the checks of the model gateway, and
  keeps full MCP.
- **Action:** ask the user, because each option adds behaviour at a
  boundary that no requirement covers, and the options have real
  trade-offs.

### 2. No rule for whose account acts

- **Answer:** the user's own option, recorded as D, on 13 November 2026.
  The user wrote: "when a mcp is made it can be set to personal or org,
  then that determines where it can be used".
- **Severity:** High. **Effort:** Large.
- **Source:** Design. Conversation item 3.
- **Category:** Security.
- **Location:** `docs/protocol/isolation.md:140-149`,
  `docs/protocol/orgs-and-members.md:153-159`.
- **Background:**
  - The GitHub token of a turn and its Mac requests follow its sender
    (`docs/protocol/isolation.md:143-145`).
  - Each session runs on the agent login of its starter (decision 105).
  - Only an admin changes the scripts and the env vars (decision 57). A
    change reaches every sandbox and runs in the turns of other members.
  - The changelog of Conductor says that its settings recommend the
    servers that teammates connected, and show who uses them.
- **Problem:** No rule says whose account at an outside service acts in a
  turn, or who chooses it.
- **Impact if no action:** The Worker cannot pick the credential of a turn.
- **Root question:** Whose account at an outside service acts in a turn,
  and who decides?
- **Options:**
  - **A.** Each member connects their own account. The connections of the
    sender serve each turn that the sender sends. Effort: Large.
  - **B.** Admins add shared org connections, which serve the turns of
    every member. Effort: Large.
  - **C.** Both A and B. Effort: Large.
  - **D.** The user's own option. Each connection gets a scope when a
    person makes it: personal or org. The scope decides where the
    connection acts. Effort: Large.
- **Left out:** The connections of the starter in each turn, as for agent
  logins. MCP decision 5 asks this again as its option B, for personal
  connections.
- **Wider fix:** None, because the answer sets one rule of identity.
- **Previous examples:** Decisions 21, 57, and 105.
- **Related:** D leaves these questions open:
  - MCP decision 4 asks who may make an org connection.
  - MCP decision 5 asks where a personal connection acts.
  - MCP decision 7 asks in which orgs it acts.
  - MCP decision 10 asks which connection acts when both exist.
  - MCP decision 12 asks what happens to an org connection when its maker
    leaves.
  - MCP decision 14 asks whether an admin limits the presets of the org.
- **Recommendation:** Not recorded in this plan. The brainstorm notes
  proposed A in the first release and org connections in a later one.
- **Action:** ask the user, because the answer decides whose account acts
  at an outside service, a boundary that no requirement covers.

### 3. Agents can change data at outside services

- **Answer:** Open.
- **Severity:** High. **Effort:** Medium.
- **Source:** Design. Conversation item 6.
- **Category:** Security.
- **Location:** `runner/README.md:38-39`.
- **Background:**
  - Both agents run each tool call with no approval by a person
    (`runner/README.md:38-39`).
  - The brainstorm notes report a read-only form for some vendors, from
    their docs. Linear has the address `/mcp/readonly`. Supabase takes
    `read_only=true`, and Neon takes `readonly`. PostHog takes the header
    `x-posthog-read-only`, and PlanetScale has an address for insights
    only.
  - The notes found no read-only form for the other presets. Honeycomb and
    Datadog limit access through the scopes or roles of the account.
  - Text from other GitHub accounts can steer the agent of a routine run
    (`docs/protocol/routines.md:180-186`).
  - All options except F assume that no person approves a tool call. The
    source is `runner/README.md:38-39`, not a protocol doc. F drops it.
  - Most options assume one limit for every kind of turn. No requirement
    says so, and no person watches a routine run. J drops it.
  - The options limit writes. A steered agent can also read private data
    and post it elsewhere. The design calls accept that risk, so it stays
    a separate question.
- **Problem:** A connection with full access lets an agent change or delete
  data at an outside service, with no person in the loop.
- **Impact if no action:** An agent error, or text that steers the agent,
  can delete the rows of a production database or close issues.
- **Root question:** What may an agent change at an outside service, and
  who sets that limit? The options check widened the first question, "How
  much may an agent change at an outside service by default?"
- **Options:**
  - **C.** Always read-only where the vendor offers it, with no switch.
    Cost: agents cannot write to these services, for example create a
    Linear issue. Effort: Small.
  - **D.** No read-only handling. Each connection uses the full-access
    address of its vendor. Effort: Small.
  - **A.** Read-only by default where the vendor offers it, with a switch on
    the connection. The tile says when a preset has no read-only form.
    Cost: a member turns the switch off for each service whose writes they
    want. Effort: Medium.
  - **B.** Full access by default, with a read-only switch where the vendor
    offers it. Cost: a member who does not look at the switch gives full
    access. Effort: Medium.
  - **H.** Added by the options check. The catalogue sets the default of
    each preset by the harm that its writes can do. Supabase, Neon, and
    PlanetScale start read-only, and Linear starts with full access. Each
    tile keeps the switch of A. Cost: one more field of the catalogue, and
    a member must read the tile to learn its default. Effort: Medium.
  - **I.** Added by the options check. As A, and an admin can lock the
    switch of a preset for every member of the org. Cost: a new org
    setting with its control, mockup, and protocol section. The repository
    rejected a similar admin setting for that cost
    (`docs/protocol/session-calls.md:72-74`). Effort: Medium.
  - **J.** Added by the options check. As A, but routine runs and the turns
    that the workspace tools start always use the read-only form where it
    exists. The switch applies only to turns that a person sends. Cost: a
    routine cannot write to such a service, and the Worker must know the
    kind of each turn. Effort: Medium.
  - **E.** For every preset, the Worker refuses each call of a tool that
    the vendor does not mark as read-only in its tool list. Cost: the
    Worker must read the tool list in each stream and keep its marks
    between requests, so the design call "no copies" must change. Many
    servers do not mark their tools. Effort: Large.
  - **F.** A person approves each write call in the chat, as a Mac command
    asks first. Cost: a hold in the MCP route, a new chat part, and turns
    that wait. Effort: Large.
  - **G.** Added by the options check. The page of a connection lists the
    tools of the server, and a person turns off single tools. The Worker
    refuses their calls and removes them from the tool list. Cost: the
    Worker must get the tool list of each server and read each request
    body. Effort: Large.
- **Left out:** A tool policy inside the agent programs, such as the policy
  for each tool of the pinned Claude SDK. It fails the goal, because a
  steered agent can read the turn token from the process list and call the
  MCP route itself (`docs/protocol/version-pins.md:24-31`).
- **Wider fix:** E. It applies one rule to every preset, also to presets
  with no read-only form.
- **Previous examples:** Mac commands ask the person at the Mac before they
  run (decision 62).
- **Related:** Milestones 1, 2, 4, 5, 8, and 11 have TODOs that wait for
  this answer.
- **Recommendation:** A. It protects data by default at each vendor that
  offers a read-only form, and a member allows writes with one switch.
- **Action:** ask the user, because the options trade safety against the
  work that agents can do, and no option is clearly best.

### 4. No rule for who makes org connections

- **Answer:** Open.
- **Severity:** High. **Effort:** Small.
- **Source:** Design. Conversation item 8.
- **Category:** Security.
- **Location:** `docs/protocol/orgs-and-members.md:151-159`.
- **Background:**
  - By MCP decision 2, a person chooses the scope of each connection.
  - An org connection acts with one person's outside account in the turns
    of every member, in every cloud computer of the org.
  - Only an admin changes the repositories, the scripts, and the env vars
    (decision 57). Reason: a change reaches every new sandbox and runs
    during the turns of other members.
  - Every member can make a personal connection.
  - Options A to D assume that an org connection acts in the turn of each
    member with no step by that member. The source is the Terms of this
    plan, not MCP decision 2. E drops it.
- **Problem:** No rule says who may make an org connection.
- **Impact if no action:** The connect dialog has no safe default. Either
  any member adds an account that acts in every turn, or nobody can add an
  org connection.
- **Root question:** Who may give the turns of every member an outside
  account?
- **Options:**
  - **A.** Admins only, as for scripts and env vars. Members see the org
    connections read-only. Effort: Small.
  - **B.** Any member. Cost: the account of one member then acts in the
    turns of every other member, with no check by an admin. Effort: Small.
  - **C.** Any member asks, and an admin approves the connection before it
    acts. Cost: a request, an approval, and a new screen. Effort: Medium.
  - **D.** Admins choose, for each preset, whether members may make its org
    connection. Cost: a new setting on each tile. Effort: Medium.
  - **E.** Added by the options check. Any member may make an org
    connection. It acts in the turns of a member only after that member
    turns it on, on its tile. Cost: each member must find and turn on each
    org connection. The routines of a member who did not turn it on do not
    get it. Effort: Medium.
- **Left out:** None.
- **Wider fix:** A. It reuses the rule of decision 57 for each change that
  reaches every member's turns.
- **Previous examples:** Decision 57.
- **Related:** MCP decision 12 asks what happens when the maker of an org
  connection leaves. MCP decision 14 asks whether admins limit the
  presets. Milestones 1, 2, 7, and 11 have TODOs that wait for this
  answer.
- **Recommendation:** A. An org connection has the reach that made
  decision 57 keep scripts and env vars with the admins.
- **Action:** ask the user, because the answer adds a role rule that no
  requirement covers, and the options trade member freedom against
  control.

### 5. No rule for where personal connections act

- **Answer:** Open.
- **Severity:** High. **Effort:** Small.
- **Source:** Design. Conversation item 9.
- **Category:** Security.
- **Location:** `docs/protocol/isolation.md:143-149`,
  `docs/protocol/session-calls.md:93-105`.
- **Background:**
  - The GitHub token of a turn and its Mac requests follow its sender
    (`docs/protocol/isolation.md:143-145`). Pushes show as the sender
    (decision 50).
  - A routine run uses its owner's agent login and GitHub token
    (`docs/protocol/isolation.md:146-149`). The owner sends the first turn
    of each run (`docs/protocol/routine-runs.md:35-41`).
  - Each session runs on the agent login of its starter (decision 105). Its
    share setting decides whether other members' messages may use it
    (decision 116).
  - A message that another member sends during a turn changes neither the
    GitHub token nor the Mac of the turn
    (`docs/protocol/agent-instructions.md:136-142`). Such a message joins
    the turn only while the starter shares the login
    (`docs/protocol/messages-and-attachments.md:91-93`).
  - All options assume that the Worker reads the sender and the starter
    from its own records, never from the sandbox
    (`docs/protocol/tokens-and-secrets.md:31-37`). This is a requirement.
  - Most options assume that a turn keeps its connections after a message
    of another member joins it. That rule covers the GitHub token and the
    Mac, not connections. E drops it.
  - Most options assume that turns that no person typed act as their
    sender. Examples are routine runs and the turns that the workspace
    tools start. G drops it.
- **Problem:** By MCP decision 2, the scope of a personal connection decides
  where it acts. No rule says which turns those are.
- **Impact if no action:** The Worker cannot choose the account of a turn.
  A wrong choice lets one member act as another member at an outside
  service.
- **Root question:** In which turns may the personal account of a member at
  an outside service act?
- **Options:**
  - **A.** In each turn that its owner sends. This follows the GitHub
    token. The owner of a routine sends the first turn of each run, so a
    run uses the owner's connections. Cost: a message of a teammate can
    join a running turn. It can then steer the agent while the agent uses
    the sender's connections, as for the GitHub token today. This happens
    only in a session whose starter shares the login. Effort: Small.
  - **B.** In each turn of a session that its owner started, whoever sends
    the message. Cost: the message of a teammate then acts as the owner at
    the outside service. It can read the owner's private notes or post as
    the owner. The share setting of agent logins does not cover
    connections. Effort: Small.
  - **C.** In each turn in a workspace that its owner owns. Cost: the
    message of every member there acts as the owner. The owner changes when
    an admin reassigns the workspace or a member leaves. So the account
    that acts can change with no notice. Effort: Small.
  - **D.** Only in turns that its owner sends in sessions that its owner
    started. Cost: the owner's connections do not reach the session of a
    teammate, also when the owner sends the message. Effort: Small.
  - **G.** Added by the options check. As A, but routine runs and the
    turns that the workspace tools start get no personal connections, only
    org connections. Cost: a routine that must act as its owner needs an
    org connection, which then serves every member. Effort: Small.
  - **E.** Added by the options check. As A, but the personal connections
    of the sender stop when a message of another member joins the turn.
    They stay off for the rest of that turn, and the MCP error names the
    cause. Cost: the agent loses tools in the middle of its work, and the
    Worker must record the join. Effort: Medium.
  - **F.** Added by the options check. As B, with a share setting on each
    personal connection, off by default, as for agent logins
    (decision 116). A message of a teammate uses the connections of the
    starter only while the starter shares them. Cost: a new setting with
    its mockup. Effort: Medium.
- **Left out:** None.
- **Wider fix:** A. One rule then covers Git, the Mac, and the outside
  services: the accounts of the sender act.
- **Previous examples:** Decisions 50, 62, and 105.
- **Related:** MCP decision 10 builds on this answer. MCP decision 7 asks in
  which orgs a personal connection acts. Milestones 2, 8, and 9 have TODOs
  that wait for this answer.
- **Recommendation:** A. The member whose words start the turn is the
  member whose accounts act, as for Git and Mac commands today. Its one
  cost occurs only while the starter shares the login.
- **Action:** ask the user, because the answer decides whose account acts
  at an outside service, and no requirement covers that boundary.

### 6. Vendors can refuse requests from the Worker

- **Answer:** Open.
- **Severity:** High. **Effort:** Small.
- **Source:** Design. New in this plan.
- **Category:** Process.
- **Location:** `worker/model-gateway/egress.ts:16-60`,
  `tools/chatgpt-egress/proxy.ts`.
- **Background:**
  - With MCP decision 1 N, the Worker calls each vendor from the addresses
    of Cloudflare.
  - OpenAI refuses Cloudflare Worker traffic on chatgpt.com with HTTP 403.
    The gateway sends those requests through an egress proxy outside
    Cloudflare (commit `dfd2ebf15`).
  - The probes of the brainstorm ran from a computer of the team, not from
    a Worker.
  - The brainstorm notes report that a customer of Datadog, Atlassian,
    Neon, PlanetScale, or Snowflake can allow only listed IP addresses.
    Such a list refuses the Worker, and a probe with no credential cannot
    find it.
  - The egress proxy of today calls only chatgpt.com origins
    (`tools/chatgpt-egress/proxy.ts:70-88`). So each new proxied host also
    changes the proxy.
  - All options assume MCP decision 1 N, a user decision.
  - The probe options assume that a request with no credential meets the
    same block as a signed-in call. A block of signed-in calls only, or of
    high rates only, does not show in a probe. D and F avoid that case.
- **Problem:** Nobody knows which presets refuse requests from a Worker. A
  customer IP allow list can also refuse the Worker for one customer.
- **Impact if no action:** A blocked preset fails at each call after the
  release. The team finds it only in the live checks after the merge.
- **Root question:** How does a preset keep working when its vendor
  refuses requests from Cloudflare Workers? The options check widened the
  first question, "How does the team learn, before the release, which
  presets accept requests from the Worker?"
- **Options:**
  - **C.** No probe. The live checks after the merge find each block, and
    a blocked preset waits for a fix. Effort: Small.
  - **A.** Before the MCP route milestone, run a temporary Worker in the
    operator's Cloudflare account. It sends requests with no credential to
    the MCP address, the metadata, and the token endpoint of each preset.
    It records the status of each answer. Cost: a deployment, which needs
    the user's approval. Effort: Small.
  - **B.** Add a probe route for operators to the test deployment at
    `conductive.build`, in a small pull request of its own. Cost: probe
    code in the product and a merge to `main`. The route then becomes
    functionality, so its removal needs the user's approval. Effort: Small.
  - **E.** Added by the options check. Run the probe in the public Workers
    Playground of Cloudflare. Cost: nobody checked that the Playground
    needs no account, or that it uses the outbound addresses of a deployed
    Worker. So a pass there is weak evidence. Effort: Small.
  - **D.** Send all preset traffic through an egress proxy outside
    Cloudflare from the start, as for chatgpt.com. Cost: the proxy sees
    each vendor credential in transit, so it runs on a host of the
    operator. The proxy of chatgpt.com calls only chatgpt.com today, so it
    needs a change, and the protocol docs must name it as a trust
    boundary. A proxy with a fixed address also lets a customer add that
    address to its allow list. Effort: Medium.
  - **F.** Added by the options check. As C, and the MCP route sends each
    request through one egress switch. A deployment setting lists the
    hosts that go through the proxy, and the proxy uses the same list. A
    block that the team finds later then needs a setting change, not a
    release. Cost: the proxy sees the credentials of each listed host, and
    each change needs the operator. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. It removes the dependency on the addresses of
  Cloudflare for every vendor, also for IP allow lists.
- **Previous examples:** Commit `dfd2ebf15` added the egress proxy for
  chatgpt.com.
- **Related:** MCP decision 1. Milestone 3 runs the probe. Milestones 4 and
  8 have TODOs that wait for its result.
- **Recommendation:** A. A probe of about an hour shows which presets need
  a proxy, and it leaves no probe code on `main`. For a blocked preset,
  the team then sends its hosts through an egress proxy, as for
  chatgpt.com, or leaves it out of release 1.
- **Action:** ask the user, because the probe needs a deployment,
  credentials, and infrastructure, and the always-on rules keep these
  with the user.

### 7. No rule for the orgs of personal connections

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. Conversation item 4. In the conversation, the item
  covered every connection. With MCP decision 2, it covers personal
  connections only, because an org connection belongs to one org.
- **Category:** Security.
- **Location:** `docs/protocol/tokens-and-secrets.md:164`.
- **Background:**
  - The agent logins of a user serve all of that user's orgs
    (decision 21).
  - Every member of an org reads every chat of the org (decision 39). An
    agent answer can repeat data from a connected service.
  - The outside account of a person usually belongs to one company. This
    is a guess, not a requirement. B drops it, and D drops it for personal
    tools.
  - All options assume personal connections, from MCP decision 2.
  - All options assume that a connection acts only in an org where its
    owner is a member (`docs/architecture/data-and-trust.md:35-36`). This
    is a requirement.
- **Problem:** No rule says whether a personal connection acts in one org
  or in every org of its owner.
- **Impact if no action:** An account of one company can act in the chats
  of another org. Or a member must connect again in each org.
- **Root question:** In which orgs may the personal connection of a member
  act?
- **Options:**
  - **A.** One connection for each org membership. A member who leaves the
    org loses it, and the Worker revokes the grant where the vendor allows.
    Cost: a member of several orgs connects in each org. A vendor can keep
    one grant for each pair of client and person. Then the revocation for
    one org can also end the connection in another org. Effort: Small.
  - **B.** One connection for all orgs of the member, as for agent logins.
    Cost: an account of one company can act in the chats of another org. A
    member who leaves an org keeps it for the other orgs. Effort: Small.
  - **C.** The member chooses the orgs of each personal connection. Cost: a
    list of orgs in the connect dialog and on each connection. Effort:
    Medium.
  - **D.** Added by the options check. The catalogue marks each preset as a
    company service or a personal tool. A personal tool, such as Context7,
    acts in every org of its owner, as in B. A company service acts in one
    org, as in A. Cost: one more field of the catalogue, and a member may
    not expect two rules. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because the answer sets one rule of reach.
- **Previous examples:** Decision 21.
- **Related:** MCP decisions 5 and 12. Milestones 2, 5, and 7 have TODOs
  that wait for this answer.
- **Recommendation:** A. An outside account usually belongs to one company,
  and the end of a membership then also ends its connections.
- **Action:** ask the user, because the options trade convenience against
  the separation of orgs, and no option is clearly best.

### 8. The whole feature is large for one release

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. Conversation item 5. In the conversation, option A
  put org connections in release 2. With MCP decision 2, they are part of
  release 1 in each option except F.
- **Category:** Process.
- **Location:** None.
- **Background:**
  - The probes of the brainstorm found 21 presets that let a hosted app
    register itself as an OAuth client: 15 through a CIMD, and 6 through
    DCR only.
  - The notes report from the vendor docs that Asana needs a client that
    the operator registers once. Slack needs a listing in its Marketplace,
    or an internal app of each customer. Snowflake needs a security
    integration in each customer account.
  - Import from local reads the MCP settings of the member's Mac. Only the
    Mac app can read them, because the page has no bridge to the Mac
    (decision 62).
  - All options assume that release 1 holds the MCP route, because every
    later part needs it.
  - Most options put org connections in release 1. MCP decision 2 chose
    the scopes, not the release of each scope. F drops it.
- **Problem:** The full feature is large. One pull request for all of it is
  slow to review and to merge.
- **Impact if no action:** The 21 presets that are ready to build wait for
  the parts that need more work.
- **Root question:** Which parts of the feature ship first?
- **Options:**
  - **A.** Three releases. Release 1 holds the MCP route, the connections
    of both scopes, the 21 presets that register themselves, and pasted
    keys. It also holds the Installed and Recommended views. Release 2
    holds custom servers, Asana, Slack, and Snowflake. Release 3 holds
    Import from local through the Mac app, with names and addresses only,
    and no secrets. Effort: Large.
  - **B.** As A, with Import from local in release 1. Effort: Large.
  - **C.** Everything in one release. Effort: Large.
  - **D.** Release 1 with pasted keys only, and sign-ins in release 2.
    Cost: Granola, Hex, and Vercel take only a sign-in, and keys live long.
    Effort: Large.
  - **E.** Added by the options check. Release 1 signs in only through a
    CIMD and takes a pasted key for each preset that accepts one. DCR
    comes in release 2, so release 1 needs no registered clients. Cost:
    Hex waits, because it takes only a DCR sign-in. Datadog, Composio,
    Stripe, Supabase, and PlanetScale work with keys only at first.
    Effort: Large.
  - **F.** Added by the options check. As A, but release 1 holds personal
    connections only, and org connections come in release 2. Release 1
    then does not wait for MCP decisions 4, 10, and 12. Cost: the org scope
    that the user chose waits, and so does each shared service account.
    Effort: Large.
- **Left out:** None.
- **Wider fix:** None, because the answer sets the scope of this change.
- **Previous examples:** None found.
- **Related:** MCP decision 11 applies to custom servers. Milestones 12 to
  15 wait for this answer. Under A, they leave this plan and become
  follow-up items for later plans. Under D, Milestone 6 and each sign-in
  TODO move to a later release. Under F, each TODO of the org scope moves
  to a later release.
- **Recommendation:** A. It ships both scopes that the user chose, with 21
  of the 24 tiles. D, E, and F are smaller, but each one delays a part
  that the user asked for. Custom servers and the import then build on a
  tested base.
- **Action:** ask the user, because the options trade the time to release
  against the scope, and no option is clearly best.

### 9. No rule for who sees personal connections

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. Conversation item 7. MCP decision 2 changed it: every
  member sees the org connections, so the item now covers personal
  connections and the Recommended view.
- **Category:** Security.
- **Location:** `docs/protocol/orgs-and-members.md:160`.
- **Background:**
  - Every member sees the org connections of the org, because they act in
    the turns of every member. This is a design call below.
  - The Recommended view of Conductor shows the servers that teammates
    connected, and who uses them.
  - A personal connection can show a private tool of a member, such as a
    personal Granola account.
  - All options assume that a personal connection never shows its token,
    key, or outside account to another member. The source is privacy. The
    nearest rule is the write-only rule of env vars at
    `docs/protocol/tokens-and-secrets.md:50-52`, which covers only their
    stored values.
  - The chat shows each tool call and its subject to every member
    (`docs/protocol/chat-and-events.md:151-156`, decision 39). So no option
    hides every use of a personal connection.
- **Problem:** No rule says what other members learn about the personal
  connections of a member.
- **Impact if no action:** The tab can show the private services of a
  member to the whole org, or hide what the team uses.
- **Root question:** What may other members learn about the personal
  connections of a member?
- **Options:**
  - **A.** Each member sees only their own personal connections. Admins
    also see the preset names of the personal connections of each member,
    with no account details. Effort: Small.
  - **B.** As A, and the Recommended view shows which presets members of
    the org use, with their names, as Conductor does. Effort: Small.
  - **C.** Nobody sees the personal connections of another member, also not
    an admin. Cost: the calls in the chat still show the services that a
    member uses. Effort: Small.
  - **D.** As A, and the Recommended view shows how many members use each
    preset, with no names. Effort: Small.
  - **E.** Added by the options check. As A, and the owner chooses for each
    personal connection whether the Recommended view shows it with the
    owner's name. Cost: a switch in the connect dialog and on the
    connection, and a default to choose. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because the answer sets one rule of privacy.
- **Previous examples:** Decision 39 lets every member see every workspace.
- **Related:** Milestones 1, 2, 7, and 10 have TODOs that wait for this
  answer.
- **Recommendation:** B. Members learn which services their teammates use
  and whom to ask, and the outside accounts stay private.
- **Action:** ask the user, because the answer decides what one member
  learns about another, and no requirement covers it.

### 10. Two connections can serve one preset

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. Conversation item 10.
- **Category:** Security.
- **Location:** None.
- **Background:**
  - By MCP decision 2, an org can have an org connection for Linear while
    a member also has a personal Linear connection.
  - Each server that an agent gets has a unique name. Two servers with the
    same tools can make the agent act with the wrong account.
  - All options assume one answer of MCP decision 5. They hold for each of
    its options.
  - Options A to E assume at most one personal connection of a member and
    one org connection for each preset. The source is the design call that
    names each server after its preset. It is not a requirement. F drops
    it.
- **Problem:** No rule says which account acts in a turn that has a
  personal and an org connection for one preset. Two connections with the
  same scope, such as two Linear workspaces, raise the same question.
- **Impact if no action:** The agent can act with an account that the
  member did not expect.
- **Root question:** When more than one connection for one preset can act
  in a turn, which accounts does the agent get? The options check widened
  the first question, "When a turn has a personal and an org connection
  for one service, which account acts?"
- **Options:**
  - **A.** The personal connection of the sender acts in the sender's
    turns. Members with no personal connection use the org connection.
    Effort: Small.
  - **B.** The org connection acts. A personal connection for the same
    preset acts in no turn while the org connection exists, and its tile
    says so. Effort: Small.
  - **D.** One connection for each preset in an org. The connect dialog
    offers no personal connection where an org connection exists, and no
    org connection where a personal one exists. Cost: a new rejection, and
    a member cannot act as themselves where an admin added a shared
    account. Effort: Small.
  - **C.** The agent gets both, as two servers with distinct names, such as
    `linear` and `linear_org`. Cost: twice the tools, and the agent can act
    with the wrong account. Effort: Medium.
  - **E.** Added by the options check. The maker of an org connection marks
    it Default or Required. A personal connection replaces a Default org
    connection, as in A. A Required org connection acts for every member,
    as in B. Cost: one more setting on the org connection and on its tile.
    Effort: Medium.
  - **F.** Added by the options check. Each connection gets its own server
    name, made from its preset and a short label, such as `linear_acme`. A
    person or an org can then have more than one connection for one
    preset. Cost: longer tool lists, and the agent can pick the wrong
    account. The chat shows a tool without its server, so members cannot
    see which account acted. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because the answer sets one rule of choice.
- **Previous examples:** None found.
- **Related:** MCP decisions 4 and 5. Milestones 2, 5, 8, and 9 have TODOs
  that wait for this answer.
- **Recommendation:** A. The member who connects their own account chose
  to act as themselves, and each turn keeps one account for each service.
- **Action:** ask the user, because the options trade the member's choice
  against the admin's control, and no option is clearly best.

### 11. Custom server addresses have no rule

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. New in this plan. It applies only to the custom
  server milestones.
- **Category:** Security.
- **Location:** None.
- **Background:**
  - A custom server is an MCP server that is not in the catalogue. A
    person types its address.
  - With MCP decision 1 N, the Worker sends each request and the credential
    of the connection to that address.
  - The app is on `app.conductive.build`, the machine routes are on
    `api.conductive.build`, and the port previews are on
    `*.conductive.page`.
  - The model gateway accepts a routed backend only as an HTTPS origin with
    no user credentials, path, query, or fragment
    (`docs/protocol/model-gateway.md:220-221`).
  - The deployment names the hosts of the app in its settings `APP_ORIGIN`,
    `MARKETING_ORIGIN`, `MACHINE_ORIGIN`, and `PREVIEW_DOMAIN`
    (`worker/env.ts:9-12`). The Worker serves `conductive.build` itself
    too (`wrangler.jsonc:25`).
  - The sign-in of a custom server gives the Worker more addresses than
    the typed one. Examples are the metadata, the token endpoint, and the
    registration endpoint.
  - All options assume `https` and refuse the hosts of the app. The source
    is the safety of the credential. This holds.
  - Options A to C read only the text of the address. A DNS name can
    resolve to a private address, and nobody checked whether a Worker can
    reach one. D drops it.
- **Problem:** An address of the app itself, of a preview, or with an odd
  port can turn the MCP route into a relay.
- **Impact if no action:** A custom server can point the MCP route at a
  route of the app, with the credential of a member.
- **Root question:** To which addresses may the Worker send the requests
  and the credential of a custom server? The options check widened the
  first question, "Which addresses may a custom server use?"
- **Options:**
  - **A.** `https` only, a DNS name with no IP address, port 443 only, and
    no host of the app. The hosts of the app are each host that the
    deployment settings name, and each host under them. Effort: Small.
  - **B.** As A, with any port. Effort: Small.
  - **C.** Any `https` address, except a host of the app. Effort: Small.
  - **E.** Added by the options check. As A, and the address of a custom
    server stays as it was when the person connected. A new address needs
    a new connection. Effort: Small.
  - **F.** Added by the options check. As A, and the same rule applies to
    each address that the sign-in discovery returns. These are the
    metadata, the authorization server, and the token, registration, and
    revocation endpoints. Cost: a custom server whose sign-in uses another
    port or an IP address fails. Effort: Small.
  - **D.** Added by the options check. As A, and each egress proxy that
    carries the requests of custom servers resolves the name and connects
    only to a public address. It matters only if MCP decision 6 sends such
    requests through a proxy. Effort: Medium.
- **Left out:**
  - `http` addresses: the Worker would send credentials in plain text.
  - Hosts of the app: a connection could then send requests to the routes
    of the app and to previews.
- **Wider fix:** F. Put the check in one fetch helper that every vendor
  request uses, also each sign-in request. Read the hosts of the app from
  the deployment settings, so that a new hostname needs no change to the
  rule.
- **Previous examples:** The rule for the routed backend of the model
  gateway at `docs/protocol/model-gateway.md:220-221`.
- **Related:** MCP decision 8 decides when custom servers ship. MCP
  decision 13 covers the sign-in callback of every server. Milestone 12
  waits for this answer.
- **Recommendation:** F, changed by the options check from A. The metadata
  of a custom server can name a token or registration endpoint on a host
  of the app. A does not check those addresses.
- **Action:** ask the user, because each option adds a new rejection, and
  the always-on rules keep that choice with the user.

### 12. An org connection outlives its maker's access

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. New in this plan.
- **Category:** Security.
- **Location:** `docs/protocol/orgs-and-members.md:206-218`,
  `docs/protocol/routines.md:136-153`.
- **Background:**
  - An org connection holds the sign-in or key of one person at the
    vendor, and it can act in the turns of every member.
  - When a member leaves or an admin removes them, their routines move to
    another member and turn off (decision 508 E). Runs on the logins of a
    member who left were rejected.
  - The routines of a suspended owner start no runs
    (`docs/protocol/routines.md:156-158`).
  - The brainstorm notes report that other products advise a service
    account for a shared connection. A service account belongs to the
    company, not to the person. The Worker cannot tell a service account
    from a personal account. D drops the assumption that the account is
    personal.
  - Options A to D assume that only a leave, a removal, or a suspension
    ends the link of the maker. Under MCP decision 4 A, an admin who
    becomes a member keeps access but loses the right to make org
    connections. E drops it.
- **Problem:** No rule says what happens to an org connection when its
  maker leaves the org, is removed, or is suspended.
- **Impact if no action:** The outside account of a former member can keep
  acting in the turns of the org.
- **Root question:** What happens to an org connection when its maker loses
  access to the org, or loses the right to make org connections? The
  options check widened the first question, "Whose outside account serves
  the turns of the org after the member who connected it loses access to
  the org?"
- **Options:**
  - **A.** The connection keeps acting. Its tile names the member who left.
    Cost: the personal account of a former member can keep acting.
    Effort: Small.
  - **B.** The connection stops acting. After a leave or a removal, the
    Worker deletes its token or key and revokes the grant where the vendor
    allows. Its tile keeps its settings and asks an admin to connect again.
    While the maker is suspended, it acts in no turn. Effort: Small.
  - **C.** The Worker deletes the connection with its settings. Effort:
    Small.
  - **E.** Added by the options check. As B, and the connection also stops
    when its maker loses the right to make org connections, such as an
    admin who becomes a member. Cost: a change of role stops a service for
    every member until an admin connects again. Effort: Small.
  - **D.** Added by the options check. The connection stops acting, and the
    Worker keeps its credential. An admin then chooses Keep, which lets it
    act again, or Remove. Cost: the account of a former member can act
    again with no consent of that person, and the credential stays stored
    until the admin chooses. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because the answer sets one rule of offboarding.
- **Previous examples:** Decision 508 E for the routines of a member who
  leaves.
- **Related:** MCP decisions 4 and 7. Milestones 2 and 7 have TODOs that
  wait for this answer.
- **Recommendation:** B. It follows the rule for the routines of a member
  who left, and an admin restores the service with one sign-in.
- **Action:** ask the user, because the options trade continuity against
  the account of a former member, and no requirement covers it.

### 13. Another person can finish a member's sign-in

- **Answer:** Open.
- **Severity:** High. **Effort:** Medium.
- **Source:** Design. Added by the options check of this plan.
- **Category:** Security.
- **Location:** `docs/protocol/access-and-security.md:78-81`,
  `docs/protocol/desktop-sign-in.md:38-53`.
- **Background:**
  - After a sign-in, the vendor sends the browser back to the callback of
    the app. The address carries a code and the state of the sign-in. The
    address of the vendor page holds that state too.
  - The GitHub sign-in callback needs no sign-in. It checks its state
    value, which a signed cookie of the same browser carries
    (`docs/protocol/access-and-security.md:78-79`,
    `worker/security/README.md:106`).
  - A connect from the Mac app finishes in the default browser, as the
    GitHub App install does. Only the cookie store of the Mac app holds
    its sign-in, so that browser can lack it
    (`docs/protocol/desktop-sign-in.md:38-53`).
  - All options check a one-use state that expires after 10 minutes. The
    source is the practice of the GitHub sign-in. This holds.
- **Problem:** When the callback checks only the state, a person who gets
  the sign-in address of a member can finish it with their own vendor
  account. The connection of the member then acts with the account of
  that person.
- **Impact if no action:** The agents of the member can write code and
  chat text into an account that another person controls.
- **Root question:** How does the callback know that the person who
  finishes a sign-in is the person who started it?
- **Options:**
  - **A.** The callback checks only the one-use state. Cost: the risk of
    the problem stays, although only the member who started the sign-in
    sees its address. Effort: Small.
  - **B.** The Worker also sets a signed cookie in the browser that starts
    the sign-in, and the callback checks it, as the GitHub sign-in does. A
    sign-in from the Mac app first opens a one-use start address of the
    Worker in the default browser, which sets the cookie. Cost: a stolen
    start address still works once, before the member uses it. Effort:
    Medium.
  - **C.** The callback needs the sign-in of the member who started the
    sign-in. A browser without it asks for a sign-in first. Cost: a member
    who uses the Mac app must also sign in in the default browser. Effort:
    Medium.
  - **D.** After the callback, the connection waits until the member
    confirms it in the app, which shows the account name that the vendor
    reports. Cost: many vendors report no account name, so the confirm
    shows little. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. One check binds each sign-in to the browser that
  started it, also for later custom servers.
- **Previous examples:** The signed state cookie of the GitHub sign-in
  (`worker/security/README.md:106`).
- **Related:** MCP decision 11. Milestones 1, 2, and 6 have TODOs that wait
  for this answer.
- **Recommendation:** B. It binds each sign-in to the browser that started
  it, as the GitHub sign-in does, and it keeps the flow of the Mac app.
- **Action:** ask the user, because the callback adds a new gate rule to
  the app, and the options trade safety against an easy connect.

### 14. No admin control over the presets

- **Answer:** Open.
- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. Added by the options check of this plan. Both
  brainstorm rounds proposed an admin list of presets.
- **Category:** Security.
- **Location:** `docs/protocol/orgs-and-members.md:151-159`.
- **Background:**
  - By MCP decision 2, each member can make a personal connection.
  - An agent can send code and chat text of the org to each service that
    a connection of its turn reaches.
  - Only an admin changes the setup of the whole org, such as the scripts
    and the env vars (decision 57).
  - The brainstorm notes report that Claude, Cursor, and OpenAI let admins
    limit the connectors of members.
  - All options assume the fixed catalogue of the design calls. This
    holds.
- **Problem:** No rule says whether an admin can limit the presets that
  members connect in the org.
- **Impact if no action:** Each member can connect each preset. An org
  that must keep its code away from some services has no control.
- **Root question:** Who decides which outside services the agents of an
  org may reach?
- **Options:**
  - **A.** No admin control in this change. Each member can connect each
    preset of the catalogue. Effort: Small.
  - **B.** An admin can turn off a preset for the org. Members cannot
    connect it, and its connections stop acting. Every preset starts on.
    Cost: a setting on each tile, its mockup, and a protocol section.
    Effort: Medium.
  - **C.** As B, but every preset starts off until an admin turns it on.
    Cost: an admin must act before any member can connect. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None, because the answer sets one rule of governance.
- **Previous examples:** Decision 57. The rejected admin setting for the
  reach of the session calls (`docs/protocol/session-calls.md:72-74`).
- **Related:** MCP decision 4. Milestones 1, 2, 7, and 10 have TODOs that
  wait for this answer.
- **Recommendation:** A in this change. A personal connection acts with the
  own account of the member, and B can follow with no change to the stored
  connections. B best protects an org that must limit where its code goes.
- **Action:** ask the user, because the options trade the freedom of
  members against the control of the org, and no option is clearly best.

## Design calls

These calls are mine, made on 13 November 2026 under the decision test.
Each one stays within MCP decisions 1 and 2 or a requirement in force.

### The catalogue and the tab

- The catalogue is a fixed list in the code, which the Worker, the app, and
  the mockups share. Reason: the docs of the official MCP registry ask
  host apps not to read it directly, and the registry is in preview. A
  probe of the brainstorm found no vendor entry there for five presets:
  Granola, Asana, Hex, Datadog, and Slack.
- Each tile shows the logo of its vendor, as the screenshot of the user
  does. The logos ship with the app, because the content security policy
  allows images only from the app, data addresses, and GitHub avatars
  (`worker/security/content-security.ts:11`). The rule against brand logos
  covers only the agents (`docs/protocol/agents-and-sessions.md:71-72`).
- The MCP servers tab is the fifth tab of the org settings, after Members.
  Every member uses it, also a member who is not an admin, because each
  member makes personal connections there. The other tabs stay read-only
  for such a member.
- The command palette lists the new tab in its group of org settings, as
  it lists the other four tabs
  (`docs/protocol/command-palette-actions.md:94-96`).
- The tab has three views: All, Installed, and Recommended. All shows every
  preset. Installed shows each connection that acts in the turns of the
  viewer in this org. Recommended shows the presets that the catalogue
  marks. MCP decision 9 decides whether it also shows the presets of
  teammates.
- A suspended org shows the tab read-only, as it shows its other tabs.
- A region is a fixed choice of the catalogue. PostHog, Amplitude,
  Honeycomb, Hex, and Datadog have regions. A host that a person types,
  such as a Hex host of one company, waits for custom servers and MCP
  decision 11.
- The connect dialog names the step that the vendor needs from an admin of
  the customer. Examples are the domain list of Atlassian and the redirect
  list of Datadog.
- The catalogue starts with the 21 presets that register themselves. A
  preset also takes a pasted key where its vendor takes one. MCP decision
  8 decides when each part ships. The brainstorm notes give the address
  and the sign-in kinds of each preset. The 24 services of the screenshot
  fall in three groups:
  - Through a CIMD: Granola, Notion, Airtable, Linear, PostHog,
    Amplitude, Sentry, Vercel, Cloudflare, Neon, Atlassian, Honeycomb,
    Context7, Firecrawl, and Exa.
  - Through DCR only: Hex, Datadog, Composio, Stripe, Supabase, and
    PlanetScale.
  - With a pre-registered client: Asana, Slack, and Snowflake.
- A custom server is a connection with an address that a person types.
  Its scope follows MCP decision 2, and an org custom server follows MCP
  decision 4. MCP decision 11 sets its addresses.
- The scope of a connection stays as it was made. To change it, a person
  removes the connection and connects again. Reason: a change from
  personal to org moves the account of one person into the turns of every
  member, with no new sign-in.
- Every member sees the org connections of the org, with the member who
  made each one and its date. Reason: they can act in the turns of every
  member (MCP decision 2).
- The Worker does not test a pasted key when a person saves it. A refused
  key shows at its first use: the call names the settings page, and the
  tile asks for a new key. Reason: a test at save adds a rejection, which
  needs the user.

### Credentials and sign-in

- The Worker stores each access token, refresh token, and key encrypted and
  write-only. No token or key returns to the browser. The runner and the
  Durable Object never get the credential of a vendor.
- The Worker is the OAuth client. It uses a CIMD first, then DCR. The
  brainstorm notes report this order from the MCP authorization spec of
  28 July 2026. Each sign-in uses PKCE. Pre-registered clients wait for
  MCP decision 8.
- The app serves one CIMD at a fixed address on `app.conductive.build`,
  with no sign-in. The Worker builds it from the app origin of the
  deployment.
- Each DCR registration serves the whole app, one for each preset and
  deployment. The Worker stores it encrypted.
- The sign-in callback is on `app.conductive.build`. It checks a one-use
  state that expires after 10 minutes. MCP decision 13 decides how it also
  checks the person who finishes the sign-in.
- A connect from the Mac app finishes in the default browser, as the GitHub
  App install does (`docs/protocol/desktop-sign-in.md:38-48`).
- After the callback, a browser returns to the MCP servers tab. A sign-in
  from the Mac app ends on a page that says to go back to the Mac app. The
  Mac app reads the tab again when its window gets the focus.
- The Worker renews one access token at a time for each connection. It
  saves each new refresh token before it uses the new access token, as for
  ChatGPT sign-ins (`docs/protocol/tokens-and-secrets.md:126-129`).
  Reason: the docs of Notion say that it revokes a grant when a client
  sends an old refresh token again.
- A refused renewal marks the connection as needing a new sign-in, and its
  tile offers Reconnect.
- A removal deletes the stored credential. The Worker also revokes the
  grant where the vendor offers revocation.

### The MCP route

- The route is `/v1/mcp/<server>` on `api.conductive.build`, under `/v1/`
  as decision 102 requires. The gate accepts the turn token there, as on
  the model routes. The route accepts no other credential.
- The path names the server as the turn lists it. At each request, the
  Worker maps the name to a connection from its own records. So a request
  cannot choose an account that its turn cannot use.
- At each request, the Worker checks the turn token as the model gateway
  does. It then checks that the sender is still a member of the org and is
  not suspended. It also checks that the connection still exists and acts
  in the turn.
- The Worker forwards each request only to the address of the preset and
  region of the connection. It supports POST, GET, and DELETE of the
  Streamable HTTP transport of MCP.
- The Worker drops the rest of the path after the server name, and the
  query of the request of the agent. Reason: a query that passes on could
  undo a read-only form, such as `read_only=true`.
- It forwards only allowed request headers, such as `Accept`,
  `Content-Type`, `Mcp-Session-Id`, `MCP-Protocol-Version`, and
  `Last-Event-ID`. It never forwards the turn token or a cookie. It follows
  no redirect. It sends back only allowed response headers.
- Each answer streams as it arrives, and the Worker holds back no part, as
  the model gateway does.
- The Worker never passes on a 401 or a sign-in challenge of a vendor. It
  answers with an MCP error that names the service and the settings page.
  Reason: a challenge makes the agent start a sign-in of its own.
- The route answers each refusal of its own with an MCP error with a
  stable code, never with HTTP 401. A refused credential, such as a turn
  token after its turn, gets HTTP 403. A body above its limit keeps HTTP
  413 (decision 93). Reason: a 401 makes an MCP client start a sign-in of
  its own.
- The route keeps the default body limit of 1,000,000 bytes for a request
  (decisions 65 and 93). It adds no byte limit and no time limit on an
  answer, as the model gateway does
  (`docs/protocol/model-gateway.md:299-301`). The time limits of the agent
  programs apply. Reason: a new limit adds a rejection, which needs the
  user.
- A request that still runs when its turn ends stops within 30 seconds, as
  gateway decision 6 says for model requests.
- The Worker keeps no copy of a request or an answer. It writes no body and
  no header value to a log, as the model gateway does.

### The turn and the agents

- The turn command carries the servers of its turn: the name and the
  Worker address of each, with no credential. The list holds a server only
  when a usable connection acts in the turn. MCP decisions 5 and 10 decide
  which connections act.
- A connection that needs a new sign-in or key stays out of the list, and
  its tile offers Reconnect. A request that fails during the turn gets the
  MCP error that names the settings page. Reason: a listed server that
  cannot start gives the agent no tool, and the tile tells the member.
- Each server takes the ID of its preset as its name, such as `linear`.
  If MCP decision 10 gives a turn more than one connection for a preset,
  each one gets a name of its own.
- A runner gets the list only when its hello declares support, as a runner
  declares its login kinds today (`src/shared/runner.ts:28-34`). A runner
  without MCP support gets no list, and its turns run without the servers,
  with no error. Reason: a turn can work without them, and graceful
  handling is the rule of the repository.
- A workspace gets the servers only in a cloud computer that starts from
  an org image built after the release. Each build installs the newest
  runner (`docs/protocol/agent-runner.md:26-27`).
- Both agents get each server as a remote HTTP server at its Worker
  address. The runner puts the turn token in an `Authorization` header of
  each server entry: `mcpServers` for Claude, and `mcp_servers` for Codex.
- The token never goes into the environment of an agent or of its tools,
  as for the model gateway (`docs/protocol/model-gateway.md:68-70` and
  `:118-119`).
- The pinned Claude SDK 0.3.318 passes `mcpServers` to its program as a
  `--mcp-config` command-line argument. So the header shows in the process
  list of the sandbox. Every process of the sandbox user can already read
  the turn token (`docs/protocol/version-pins.md:24-31`), so no new reader
  gets it.
- A headers helper that reads a private file was the other way. It adds a
  program and a process for each server, for no new protection.
- A message that joins a running turn keeps the servers of that turn,
  because it keeps its sender. Option E of MCP decision 5 would change
  this. A connection that a person adds during a turn acts from the next
  turn.
- Each turn gets every connection that acts in it. No session chooses its
  servers. Claude defers the tools of a remote server behind its tool
  search when tool search is on, as the type of the pinned SDK says.
- MCP decision 3 decides what an agent may change at a service, and
  whether a person approves a write call. Today no agent tool waits for a
  person (`runner/README.md:38-39`), and no design call changes that.
- The agents stay the MCP clients. So all MCP features pass: tools,
  resources, and prompts.
- The chat shows a call to a connected server under the existing rule: the
  name of the tool without its server, and its subject
  (`docs/protocol/chat-and-events.md:151-160`). The mockups check whether a
  member can tell the service. If a member cannot, the last TODO of the
  mockup milestone raises a decision.

### Risks that the change accepts

- Sandbox code can copy the turn token during a turn. While the turn runs,
  the copy can call the connected servers of that turn, also from outside
  the sandbox. After the turn, the copy does nothing. The model gateway
  has the same risk today (`docs/protocol/version-pins.md:24-39`).
- A process that keeps running in the sandbox can get the turn token of
  each later turn while that turn runs
  (`docs/protocol/version-pins.md:46-51`). So it can act with the
  connections of later turns, also of other senders.
- Every member reads every chat of the org (decision 39). So an agent
  answer can show data from a personal connection to the whole org. The
  guide and the Privacy page say so.
- Text from other GitHub accounts can steer the agent of a routine run
  while it uses the connections of that run
  (`docs/protocol/routines.md:180-186`).
- On a ChatGPT turn, the rules of the ChatGPT workspace can limit the MCP
  servers of Codex (`docs/protocol/tokens-and-secrets.md:154-159`). Such a
  turn can lack the servers.
- A vendor sees the addresses of Cloudflare, not of the cloud computer. A
  vendor, or a customer with an IP allow list, can refuse them. MCP
  decision 6 covers the probe and the fix. Until a fix exists, such a
  customer cannot use that preset, and the guide says so.

### Names and docs

- The tab is "MCP servers", as in Conductor. No text names Boat, and no
  text uses "Claude Code" as a name.
- Two new protocol docs hold the requirements.
  `docs/protocol/mcp-servers.md` covers the catalogue, the tab, the
  connections, and who sees them. `docs/protocol/mcp-gateway.md` covers
  the MCP route. Reason: one doc would pass about 250 lines.
- A new public guide, `src/marketing/docs/mcp-servers.md`, in the group
  Manage, explains the tab, the scopes, and the risks.

## Components

- `src/shared/mcp-presets.ts`: the catalogue. Each preset gives its ID,
  name, logo key, MCP address for each region, sign-in kinds, key header,
  read-only form, vendor note, and recommended mark. It imports no React
  and no Worker module.
- The logo of each preset: an SVG file with the shared parts of the
  mockups, which the app also uses.
- D1 tables, in one migration:
  - `mcp_connections`: the org, the scope, the member, the preset, the
    region, the read-only choice, the credential kind, the encrypted
    credential, the state with its cause, and the dates.
  - `mcp_clients`: the client of each preset that registered through DCR,
    with its encrypted secret.
  - `mcp_sign_ins`: each sign-in that waits, with the hash of its state,
    the encrypted PKCE verifier, the draft of its connection, the kind of
    its origin, and its expiry.
- `worker/mcp/`: a new area of the Worker with its own README. It holds the
  OAuth client, the app routes of the tab, and the MCP route.
- The gate of `api.conductive.build`: it accepts the turn token on
  `/v1/mcp/` too.
- One check of the turn token, which the model gateway and the MCP route
  share.
- The runner: a hello field that declares support, a field of the turn
  command with the servers, and the server entries of both agents in
  `runner/src/providers/claude.ts` and `runner/src/providers/codex.ts`.
- The tab in `src/shell/settings/`, with the mockup parts that it shares,
  as the other tabs do.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the MCP servers tab, its connect flow, a connection, and the errors.
Also draw the row of the command palette and the calls in the chat. Draw
each screen on desktop and on a phone. Mark each part that waits for an
open decision. Read the
[mockups README](../docs/mockups/README.md) and
[Orgs, members, and logins](../docs/mockups/orgs-and-logins.md) first. The
tabs of the org settings live in
`docs/mockups/src/screens/orgSettingsTabs.tsx`.

- [ ] Add the tab `mcp-servers` to `OrgSettingsScreen` and its `TabBody`,
      after Members. Add its paths to `docs/mockups/src/paths.ts`.
- [ ] Add the logo of each of the 21 presets as an SVG with the shared
      settings parts. Record the source page of each logo.
- [ ] Add the page `app/org-settings/mcp-servers`, with the All view as its
      canonical screen: the grid of tiles, and one tile with the Installed
      mark.
- [ ] Add the child page `app/org-settings/mcp-servers/views`:
  - [ ] Installed, with a personal and an org connection.
  - [ ] Recommended. The presets of teammates wait for MCP decision 9.
  - [ ] The view of a member who is not an admin. Waits for MCP
        decision 4.
  - [ ] A suspended org, read-only.
  - [ ] An admin control for the presets of the org. Waits for MCP
        decision 14.
- [ ] Add the child page `app/org-settings/mcp-servers/connect`:
  - [ ] A preset with a sign-in only, such as Granola.
  - [ ] A preset with a sign-in or a key, such as Linear, with the key
        field open.
  - [ ] A preset with regions, such as PostHog.
  - [ ] A preset whose vendor needs a customer admin, such as Atlassian.
  - [ ] The wait while the sign-in runs in another tab or in the browser.
  - [ ] The scope choice in each dialog. The org choice waits for MCP
        decision 4.
  - [ ] The control of what an agent may change, such as a read-only
        switch. Waits for MCP decision 3.
- [ ] Add the child page `app/org-settings/mcp-servers/connection`: a
      personal connection, an org connection for an admin and for a
      member, Remove, and Reconnect.
- [ ] Add the child page `app/org-settings/mcp-servers/errors`: a cancelled
      sign-in, a sign-in that the vendor refused, a vendor that does not
      answer, and a refused key.
- [ ] Add the child page `app/org-settings/mcp-servers/mac-app`: the
      browser page after a sign-in from the Mac app, and the tab in the
      Mac app after the return.
  - [ ] The finish of a sign-in in a browser that did not start it. Waits
        for MCP decision 13.
- [ ] Add the page `app/chat/mcp-servers`: a turn with calls to two
      connected servers, and a call that fails with the error that names
      the settings page. Use the existing rule for tool lines.
- [ ] Add the row "MCP servers" to the group of org settings of
      `app/command-palette/settings`.
- [ ] Add the user flow `user-flows/connect-an-mcp-server`: the All view,
      the connect dialog, the wait, the Installed view, and the chat turn
      that calls the server.
- [ ] Draw the custom server form with the callback address to copy, and
      the tiles of Asana, Slack, and Snowflake. Waits for MCP decisions 8
      and 11.
- [ ] Draw Import from local in the Mac app: its tile, the found servers
      with their presets, and a Mac app that does not run. Waits for MCP
      decision 8.
- [ ] Add the design page `docs/mockups/mcp-servers.md` with what the
      screens show. Link it from the mockups README.
- [ ] Add the new pages and the flow to the catalogue.
      `docs/mockups/catalogue.md` has 336 lines, so put their details in a
      linked page, `docs/mockups/catalogue-mcp-servers.md`, with one row in
      the table.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages on both
      sizes, in light and dark, with `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show. Add an MCP decision when the decision test says so,
      for example for the tool line of a connected server.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of the tab, the connections, and
the MCP route. Update each doc that restates the turn token, the secrets,
or the gates. A TODO that waits for an open decision writes only the rules
that every option shares, until the user answers.

- [ ] Add `docs/protocol/mcp-servers.md` with the rules of the catalogue,
      the tab, the connections, the scopes, sign-in, keys, renewal, and
      removal. Define the MCP decision number. Cite MCP decisions 1 and 2.
  - [ ] What an agent may change at a service. Waits for MCP decision 3.
  - [ ] Who makes org connections. Waits for MCP decision 4.
  - [ ] Where a personal connection acts. Waits for MCP decision 5.
  - [ ] The orgs of a personal connection. Waits for MCP decision 7.
  - [ ] Who sees personal connections. Waits for MCP decision 9.
  - [ ] Two connections for one preset. Waits for MCP decision 10.
  - [ ] An org connection whose maker loses access. Waits for MCP
        decision 12.
  - [ ] The check of the person who finishes a sign-in. Waits for MCP
        decision 13.
  - [ ] An admin control for the presets. Waits for MCP decision 14.
- [ ] Add `docs/protocol/mcp-gateway.md` with the rules of the MCP route:
      its address, the turn token, the checks, forwarding, streams, errors,
      limits, and risks.
- [ ] `docs/protocol/model-gateway.md`:
  - [ ] Change "A turn token works only on the gateway routes" (line 167).
        The token also works on the MCP route, by MCP decision 1.
  - [ ] Say that on the MCP route the token uses the connections of the
        turn, not the agent login (line 170).
  - [ ] Say that the MCP server entries of each agent carry the turn token
        in a header (lines 68-70 and 118-119).
  - [ ] Keep the rule that no process that the agent starts gets the token
        from the runner.
  - [ ] The doc has 322 lines. Move one section, such as "How the agents
        reach the gateway", to a linked page, as the `documentation` skill
        says.
- [ ] `docs/protocol/version-pins.md`: the token works on the model routes
      and the MCP route (line 38). Add the connected servers to the risks
      of a copied token and of a process that keeps running (lines 24-55).
- [ ] `docs/protocol/access-and-security.md`: the gate accepts the turn
      token on the MCP route too (lines 94-97). The CIMD needs no sign-in
      (lines 78-81). Add the MCP route to the routes of the machine
      hostname (lines 86-90).
  - [ ] The check of the sign-in callback. Waits for MCP decision 13.
- [ ] `docs/protocol/isolation.md`: keep "What a sandbox holds" (lines
      89-111) true, and say that no credential of a connection reaches a
      sandbox. Add the reach of a turn token to the connected servers to
      the risks. The doc has 251 lines, so split it into linked pages, as
      the `documentation` skill says.
- [ ] `docs/protocol/tokens-and-secrets.md`: add the credentials of
      connections to "Secrets that users enter", with the write-only rule
      and the renewal rule. Say that the workspace token does not work on
      the MCP route.
- [ ] `docs/protocol/agent-tools.md`: add a short section on connected MCP
      servers that links to `mcp-servers.md`. The doc has 274 lines, so
      move one section to a linked page.
- [ ] `docs/protocol/agent-runner.md`: a turn of a runner with MCP support
      also brings the servers of the turn (lines 101-107). Say how a runner
      declares support.
- [ ] `docs/protocol/orgs-and-members.md`: every member uses the MCP
      servers tab (lines 151-159). The doc has 254 lines, so split it into
      linked pages.
  - [ ] The rules of org connections and of a member who leaves (lines
        206-226). Waits for MCP decisions 4, 7, 12, and 14.
- [ ] `docs/protocol/routines.md`: a run uses the connections that act in
      its turns. Add the connections to the risks that stay open (lines
      178-211).
- [ ] `docs/protocol/command-palette-actions.md`: the group of org settings
      holds five tabs (lines 94-96).
- [ ] `docs/architecture.md`: the machine hostname also serves the MCP
      route (line 117). The app hostname also serves the sign-in callback
      and the CIMD (line 116).
- [ ] `docs/architecture/components.md`: the Worker runs the MCP route and
      the OAuth client of the connections. Add the vendors to the external
      services.
- [ ] `docs/architecture/flows.md`: a chat turn that calls a connected
      server.
- [ ] `docs/architecture/data-and-trust.md`: the connections in the
      encrypted storage of the Worker (line 23). The MCP route is the
      boundary between a sandbox and the vendors (lines 49-56).
  - [ ] An egress proxy for vendor hosts as a trust boundary. Waits for
        MCP decision 6.
- [ ] `docs/architecture/protocol-docs.md`: list the two new docs and each
      new linked page.
- [ ] Read both legal pages in full: the Terms in `src/marketing/terms.ts`
      with `terms-org.ts`, and the Privacy page in `src/marketing/privacy.ts`
      with `privacy-uses.ts` and `privacy-recipients.ts`. Update each
      sentence that restates a changed fact. The known places are these:
  - [ ] `terms.ts:59-94`, "Your accounts": the connected services, their
        terms, and the calls through Conductive.
  - [ ] `terms.ts:220-231`, "Ending your use": a person removes
        connections on the MCP servers tab.
  - [ ] `terms-org.ts:64-89`: the credential of a turn also reaches the
        connected servers of the turn. An org connection acts with the
        account of one person in the turns of every member.
  - [ ] `privacy-uses.ts:90-104`, "Keys and logins": the tokens and keys of
        connections, stored encrypted and kept outside the cloud computer.
  - [ ] `privacy-uses.ts:125-136`, "Your code": the requests to connected
        services pass through Conductive, with no copy.
  - [ ] `privacy-recipients.ts`: the vendors that a person connects get the
        requests of the agents, and members see the answers. The credential
        of a turn reaches the connected servers (lines 83-99).
  - [ ] Give each changed page a new effective date (`terms.ts:33`,
        `privacy.ts:27`). When the Terms change, raise `TERMS_VERSION` in
        `src/shared/terms.ts`, as earlier changes of the Terms did.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, as
      [Website docs](../docs/protocol/website-docs.md) says. The known
      places are these:
  - [ ] "Know whose account an action uses" in `security.md:25-60`: add
        the connections of a turn to its table.
  - [ ] The turn token in `security.md:95-152`.
  - [ ] The row "Manage members and org settings" in
        `orgs-and-members.md:90`: a member uses the MCP servers tab.
  - [ ] "Apply setup changes" in `cloud-computer.md:132-159`: a new cloud
        computer gets the servers after the next build.
- [ ] Add the guide `src/marketing/docs/mcp-servers.md` in the group
      Manage. It covers the tab, the scopes, sign-in, keys, customer
      admins, IP allow lists, the shared chat, and the risks. Add it to
      [Source references](../src/marketing/docs-authoring.md#source-references).
- [ ] Change the row "MCP servers for cloud" in
      `src/marketing/from-conductor/areas/integrations.ts:34-39` to
      Available, with a note on the presets and the scopes. Follow the
      claim rules of
      [Statuses](../docs/protocol/conductor-comparison.md#statuses).
- [ ] Check the rows Linear (`integrations.ts:26-32`), Slack
      (`integrations.ts:40-46`), and Sync agent configs
      (`models-and-providers.ts:112-117`) against the claim rules. Change a
      status or a note only where a rule holds.
- [ ] Docs for custom servers, pre-registered clients, and Import from
      local. Waits for MCP decision 8.

## Milestone 3: Probe of the presets from a Worker

Depends on: none

Waits for MCP decision 6.

Find each preset that refuses requests from a Cloudflare Worker, before
the MCP route depends on it. The probe sends no credential.

- [ ] With the user's approval, run a temporary Worker in the Cloudflare
      account of the operator.
- [ ] Send a request with no credential to the MCP address of each of the
      21 presets. Also send one to its two metadata addresses and its token
      endpoint. Record the status and the content type of each answer.
- [ ] Count a 401 with an MCP challenge, or a 400 from a token endpoint, as
      a pass. Count a 403 with a block page, or a refused connection, as a
      block.
- [ ] Save the results in `.context/preset-mcp-servers/worker-probe.md`.
      Add one line under this milestone that names the file.
- [ ] For each blocked preset, apply the answer of MCP decision 6. Update
      Milestones 4 and 8.
- [ ] Delete the temporary Worker.

## Milestone 4: The preset catalogue

Depends on: 2

Add the catalogue that the Worker, the app, and the mockups share.

- [ ] Add `src/shared/mcp-presets.ts` with the 21 presets that register
      themselves, as the components say. Take the addresses from the
      brainstorm notes, and check each one against the docs of its vendor
      again.
- [ ] Give PostHog, Amplitude, Honeycomb, Hex, and Datadog their regions.
- [ ] Record the read-only form of Linear, Supabase, Neon, PostHog, and
      PlanetScale. Its default waits for MCP decision 3.
- [ ] Leave out or mark each preset that Milestone 3 found blocked. Waits
      for MCP decision 6.
- [ ] Add `src/shared/mcp-presets.test.ts`: unique IDs, `https` addresses,
      an address for each region, and a sign-in kind or key header for
      each preset.
- [ ] Move the mockups to the shared catalogue, with no change to a screen.
      Run `npm run mockups:check`.
- [ ] Update the [shared README](../src/shared/README.md).

## Milestone 5: Connection records

Depends on: 2, 4

Store the connections, the registered clients, and the waiting sign-ins,
encrypted.

- [ ] Add one D1 migration with `mcp_connections`, `mcp_clients`, and
      `mcp_sign_ins`, as the components say. Follow the
      [migrations README](../migrations/README.md).
  - [ ] The org of a personal connection. Waits for MCP decision 7.
  - [ ] The unique keys of the connections of one preset. Waits for MCP
        decision 10.
  - [ ] The read-only field. Waits for MCP decision 3.
  - [ ] The table `mcp_clients`. Waits for MCP decision 8, because its
        option E moves DCR to a later release.
- [ ] Encrypt each token, key, client secret, and PKCE verifier with the
      helpers of `worker/security/crypto.ts`, as for agent logins.
- [ ] Add the data functions: read the connections of an org and a member,
      save, change the state, claim a renewal, and delete.
- [ ] Test with the local D1: encryption at rest, no credential in a read
      for the browser, and the renewal claim.
- [ ] Add `worker/mcp/README.md`, and link it from the
      [Worker README](../worker/README.md). Update the migrations README.

## Milestone 6: The OAuth client

Depends on: 5

Waits for MCP decision 8, because its option D moves the sign-ins to a
later release, and its option E moves DCR there.

Let a person sign in at a vendor, and keep the sign-in working.

- [ ] Serve the CIMD at its fixed address on the app hostname, with no
      sign-in. Build it from the app origin of the deployment.
- [ ] Read the protected resource metadata and the authorization server
      metadata of a preset. Accept only `https` addresses.
- [ ] Register through DCR when the vendor takes no CIMD, once for each
      preset, and keep the client.
- [ ] Start a sign-in: save the waiting sign-in with its state, PKCE
      verifier, and draft, and return the authorization address.
- [ ] Add the callback: check the one-use state and its expiry, exchange
      the code, and save the connection. Return to the tab, or show the
      page for the Mac app.
  - [ ] Check the person who finishes the sign-in. Waits for MCP
        decision 13.
- [ ] Renew before expiry, one renewal at a time for each connection. Save
      the new refresh token before the new access token is used. Mark the
      connection after a refused renewal.
- [ ] Revoke the grant at the vendor after a removal, where the vendor
      offers revocation.
- [ ] Add a fake vendor server for the tests, beside the fake GitHub and
      Boat servers. Test the CIMD, DCR, a reused state, an expired state,
      the order of a renewal, and a refused renewal.
- [ ] Update `worker/mcp/README.md`.

## Milestone 7: The app routes of the tab

Depends on: 5, 6

Give the tab its data and its actions.

- [ ] Add a route that lists the catalogue with the state of each preset
      for the viewer. The state covers the viewer's own connections and the
      org connections.
- [ ] Add routes that save a key, start a sign-in, reconnect, and remove a
      personal connection. Only its owner changes it.
- [ ] Refuse each write in a suspended org, as the other settings do.
- [ ] Add the org scope to these routes. Waits for MCP decision 4, and for
      MCP decision 8, whose option F moves the org scope to a later
      release.
- [ ] Give the personal connections of other members as MCP decision 9
      says. Waits for MCP decision 9.
- [ ] Delete or stop the connections of a member who leaves or is removed.
      Waits for MCP decisions 7 and 12.
- [ ] Add the admin control for the presets of the org. Waits for MCP
      decision 14.
- [ ] Add the routes to the route list of the
      [Worker README](../worker/README.md).
- [ ] Test each route: membership, the owner rule, the write-only rule, and
      a suspended org.

## Milestone 8: The MCP route

Depends on: 5, 6

Forward the MCP requests of the agents to the vendors.

- [ ] Let the gate of `api.conductive.build` accept the turn token on
      `/v1/mcp/`, and no other credential there. Add the path to
      `MACHINE_PATHS` in `src/shared/agent-tools.ts`.
- [ ] Check each request: the turn token, then the sender, then the
      connection. Move the check of the turn token to one helper that the
      model gateway and the MCP route call.
- [ ] Pick the connection of the named server for the turn. Waits for MCP
      decisions 5 and 10.
- [ ] Forward POST, GET, and DELETE to the one address of the preset and
      region, with the credential of the connection. Drop the rest of the
      path and the query of the agent request. Apply the header lists of
      the design. Follow no redirect.
- [ ] Apply the limit of what an agent may change, such as the read-only
      form of the connection. Waits for MCP decision 3.
- [ ] Stream each answer with no hold. Stop a request within 30 seconds
      after its turn ends. Cancel the vendor request when the agent closes
      its connection.
- [ ] Answer a vendor 401, an expired connection, and a removed connection
      with the MCP error that names the service and the settings page.
      Never pass on a sign-in challenge.
- [ ] Answer each refusal of the route itself with an MCP error and HTTP
      403, or HTTP 413 for a body above its limit. Never answer HTTP 401.
- [ ] Send the hosts that Milestone 3 found blocked through an egress
      proxy. Waits for MCP decision 6 and the probe.
- [ ] Write no body and no header value to a log.
- [ ] Test each check with the fake vendor server: a copied token after
      the turn, and the connection of another member or of another org.
- [ ] Also test the header lists, a dropped query, streams, a vendor 401,
      a refusal of the route, and the end of a turn.
- [ ] Update `worker/mcp/README.md` and the
      [model gateway README](../worker/model-gateway/README.md).

## Milestone 9: The servers in each turn

Depends on: 8

Give both agents the servers of each turn.

- [ ] Add the support field to `RunnerHello`, and the server list to the
      turn command, in `src/shared/runner.ts`.
- [ ] Make the workspace add the list to each turn of a runner that
      declares support, from the connections that act in the turn. Waits
      for MCP decisions 5 and 10.
- [ ] In the runner, give Claude one `http` entry in `mcpServers` for each
      server, with the turn token in the `Authorization` header.
- [ ] Give Codex one entry in `mcp_servers` with its address and the same
      header for each server. First check the header setting of the pinned
      Codex 0.167.0.
- [ ] Check which entry wins when a repository `.mcp.json` or
      `.codex/config.toml` names a server with the same name. Choose names
      that keep both working. Record the result in
      [Runner agent tools](../runner/agent-tools.md).
- [ ] Hide the turn token in the text that screens show, as for the model
      gateway. Write no token to a log.
- [ ] Test the entries of both agents, and that no command of an agent has
      the turn token in its environment.
- [ ] Test a runner without MCP support, which gets no list, and a turn
      with no connection.
- [ ] Update the [runner README](../runner/README.md) and Runner agent
      tools.

## Milestone 10: The MCP servers tab

Tags: ui

Depends on: 1, 4, 7

Show the tab with its three views, as the mockups draw it.

- [ ] Add the tab to `src/shell/settings/OrgSettingsScreen.tsx`, after
      Members, with the views All, Installed, and Recommended.
- [ ] Draw the tiles with their logos from the shared parts of the mockups.
- [ ] Show the org connections to every member. Show them read-only to a
      member who may not change them.
- [ ] Show the presets of teammates in Recommended. Waits for MCP
      decision 9.
- [ ] Show the admin control for the presets of the org. Waits for MCP
      decision 14.
- [ ] Add the row of the tab to the group of org settings of the command
      palette.
- [ ] Show the loading, empty, and error states of the list.
- [ ] Test the views, the view of a member, and the row of the palette.

## Milestone 11: Connect and manage a connection

Tags: ui

Depends on: 1, 6, 7, 10

Let a person connect a preset, reconnect it, and remove it.

- [ ] Add the connect dialog with sign-in or key, the region, and the
      vendor note.
- [ ] Add the scope choice. The org choice waits for MCP decision 4.
- [ ] Add the control of what an agent may change, such as a read-only
      switch. Waits for MCP decision 3.
- [ ] Open the sign-in in the same tab of a browser. In the Mac app, open
      it in the default browser, and read the tab again when the window
      gets the focus. The start of a sign-in from the Mac app waits for
      MCP decision 13.
- [ ] Add the page of a connection with Reconnect, Remove and its confirm,
      and the states that need a new sign-in or key.
- [ ] Show the error states of the mockups.
- [ ] Test the dialog, the scopes, Reconnect, and Remove.
- [ ] Smoke-test the tab in `npm run dev`: the views, the dialog, a saved
      key, and Remove.

## Milestone 12: Custom servers and pre-registered clients

Depends on: 6, 7, 8

Waits for MCP decisions 8 and 11.

Let a person add an MCP server that is not in the catalogue, and add the
presets that need a registered client.

- [ ] Check each address of a custom server with the rule of MCP
      decision 11, at each save and before each request.
- [ ] Read the sign-in of any address, or take a key header, or take the
      client ID and secret of the person's own client. Show the callback
      address to copy.
- [ ] Add Asana with a client that the operator registers once. It needs an
      Asana account of the operator, so it waits for the user's approval.
- [ ] Add Slack and Snowflake as presets that use the person's own client,
      with their address patterns.
- [ ] Test the address rule, the sign-in of any address, and own clients.
- [ ] Update the protocol docs, the legal pages, the guide, and the rows of
      the comparison page.

## Milestone 13: Custom servers in the tab

Tags: ui

Depends on: 1, 11, 12

Waits for MCP decision 8.

- [ ] Add the custom server form with the callback address to copy.
- [ ] Add the tiles of Asana, Slack, and Snowflake.
- [ ] Test the form and its errors.

## Milestone 14: Import from local in the Mac app

Depends on: 7

Waits for MCP decision 8.

Let the Mac app find the MCP servers of the local settings files of the
member, with no secret.

- [ ] Add a read action to the settings operation of the device connection
      (`src/shared/device.ts:140-143`). The Mac app answers with the name,
      the address or the command, and the header names of each server.
- [ ] Send no value of a header, an env var, or a token. Test that no such
      value leaves the Mac.
- [ ] Read the settings of Claude, Codex, Cursor, and VS Code on the Mac.
      Name no source "Claude Code" in a text that users read.
- [ ] Match each entry to a preset by its address. Mark each entry that
      runs a program as not available in the cloud.
- [ ] Test the reader with sample files.
- [ ] Update the [Mac app README](../desktop/README.md) and
      [Permissions and Mac commands](../docs/protocol/desktop-commands.md).

## Milestone 15: Import from local in the tab

Tags: ui

Depends on: 1, 11, 14

Waits for MCP decision 8.

- [ ] Add the tile Import from local in the Mac app, and its list of found
      servers with their presets.
- [ ] Open the connect dialog of the matching preset from each row.
- [ ] Test the list, a server with no preset, and a Mac app that does not
      answer.

## Milestone 16: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests of each milestone with
      `npm run test -- <file>`.
- [ ] Run `npm ci`, `npm --prefix desktop ci`, and
      `npm ci --prefix runner`, then the complete gate, `npm run check`.
      Run `npm run mockups:check` for the mockups.
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

- [ ] Rebuild the org image of each test org, so that new cloud computers
      get a runner with MCP support. This needs the deployed change.
- [ ] In a real workspace of the test deployment, connect one preset with a
      sign-in and one with a key. Send a turn with Claude and a turn with
      Codex that each call the server. This needs the deployed change and
      accounts at the vendors.
- [ ] Connect a preset from the Mac app. Check the return page and the
      read of the tab when the window gets the focus. This needs a Mac.
- [ ] Connect Datadog and Atlassian with accounts whose admins allow
      Conductive. Check the note of the connect dialog.
- [ ] With the answer A of MCP decision 7, connect one vendor account in
      two orgs. Remove it in one org, and check that the other connection
      still works.
- [ ] Compare the catalogue with the metadata of each vendor, to find
      changed addresses.
