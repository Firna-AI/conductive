# Feedback: the send limit

This doc holds the requirements and the decisions in force for the limit
on how often a person sends feedback. It belongs to
[Feedback](feedback.md), and uses its terms. A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue-palette.md#feedback)
draws a send over the limit at `app/feedback/send-limit`, on desktop and
on a phone.

## The limit

- Each person can send at most 10 feedback emails in any hour
  (decision 276). A send counts for one hour from the time that the
  Worker takes it. So the hour rolls, and does not follow the clock.
- The Worker refuses a send over the limit with HTTP 429 and the code
  `feedback_send_limit`. No email goes for it.
- The error also gives `retryAt`, in Unix milliseconds: the time when the
  oldest send that counts stops counting. From that time, the person can
  try again. Another send of the same person can count first, and the try
  then gets HTTP 429 again.
- The message of the error gives that time in UTC, rounded up to a whole
  minute. Reason: a tab of an older app version shows only the message.
- The limit counts only feedback emails. Org invitations and approval
  emails do not count, and the limit refuses none of them.
- Only a send that passes every other check of
  [The routes](feedback.md#the-routes) counts. A refused request does not
  count, also one without a team inbox or a Resend key.
- The limit holds on every origin, also on a local app origin, where the
  Worker writes the email to its log.
- Reason: the limit bounds how many feedback emails one person can send
  in an hour. An operator can still suspend a person who misuses
  feedback, as [Suspend a user](operator-actions.md#suspend-a-user) says.
- Risk: the limit holds for each person, not for the whole app. The
  feedback emails share the send quota of the Resend account with the
  invitation and approval emails. Many people, or one person over many
  hours, can still use it up. The other emails then fail. An approval
  email tries again for 24 hours, then stops.
- A limit only in the dialog was rejected, because a crafted request
  skips it. The rate limit binding of Cloudflare Workers was rejected as
  the counter, because it counts only over 10 or 60 seconds, apart in
  each location.

## Repeats

- A repeat of the same draft counts as the same send, also after a lost
  reply. While that send counts, the limit does not refuse the repeat.
- A changed draft counts as a new send, because it sends a new email.
- A Resend reply with a success status shows that the email went. After
  that, a repeat does not count again until 24 hours after the first
  try. The limit does not refuse the repeat, and no second email goes.
- A failed or timed-out request to Resend, and a Resend reply with the
  status 408, 409, or 5xx, give an unclear result. After an unclear
  result, the send keeps counting.
- Until a success, a repeat after the hour of the send counts again, and
  can get HTTP 429. This holds after an unclear result, and also when no
  result came.
- Each other Resend reply is a clear refusal. The send stops counting
  only when all its active tries end in clear refusals, and no try of it
  had an unclear result or a success.
- A repeat at least 24 hours after the first try counts as a new send.
- Reason: an unclear result does not show that no email went. An end of
  the count after an unclear result was rejected, because each repeat
  could then send an email that the limit does not count.

## The notice

- A send over the limit keeps the draft and its screenshots. Its notice
  says "The feedback wasn't sent", then "You can send up to 10 feedback
  messages an hour. Try again at <time>." Send stays on, and a new press
  of Send tries again.
- The time comes from `retryAt`. The dialog rounds it up to a whole
  minute, so the shown time is never before `retryAt`. It shows the time
  on the 24-hour clock, in the time zone of the browser, such as "15:02".
- Without a valid time, the notice shows the message of the error, as
  for each other failed send.
- The dialog shows no countdown, and it sends nothing by itself.

## The record of a send

- For the limit, the Worker keeps a record of each send that counts. The
  record holds the person, the delivery key, the times of the first try
  and of the count, and whether the email went.
- The delivery key holds one-way hashes of the user ID, the draft ID, and
  the email. The record holds no text, no screenshot, and no email
  address.
- When clear refusals end the count of a send, as [Repeats](#repeats)
  says, its record goes with the last of those tries.
- The Worker deletes each other record when its first try is at least
  24 hours old and its send no longer counts. A regular cleanup deletes
  it. So a record stays about 24 hours, and up to about 25 hours after a
  late repeat.
- The deletion of an account deletes its records.
- The Privacy page names this record, what it holds, and how long the
  Worker keeps it.
