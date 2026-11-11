# Feedback routes

This guide belongs to the [app API](README.md). It gives the two feedback
routes, their checks, and the feedback email.
[Feedback](../../docs/protocol/feedback.md) states the requirements. The
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
| `POST /api/feedback` | HTTP 204 with no body, after Resend accepts the email or a local origin logs it |

- `feedbackReplyEmail` in [`feedback-data.ts`](feedback-data.ts) reads
  `users.primary_verified_email` of the signed-in user. The feature owns
  this read, and does not use the waitlist state. The read needs no team
  inbox and no Resend key.
- A send changes no org and stores no copy. It writes no D1, R2, or
  Durable Object record. So a member of a suspended org can send.
- No limit applies to how often a person sends.

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
5. `sendFeedbackEmail` in [`feedback-mail.ts`](feedback-mail.ts) sends the
   email, as the next section says.

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
  email. The Worker stores no key of its own.
- On a local `APP_ORIGIN`, the mail sender writes the email to the log and
  sends nothing. It needs no Resend key there. On other origins, the log
  holds no feedback text.
- Each failed send gets `502 feedback_email_failed`: a refusal of Resend,
  a failed request, or a missing `RESEND_API_KEY`. The reply and the log
  give no detail of the provider.

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
| A failed send | 502 | `feedback_email_failed` | The feedback email could not be sent. Try again. |

The [request body limit](../http/README.md#request-body-limit) gives the
JSON budget of the route.

## Development

Run these tests from the repository root. They use the production Worker
entry, local D1, and a fake Resend.

```sh
npm run test -- worker/app-api/feedback.test.ts worker/app-api/feedback-refusals.test.ts worker/app-api/feedback-body.test.ts src/shared/images.test.ts
```

- `feedback.test.ts` checks the reply read, the email fields, the checked
  attachments, one email after a lost reply and a later retry, new keys
  for changed drafts, and the omission of unreachable IDs.
- `feedback-refusals.test.ts` checks the gate refusals, each input
  refusal, a missing inbox, failed sends, and the local log.
- `feedback-body.test.ts` checks the exact JSON boundary, with and without
  `Content-Length`, and an accepted 7 MB screenshot.
- `feedback.test-support.ts` holds `FakeFeedbackResend`, which keeps each
  delivery key and refuses a known key with another body. It also holds
  `feedbackFixture` and the draft and image helpers.
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
  its delivery key, and its 503 and 502 errors.
- [`mail-sender.ts`](../mail-sender.ts): `createMailSender`, the shared
  Resend transport and local log. It writes the name and the media type of
  each attachment from its kind.
- [`feedback.ts`](../../src/shared/feedback.ts) and
  [`images.ts`](../../src/shared/images.ts) in `src/shared`: the contracts
  and the image signature reader.

### Related docs

- [Feedback](../../docs/protocol/feedback.md)
- [Request bodies](../../docs/protocol/access-and-security.md#request-bodies)
- [Deployment inputs: Secrets](../../docs/deployment.md#secrets)
