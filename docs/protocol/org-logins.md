# Org logins

This doc holds the requirements and the decisions in force for the org
logins. An org login is an agent login that an admin connects for one
agent of an org. This doc covers the org login, the Agents tab of the org
settings, and the default login, which a new session of a member takes.
It belongs to [Tokens and secrets](tokens-and-secrets.md).
[Agent logins](tokens-and-secrets.md#agent-logins) covers the personal
logins, and the rules for every agent login. The terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An org login
decision number names a decision of the change that adds the org logins,
as [Tokens and secrets](tokens-and-secrets.md) says.

## The org login

- An admin can connect one org login for each agent of an org (org login
  decision 1 B). For Claude, it is an Anthropic API key or an own
  endpoint. For Codex, it is an OpenAI API key or an own endpoint.
- An own endpoint as an org login follows each rule of
  [Own endpoint logins](own-endpoint-logins.md). That doc also says how
  the model pickers of every member follow the model list of an org
  endpoint (org login decision 3 A).
- Reason: a company key belongs to the org, and an admin then chooses where
  the code of the org goes. A share of a personal login with each org of
  its owner was rejected for these reasons.
- Org env vars that set up the agents were rejected, because they put the
  key in the sandbox (decision 120). A login for each workspace was
  rejected, because members would then set the same login again in each
  new workspace.
- A Claude subscription token or a ChatGPT sign-in as an org login was
  rejected. Reason: the consumer terms of Anthropic and OpenAI forbid
  making an account available to anyone else.
- The org login belongs to the org, not to the admin who connected it. It
  stays when that admin leaves the org.
- The app deletes the org logins with the other data of the org, as
  [Delete org](delete-org.md) says.
- An org login serves only the members of its org, and only in the
  workspaces of that org. [The default login](#the-default-login) says
  which new sessions take it.
- The app uses an org login only for the turns of the sessions on it. The
  one exception is that the Worker reads the model list of an org endpoint
  with its key, at the times that
  [Own endpoint logins](own-endpoint-logins.md) gives.
- The org login never reaches a sandbox, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox) says
  (decision 120).
- The app stores an org login encrypted for its org. A copy of the stored
  login of one org does not decrypt as the login of another org or of a
  user. Reason: a copied record then cannot pass as another login.
- The key and the full address of an org login are write-only, as for a
  personal login. No response gives them back.
- The admin who connects an org login must have permission to use its key
  or its endpoint for the org. The Terms page says so. It also says that
  the account of the key or of the endpoint pays.
- The app counts no use of an org login, and it sets no limit on it.
  Reason: the provider and the endpoint can limit the spend.

## The Agents tab

- The Agents tab of the org settings holds the org logins. It follows the
  Cloud computer tab.
- Only an admin connects, replaces, or removes an org login, and changes
  its switch "Use for every member" (org login decision 1 B). Reason: an
  org login reaches the sessions of every member, as the env vars reach
  the sandboxes of every member (decision 57).
- The form of the tab is the form of the Agents tab of Account settings with fewer options.
  It offers only API key and Own endpoint, and it has no share switch.
  Reason: the user asked for a copy of the account form with fewer
  options.
- Each member who is not an admin sees the tab read-only. For each agent,
  the tab shows the kind of its org login, the host of an own endpoint,
  and the value of the switch. Reason: the value of the switch decides
  which login the new sessions of the member take.
- Only an admin sees the model list of an org endpoint, with Refresh, as
  [Own endpoint logins](own-endpoint-logins.md) says. The same holds for
  its read warning and the `/v1` note of a Codex endpoint.
- Nobody sees the key or the full address.
- Replace opens the form under the org login. The org login serves until
  the new one saves.
- Replace keeps the switch, also for another kind of login. Reason: the
  switch belongs to the org login, not to its key.
- Remove asks no question first, as the Remove of a personal login does.
  Reason: a new org login serves the sessions on the org login again,
  because the login of a session names the org.
- A replace or a removal reaches the sessions on the org login as a change
  of a personal login reaches its sessions.
  [Checks of each request](model-gateway.md#checks-of-each-request) says
  what a running turn does.
  [Messages](messages-and-attachments.md#messages) says what a later
  message does.

## The default login

- The default login of a member is the login that a new session of that
  member takes, for one agent in one org. It is the first of these logins
  that the app can use (org login decisions 4, 6 A, and 7 B):
  1. The org login, while its switch "Use for every member" is on.
  2. The personal login of the member.
  3. The org login.
- A personal login that the app can no longer use counts as none (org
  login decision 4). An example is a ChatGPT sign-in after a refused
  renewal.
- When none of these logins can be used, no login serves the member for
  that agent.
- Each new session takes the default login of its starter when it accepts
  its first message, as [Agents](agents-and-sessions.md#agents) says. This
  holds for each way to start a session, also for a call of the agent
  tools and an automation run.
- Before that first message, the session record names the starter's
  current default login owner for every reader. The check treats the
  starter as the sender and follows the same access rule as Send.
  A starter who left the org or is suspended has no default login there.
- This value does not fix the session's login. The composer uses it for
  its login label and the model list of an org endpoint.
- Reason: one rule then serves the sessions, the agent tools, and the
  automation runs.
- A choice of the login by each member, in a login menu or in a setting
  for each org, was rejected. The user chose the fixed order (org login
  decision 6 A).
- The switch "Use for every member" of each org login starts off. So by
  default, the personal login of a member comes first, and the org login
  serves each member without a usable personal login.
- While the switch is on, each new session in the org takes the org login,
  also for a member with a personal login (org login decision 7 B).
- Older sessions keep their login. A change of the switch ends no running
  turn.
- Reason: an admin then decides where the code of the org goes, and the
  members keep their own logins where the admin allows it. Get started
  asks each person to connect an agent, so most members have a personal
  login. Without the switch, the org login would serve few members.
- An org login that always comes first, with no switch, was rejected.
  Reason: a subscription of a member could then serve no org with an org
  login.
- A move of the older sessions to the org login was rejected, because a
  session never moves to another login. A new session on the org login
  for the next message in an older session was rejected too. That session
  would have no copy of the earlier history.
- A check of the switch at each request of the model gateway was rejected,
  because it fails running turns in the middle.
- A member whom the org login serves needs no personal login (org login
  decision 4). The agent step of Get started is complete for that member,
  as [Get started](get-started.md) says.
- For such a member, the composer, the New workspace form, the automation
  form, and the agent tools show no Connect notice. They refuse no message
  for a missing login.
- The account read names the default login of the member for each org and
  each agent. The org settings read names it for that org. The screens
  show that value, and they do not work it out. Reason: the same rule then
  decides the screens and the sessions.
- Under each agent, the Agents tab of Account settings names each org whose org login is
  the default login of the member. An example is "Your new sessions in
  Acme use Acme's login." The page names such an org also under a
  personal login, while the switch of that org is on.

## Risks

- Risk: the account of the org key or of the org endpoint pays for each
  turn on the org login. These are the turns of every member of the org.
  They are also the turns of automation runs that no person watches.
- Risk: an org endpoint gets the messages, the files, and the command
  results of each turn on it, whoever sends the message. So it gets the
  code of the org that those turns read. The admin who connects it chooses
  that server for each member who runs on it.
- Risk: while a turn on the org login runs, each process in its sandbox
  can spend the org login with the turn token.
  [Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox)
  states that risk.
