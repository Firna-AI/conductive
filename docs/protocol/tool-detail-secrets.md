# Tool detail secrets

This doc holds the requirements and the decisions in force for the secret
values in a long tool detail. It belongs to
[Tokens and secrets](tokens-and-secrets.md), which covers the values that
the Durable Object hides.
[The agent runner](agent-runner.md#the-agent-runner) states the limit of a
tool detail, and how a runner sends complete tool details. The terms are
those of the [architecture doc](../architecture.md#terms).

## The filter before the cut

- With complete tool details, the Durable Object hides each exact copy of a
  secret value before it cuts a long tool detail. It does the same for each
  value that a run with secrets used. So the cut never splits such a copy.
- [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  and [The exact-copy filter](secret-requests.md#the-exact-copy-filter) give
  these values.

## Older runners and fallback connections

- An older runner has no complete tool details. A fallback connection is a
  connection where the runner offers complete tool details and the
  workspace does not accept them.
- Risk: an older runner cuts a long tool detail before the Durable Object
  gets it. So does a runner on a fallback connection. When a value that the
  Durable Object hides crosses that cut, only its start reaches the Durable
  Object. The filter hides only exact copies, so that start shows.
- That risk ends for a sandbox when its runner and its workspace both
  support complete tool details. The runner gets that support through an
  update, as [Updates](sandbox-software.md#updates) says.
- A sandbox keeps an older runner until an update applies, by the rules of
  [Updates](sandbox-software.md#updates) and
  [Installs at idle](sandbox-software.md#installs-at-idle). A new sandbox
  from an org image of an earlier build also starts with an older runner.
- So the risk has no time limit. A long turn, a turn that waits for
  background work, a failed check, download, install, or start, or a
  stopped sandbox can keep an older runner.
- Tool details that the chat already stored keep their text. So a part of
  a value that an earlier cut left there still shows.
- Reason: the Durable Object never gets the complete source from such a
  runner. A mask of each possible start of a value at the cut was not
  chosen, because it hides text that is not an exact copy. A detail with no
  text was not chosen, because it loses the longest prefix.
