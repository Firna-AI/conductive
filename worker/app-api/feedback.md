# Feedback routes

This guide belongs to the [app API](README.md). It gives the two feedback
routes, their checks, the send limit, and the feedback email.
[Feedback](../../docs/protocol/feedback.md) and
[Feedback: the send limit](../../docs/protocol/feedback-send-limit.md)
state the requirements. The
[shared contracts](../../src/shared/README.md) give the path, the types,
and the byte limits.

## Routes

`route` in [`routes.ts`](../routes.ts) tries `feedbackRoute` first, after
the app request gate. So the gate has checked the host, the `Origin`
header, the session, a suspended user, the JSON object, and app access
before the handler reads the body.

| Route | Reply |
| --- | --- |
| `GET /api/feedback` | `FeedbackResponse`, whose `replyEmail` is the primary verified email of the signed-in user, or `null` |
| `POST /api/feedback` | HTTP 204 with no body, after Resend accepts the email or a local origin logs it. A repeat of a sent email within its 24 hours gets 204 at once, as [The send limit](#the-send-limit) says |

- `feedbackReplyEmail` in [`feedback-data.ts`](feedback-data.ts) reads
  `users.primary_verified_email` of the signed-in user. The feature owns
  this read, and does not use the waitlist state. The read needs no team
  inbox and no Resend key.
- A send changes no org and stores no copy of feedback. It writes only
  its row of `feedback_sends`, as [The send limit](#the-send-limit) says.
  So a member of a suspended org can send.

## The send

1. `readFeedback` in [`feedback-input.ts`](feedback-input.ts) checks the
   body. `draftId`, `text`, and `context.appVersion` must not be blank,
   and it trims them. `context.orgId` and `context.workspaceId` are a
   string or null. `context.desktop` is a boolean.
2. It decodes the base64 `content` of each screenshot, and adds up the
   decoded bytes. A total above `FEEDBACK_SCREENSHOTS_MAX_BYTES`, 7,000,000
   bytes, is refused.
3. It checks each decoded file with `readImage` from
   [`images.ts`](../../src/shared/images.ts), and keeps only the
   `CheckedImage` values. It reads no other field of a screenshot, so a
   name or a media type from the request never reaches the email.
4. `reachableFeedbackIds` in `feedback-data.ts` keeps the org ID only for a
   member of that org, while the org is not deleted. It keeps the
   workspace ID only when the workspace belongs to that org. Each other ID
   becomes `null`.
5. `sendFeedbackEmail` in [`feedback-mail.ts`](feedback-mail.ts) claims a
   count of the send limit, then sends the email, as
   [The send limit](#the-send-limit) and [The email](#the-email) say.

## The send limit

D1 keeps the counts of the
[send limit](../../docs/protocol/feedback-send-limit.md) in
`feedback_sends`. [`feedback-quota-data.ts`](feedback-quota-data.ts)
holds its queries. Each row is one epoch of one delivery key of one user.

- An epoch lasts 24 hours from `first_attempt_at`. A try of the key at
  least 24 hours after it starts a new epoch, in a new row.
- `reserved_at` is the time of the hourly count of the row, and
  `generation` names that count. `state` is `pending`, `uncertain`, or
  `sent`. `active_requests` counts the tries of the key that still run.
- A row keeps no message, screenshot, email address, browser string, or
  secret. The delivery key holds only its three hashes.
- The checks of the body and of the configuration come before the claim.
  A missing inbox gives 503 first. A deployed origin without
  `RESEND_API_KEY` then gives 502. So these refusals take no count. A
  local origin claims too, before its log.
- The mail sender builds the exact body and its delivery key, then calls
  `beforeSend` with the key. There, `claimFeedbackSend` runs one
  `db.batch()`, so two claims cannot interleave:
  1. It inserts a new epoch when the key has no current epoch and the
     user has fewer than `FEEDBACK_SENDS_PER_HOUR`, 10, counts younger
     than one hour.
  2. Else it claims the current epoch. A `sent` epoch, or a count younger
     than one hour, needs no new count. An older `pending` or `uncertain`
     count needs a free count, and then gets a new `reserved_at` and
     `generation`. An older `pending` count also becomes `uncertain`, so
     its row keeps the unrecorded result of the earlier try, such as an
     email that Resend accepted.
  3. It reads `retryAt`: the oldest `reserved_at` younger than one hour,
     plus one hour.
- When no row comes back, the send gets `429 feedback_send_limit` with
  `retryAt`, and Resend gets no request. The catch of the mail passes
  this `HttpError` unchanged, so it does not become a 502.
- When the current epoch is already `sent`, `beforeSend` returns `false`.
  The send then answers 204 at once, with no Resend request, and the epoch
  keeps its `active_requests`. So one email goes for each epoch.
- A retry of a `pending` or `uncertain` epoch sends the exact delivery key
  of its first try again.
- After the Resend request, or the log on a local origin,
  `completeFeedbackSend` completes the claim by row ID and generation, in
  one batch. A 2xx reply is `sent`. A thrown
  fetch, a timeout, 408, 409, and 5xx are `uncertain`. Each other status
  is `rejected`, a clear refusal. `MailDeliveryError` carries the outcome
  of a failed request. Each other error completes as `uncertain`. `sent`
  wins over `uncertain`, and `uncertain` wins over a refusal.
- The completion lowers `active_requests`. A row that is still `pending`
  when its last active try ends goes. So the count ends only when all
  active tries end in clear refusals, and no try was `uncertain` or
  `sent`.
- A failed claim sends no email, and the send gets
  `502 feedback_email_failed`. A failed completion keeps the row as it
  was, and the send gets the same 502, also after Resend accepted the
  email. A later retry uses the same key.
- The `*/15 * * * *` Cron Trigger runs `cleanupFeedbackSends`. It deletes
  each row whose epoch and hourly count have both ended. So a row stays
  about 24 hours, and up to about 25 hours after a late count. A failed
  cleanup writes the warning `feedback_send_cleanup_failed`, and the other
  scheduled work goes on. Deleting the user deletes its rows through the
  foreign key.
- The claim takes the time and the new tokens from the dependencies of
  the Worker, not from `Date.now()`.

## The email

- The recipient is `FEEDBACK_EMAIL`, without surrounding spaces. Without
  it, a send gets `503 feedback_unavailable` on every origin, before any
  send or log.
- [`createMailSender`](../mail-sender.ts) sends from
  `Conductive feedback <feedback@mail.conductive.build>`. The invitation
  and approval emails keep the default sender, `invites@`.
- The subject is `Feedback from <login>`. The plain text holds the message,
  then a `Context` block: the user ID, the GitHub login and ID, the
  operator page of the user, the org ID with its operator page, the
  workspace ID, the app version, the Mac app flag, and the `User-Agent`
  header.
- `reply_to` holds the reply address. Without one, the email has no
  `reply_to`.
- The mail sender names each attachment `screenshot-<n>`, with the
  extension of its kind, and gives the media type of that kind. Only a
  `CheckedImage` can be an attachment.
- The text holds no time. The `Date` header of the delivered email gives
  the time of the send, so each try of one draft sends the same body.
- The delivery key is `feedback/<hash of user ID>/<hash of draft ID>/<hash
  of body>`, 140 characters. A retry of the same draft reuses the key, so
  Resend sends one email. A changed draft gets a new key.
- [Resend keeps each key for 24 hours](https://resend.com/changelog/idempotency-keys).
  So a retry more than 24 hours after the first try can send a second
  email. The Worker keeps each key in `feedback_sends` for the send limit,
  for about 24 hours.
- On a local `APP_ORIGIN`, the mail sender writes the email to the log and
  sends nothing. It needs no Resend key there. On other origins, the log
  holds no feedback text.
- Each failed send gets `502 feedback_email_failed`: a refusal of Resend,
  a failed request, a missing `RESEND_API_KEY`, or a failed claim or
  completion of the send limit. The reply gives no detail of the provider.

The Worker logs `feedback_email_delivery_failed` before each 502.
Filter on `kind = feedback_email_delivery_failed`.
For a `mail` summary, [A failed send](../members/invitations.md#a-failed-send) gives the fields.
A failed claim or completion of the send limit gives a `d1` or `error` summary.
The warning can follow an accepted email, as [The send limit](#the-send-limit) describes.

## Errors

The gate gives its own refusals first, as the
[security area](../security/README.md) says. The feedback refusals are:

| Input | HTTP status | Error code | Message |
| --- | --- | --- | --- |
| A missing, blank, or wrong-type field | 400 | `invalid_input` | Complete the required fields. |
| A screenshot without content, bad base64, or another file signature | 400 | `feedback_image_invalid` | Add a PNG, JPEG, GIF, or WebP image. |
| Decoded screenshots above 7,000,000 bytes in all | 413 | `feedback_images_too_large` | Together, the screenshots can be up to 7 MB. |
| A JSON body above 10,000,000 bytes | 413 | `body_too_large` | The request is too large. Send less data. |
| No `FEEDBACK_EMAIL`, also on a local origin | 503 | `feedback_unavailable` | Feedback is not available. Try again later. |
| A new send of a person with 10 counts in the last hour | 429 | `feedback_send_limit` | You can send up to 10 feedback messages an hour. Try again at <time> UTC. |
| A failed send | 502 | `feedback_email_failed` | The feedback email could not be sent. Try again. |

The 429 error also gives `retryAt`, the exact Unix millisecond time when
the oldest count of the person ends. No other feedback error gives it.
The message gives that time in UTC, on the 24-hour clock, rounded up to a
whole minute. An older app shows only the message.

The [request body limit](../http/README.md#request-body-limit) gives the
JSON budget of the route.

## Development

Run these tests from the repository root. They use the production Worker
entry, local D1, and a fake Resend.

```sh
npm run test -- worker/app-api/feedback.test.ts worker/app-api/feedback-refusals.test.ts worker/app-api/feedback-body.test.ts worker/app-api/feedback-quota.test.ts worker/app-api/feedback-concurrency.test.ts worker/app-api/feedback-windows.test.ts worker/app-api/feedback-delivery.test.ts src/shared/images.test.ts
```

- `feedback.test.ts` checks the reply read, the email fields, the checked
  attachments, one email after a lost reply and a later retry, new keys
  for changed drafts, and the omission of unreachable IDs.
- `feedback-refusals.test.ts` checks the gate refusals, each input
  refusal, a missing inbox, failed sends, and the local log. Its gate and
  input refusals write no row of `feedback_sends`.
- `feedback-body.test.ts` checks the exact JSON boundary, with and without
  `Content-Length`, and an accepted 7 MB screenshot.
- `feedback-quota.test.ts` checks the limit of each person, with org
  invitations and reply reads outside it. It also checks the exact end of
  the rolling hour, a lost-reply retry at the limit, a confirmed retry
  without a Resend request, and the limit before a local log.
- `feedback-concurrency.test.ts` checks two new drafts for the last count,
  and overlapping tries that keep their count until every clear refusal
  ends.
- `feedback-windows.test.ts` checks the new count of an unresolved retry
  with its old key, and the end of a confirmed epoch at 24 hours. It also
  checks a late count across that end, and the cleanup with the deletion
  of an account.
- `feedback-delivery.test.ts` checks the refund of a clear refusal and the
  kept count of an unclear status. It also checks a clear refusal after an
  unclear result, a failed D1 claim, missing configuration, a failed
  completion after delivery, and an old completion after a new generation.
  For such a failed completion, it checks that a clear refusal of the retry
  an hour later leaves the row `uncertain`, with its count.
- `feedback.test-support.ts` holds `feedbackFixture`, with its test clock,
  its fake Resend, and the 15-minute scheduled entry. It also holds the
  draft and image helpers.
- `feedback-resend.test-support.ts` holds `FakeFeedbackResend`. It keeps
  each delivery key for 24 hours on the test clock, and refuses a known
  key with another body. A test can hold a reply, refuse, lose the reply,
  throw, or set a status.
- `feedback-quota.test-support.ts` holds `fillFeedbackQuota`, which fills
  the limit with new drafts, and `quotaRows`, which reads the rows of the
  person.
- A send through `npm run preview` needs `FEEDBACK_EMAIL` in `.dev.vars`.
  The local Worker then writes the email to its log.

### Key code

- [`feedback.ts`](feedback.ts): `feedbackRoute`, the dispatch of the two
  routes.
- [`feedback-input.ts`](feedback-input.ts): `readFeedback` and
  `ParsedFeedback`, the checked body with its `CheckedImage` screenshots.
- [`feedback-data.ts`](feedback-data.ts): `feedbackReplyEmail` and
  `reachableFeedbackIds`, the two D1 reads.
- [`feedback-mail.ts`](feedback-mail.ts): `sendFeedbackEmail`, the email,
  its delivery key, its claim of the send limit, and its 503, 429, and 502
  errors.
- [`feedback-quota-data.ts`](feedback-quota-data.ts): `claimFeedbackSend`,
  `completeFeedbackSend`, and `cleanupFeedbackSends`, the queries of
  `feedback_sends`, with the `FeedbackClaim` of a granted claim.
- [`mail-sender.ts`](../mail-sender.ts): `createMailSender`, the shared
  Resend transport and local log. It writes the name and the media type of
  each attachment from its kind. Its optional `beforeSend` gets the
  delivery key before the request, and can skip the request.
  `MailDeliveryError` carries the outcome of a failed send. It is
  `uncertain` or `rejected`, or `sent` when only the cleanup of an
  accepted reply failed.
- [`feedback.ts`](../../src/shared/feedback.ts) and
  [`images.ts`](../../src/shared/images.ts) in `src/shared`: the contracts,
  with `FEEDBACK_SENDS_PER_HOUR`, and the image signature reader.

### Related docs

- [Feedback](../../docs/protocol/feedback.md)
- [Feedback: the send limit](../../docs/protocol/feedback-send-limit.md)
- [Request bodies](../../docs/protocol/access-and-security.md#request-bodies)
- [Deployment inputs: Secrets](../../docs/deployment.md#secrets)
