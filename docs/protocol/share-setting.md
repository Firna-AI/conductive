# The share setting

This page belongs to [Isolation of orgs and sandboxes](isolation.md). It
holds the requirements and the decisions in force for the share setting of
a personal login. The setting says whether the messages of other members
can run on that login. The org login has no share setting.
[Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox) states
the other rules of the agent logins. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An own endpoint decision number names a decision of the change that
adds the own endpoint logins, as [Tokens and secrets](tokens-and-secrets.md)
says.

- Each personal login has a share setting (decision 116). It says whether
  the messages of other members can run on that login.
- The kind of a login sets the default of its share setting. A new Claude
  subscription login does not let other members use it. A new ChatGPT
  sign-in does not let them use it either (decisions 171 and 175). A new
  API key or own endpoint login lets them use it (own endpoint decision 4).
- Reason: Anthropic's consumer terms and OpenAI's terms forbid making an
  account available to anyone else. The owner of an API key may let a team
  use it. Sharing every login by default was rejected for these reasons.
- Risk: an own endpoint can stand for personal subscriptions, such as a
  proxy that pools them. Other members can spend those subscriptions until
  the owner turns sharing off. Their terms can forbid that use.
- A replaced login keeps its share setting while its kind stays the same. A
  login whose kind changes gets the default of its new kind. Reason: a key
  rotation keeps the choice of its owner.
- The Agents tab of Account settings shows the share setting of each connected login. Its
  owner can change the setting there at any time.
- When the starter does not share a personal login, a message of another
  member starts a new session on the default login of that member. A Try
  again of another member does the same.
  [Messages](messages-and-attachments.md#messages) states the rules of
  such a new session.
- The workspace checks the share setting of a personal login when it
  accepts each message. It checks it again before it gives the credential
  of the turn to the runner. So a waiting message of another member never
  runs on a login that its owner stopped sharing.
- Risk: while the starter shares a personal login, the other members of a
  session spend it. Anthropic's rules for hosted products ask each end user
  to sign in with their own credentials. So a shared Claude subscription
  stays a risk (decisions 105 and 116).
