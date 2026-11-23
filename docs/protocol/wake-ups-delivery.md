# Wake-ups: delivery and ends

This page belongs to [Wake-ups](wake-ups.md), which states the wake-up
calls. It states how a wake-up reaches its session at its time, and what
happens when it can start no turn. It also states what a Stop, a close,
and an Archive do to the pending wake-ups.
[Wake-ups: the chat](wake-ups-chat.md) states what the chat shows. The
terms are those of [Wake-ups](wake-ups.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A wake-up decision number names a decision of the change that adds
the wake-up calls, as [Wake-ups](wake-ups.md) says.

## Delivery

- At its time, a wake-up reaches its session as a watch wake reaches its
  calling session. So the rules of [Delivery](session-watches.md#delivery)
  hold for it, except for a wake-up that can start no turn. These rules
  cover the turn, the sender, and the login of a
  [late answer](secret-late-answers.md#late-answers), the access checks at
  delivery, the pause during an org suspension, the retries, and the start
  of a stopped cloud computer.
- In these rules, the sender is the sender of the turn that set the
  wake-up. When a wake-up joins a running turn, that turn keeps its
  sender, as for a message.
  The membership and session login checks also apply to the member who
  set the wake-up when it joins a turn.
- Delivery also pauses while the org is deleted, as during an org
  suspension. After a Restore, delivery follows the current access checks,
  so a wake-up can fire late. When the app deletes the data of the org, its
  pending wake-ups go too.
- Reason: a Restore brings the org back as it was, as
  [Delete org](delete-org.md) says. An automation also runs once after a
  Restore for the times that it missed.
- The woken turn uses the current model, effort, and fast mode of the
  session. Reason: a late answer does the same.
- A wake-up that joins a waiting Claude turn keeps the deadline of that
  turn, as [The time limit](background-work.md#the-time-limit) says.

### A wake-up that can start no turn

- One rule differs from a watch. A wake-up that can start no turn ends
  with an end line that says that it could not start (wake-up decision
  4 B). A watch sends nothing in that case.
- Examples are an archived workspace, a sender who left the org, a starter
  who no longer shares the login with the sender, and a login that is
  gone. Wake-up decision 4 B also lists a closed session among these
  cases. [Close](#close) says what is still open for a close.
- The line names the action that gets the agent going again, in the words
  of a [late request](secret-late-answers.md#late-answers), as
  [End lines](wake-ups-chat.md#end-lines) says.
- The wake-up then ends for good. A later reopen, Restore, or new login
  does not bring it back. So the agent goes on only after that action and
  a new message.
- Reason for wake-up decision 4 B: a member saw the pending wake-up, so its
  loss with no word reads as a fault. A late request is the closest rule.
- A wake-up that ends with no line was rejected for that reason. A wake-up
  that stays pending until the session can start a turn was rejected,
  because it can then fire very late.

## Stop

- What an explicit Stop does to the pending wake-ups of its session is
  open. It waits for
  [wake-up decision 6](../../plans/agent-wake-ups.md#wake-up-decision-6-what-a-stop-does-to-pending-wake-ups).
  This page states no rule for it until then.
- The idle stop of the cloud computer keeps each pending wake-up. Reason:
  a wake-up exists to survive that stop.
- A pending wake-up holds no turn. So it keeps no cloud computer running,
  as [The stop](stop-and-resume.md#the-stop) says.

## Close

- What a close of a session does to its pending wake-ups is open. It waits
  for
  [wake-up decision 7](../../plans/agent-wake-ups.md#wake-up-decision-7-what-a-close-does-to-pending-wake-ups).
  This page states no rule for it until then.
- Wake-up decision 4 B lists a closed session among the cases where a
  wake-up can start no turn, as
  [A wake-up that can start no turn](#a-wake-up-that-can-start-no-turn)
  says.

## Archive

- An Archive keeps the pending wake-ups of the workspace. The read-only
  workspace shows them with no Cancel.
- At its time, a wake-up of a workspace that is still archived could not
  start. Its end line names the Archive as the cause.
- Reason: the Archive does not end a wake-up. So a Restore before its time
  keeps the work.
