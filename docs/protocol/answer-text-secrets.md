# Answer text secrets

This doc holds the requirements and the decisions in force for the secret
values in the end of an unfinished agent answer, which the Durable Object
holds back between runner events. It belongs to
[Tokens and secrets](tokens-and-secrets.md), which covers the values that
the Durable Object hides.
[Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
and [The exact-copy filter](secret-requests.md#the-exact-copy-filter) give
these values and how long the filter hides each one. The terms are those
of the [architecture doc](../architecture.md#terms).

## The held end of an answer

- An active value is a value that the filter hides at a runner event.
- An answer reaches the Durable Object in consecutive text events. When
  the end of an unfinished answer can still become a copy of an active
  value, the Durable Object holds that end back. This doc calls it the
  held end.
- A held end shows with later text of its answer, or when the answer or
  its turn ends.
- When a held end holds a whole copy of an active value, that copy shows
  hidden. This holds also when the value ends before the held end shows,
  whatever ends the value.
- A held end can be a whole copy of an active value only because a longer
  active value can still follow. Later text of the answer that completes
  that longer value while it is active also shows hidden.
- So the chat can show such a longer value as two masks in place of one.
- The filter does not hide a copy whose last part arrives after its value
  ended.

## The saved state of the filter

- The Durable Object saves the state of the filter between runner events,
  with each held end.
- That state lists no value.
- A held end in that state holds no whole copy of an active value. It can
  hold the start of a value.
- Reason: no change of a value, from any source, can then leave the value
  in the saved state.
- A cleanup of the saved state at each change was rejected. Each change of
  an org secret must then reach each workspace of its org, and a failed
  call leaves a copy.
- A cleanup only when a temporary value ends was rejected too, because an
  org secret or an env var can change with no such cleanup.
- Rules that let a saved copy outlive its value were rejected, because the
  filter would then keep a value longer than
  [The exact-copy filter](secret-requests.md#the-exact-copy-filter) allows.

## Rollout

- A first deploy of the Worker reads saved state in both formats: the
  earlier format, which lists values, and the format that lists no value.
  It still saves the earlier format.
- A later deploy starts to save the format that lists no value. It does
  this only when the Worker before it already reads both formats.
- The rules above hold from that later deploy.
- Before the later deploy, and after a rollback of it, state that is
  already in the format that lists no value stays in it. The Worker puts
  no other state into that format, new or saved.
- No Worker turns a hidden whole copy back into its text.
- Reason: a rollback of the later deploy then reaches a Worker that reads
  both formats. A single deploy with no rollback past it was rejected,
  because the previous Worker must keep working. A mask of each shown
  start of a value was rejected, because it hides text that is not an
  exact copy.
- Risk: until that later deploy, a whole copy in a held end can show after
  its value ends, and the saved state can keep old values.
- Risk: after it, saved state in the earlier format keeps this risk until
  the Durable Object saves that state again. A workspace that gets no
  later runner event or cleanup keeps such state with no time limit.
