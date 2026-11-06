# Access and security

This doc holds the requirements and the decisions in force for sign-in,
the gates of the Worker, and the secrets. It also covers the isolation of
sandboxes, the terminal, and the port previews. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Sign-in

- Users sign in with GitHub only. The app offers no other sign-in.
- The app's GitHub App signs users in through its user authorization. One
  app then gives both the identity and the repository access.
- Cloudflare Access was rejected. Users sign in with GitHub, and Access
  cannot sign in inside a frame.
- Anyone with a GitHub account can sign up (decisions 22 and 48).
- The sign-up check on the age and the email of a GitHub account was
  dropped (decision 48). Each user's sandboxes run on their own Boat
  account, so the check no longer protects a shared account.
- The session lives in a signed cookie that is HttpOnly, Secure, and
  SameSite=Lax.
- The sign-in page and the footer of the marketing site link to the Terms
  and Privacy pages (decision 35).

## Hostnames and gates

- Each hostname has one gate. It runs before every route and every
  WebSocket upgrade.
- The gate of `app.conducting.build` checks the sign-in, a matching
  `Origin` header, and a JSON body for each write.
- Reason: an upgrade without an `Origin` check lets preview code open chat
  sockets.
- The hostname for machines serves the GitHub webhooks, the agent tools,
  the agent runner, and the git credential helper. Its gate checks a
  webhook signature or a workspace token in place of the sign-in.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.
- The marketing site at `conducting.build` needs no sign-in.

## Orgs and workspaces

- A request reaches an org, its workspaces, and their sandboxes only for a
  member of that org.
- Before each sandbox call, the Worker checks in its records that the
  sandbox belongs to a workspace of that org.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through to Boat.
- [Orgs and members](orgs-and-members.md#members-and-roles) states the
  rules of each role.

## Boat keys

- The Worker stores each Boat key encrypted, with an encryption key that
  is a Worker secret (decision 44).
- The Worker uses a Boat key only for the sandboxes of its own org.
- A Boat key never goes to the browser and never goes into a sandbox.
  Reason: a Boat key gives access to a whole Boat account.
- The Boat key screen asks for a key that is limited to one Boat
  environment and to the actions that the app uses.
- The app tests a Boat key once, when an admin saves it.

## What a sandbox holds

- Every sandbox starts with Boat's `noEnv` setting, so it gets none of the
  secrets of its Boat account.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- A sandbox gets no agent login at a start. The next section says how a
  turn gets its login.
- GitHub access reaches a sandbox only through the git credential helper.

## Agent logins in a sandbox

- Each turn runs on the agent login of its sender (decision 49).
- With each turn, the agent runner gets the login of the sender over its
  connection to the Durable Object. Reason: the sandbox gets its secrets
  only at a start, and each turn can have another sender.
- The runner never writes a login to disk.
- Risk: a member with a terminal in the same sandbox can read the login of
  the turn that runs now. Every other process in the sandbox can read it
  too, such as a tool of the agent or a server that the startup script
  started.
- So the members of one org trust each other with the logins of their
  running turns. A proxy that keeps every login out of the sandbox was
  rejected, because it is a much larger build.

## The workspace token

- Each workspace has its own workspace token.
- With the token, the sandbox of the workspace can do three things:
  - connect its agent runner to the Durable Object of its own workspace
  - get a GitHub token for its own workspace
  - create and list workspaces through the agent tools
- The token allows nothing else.

## GitHub tokens

- The git credential helper asks the Worker for a fresh GitHub token for
  each git operation. It proves itself with the workspace token.
- Reason: a GitHub App user token expires after 8 hours, and the secrets
  of a sandbox change only at a resume.
- Open decision 50 sets which repositories the token reaches, and whether
  it acts as a person or as the app.

## Secrets that users enter

- The app stores the Boat keys, the env var values, and the agent logins
  encrypted.
- The values of env vars are write-only. The browser never gets a stored
  value back.

## Agent logins

- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user connects Codex with an OpenAI API key. The app offers no ChatGPT
  plan sign-in, because OpenAI allows it for hosted apps only after a
  waitlist.
- Anthropic gave the operator permission to use `claude setup-token`
  tokens (decision 37).
- Risk: Anthropic plans to make bare mode the default, and bare mode reads
  no subscription login. A later release of the agent program can then
  stop the tokens.
- A sign-in inside a sandbox was rejected, because the login would stay on
  the disk of one workspace.
- A user's agent logins serve all of that user's orgs (decision 21).
- The app gives a user's login to a sandbox only for a turn that the user
  sent.

## Terminal

- The terminal socket runs on `app.conducting.build`, behind its gate.
- The terminal listens on a private port of the sandbox. The Worker
  connects to it with Boat's port cookie and a password for each
  workspace.
- Reason: sandbox code can make a port public, and the password still
  guards the terminal.

## Port previews

- Previews live on a separate registrable domain (decision 6).
- Each preview gets a random hostname one level under that domain, with at
  least 128 random bits. The hostname is the credential, so a frame needs
  no cookie.
- The Durable Object of the workspace revokes the hostname when the sandbox
  stops, when the user closes the preview, and after 24 hours. Reason: a
  leaked hostname then stops working soon.
- A revoked or an unknown hostname gets no answer from any sandbox.
- The preview proxy adds Boat's `_port_auth` cookie on the server side. It
  drops any `_port_auth` cookie that the browser sends.
- The preview proxy forwards the cookies of the previewed app.
- Each preview response carries `Referrer-Policy: no-referrer`. Reason: the
  default policy sends the preview origin, which is the credential, to
  other sites.
- These approaches were rejected:
  - previews behind Cloudflare Access, because Access cannot sign in
    inside a frame
  - previews under the app's own domain, because preview code would then
    be same-site with the app
  - Boat `_token` URLs in the browser, because such a token cannot rotate
    without a public gap

## Proxies and ports

- The proxies forward only an allowlist of headers and cookies. They never
  forward the app's session cookie to a sandbox.
- A private port of a sandbox never answers on its public address without
  its token.

## Desktop

- The Worker asks Boat for a new desktop URL on each page load. The URL
  works for 10 minutes and carries its token in the fragment.
