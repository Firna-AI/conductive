# Model gateway: long waits

This doc holds the requirements and the decisions in force for a Codex
model request whose upstream asks for a long wait. It belongs to
[Model gateway: requests and answers](model-gateway-requests.md), which
covers the answers that pass unchanged. The terms are those of the
[model gateway](model-gateway.md#terms) and of the
[architecture doc](../architecture.md#terms). A long wait decision
number, such as long wait decision 1, names a decision of the change that
ends a Codex turn when the upstream asks for a long wait. Its pull request
keeps the dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The long wait error

- The upstream can answer a Codex model request with HTTP 429 and a
  `retry-after` wait of more than 10 minutes. The gateway then sends
  Codex its own HTTP 429 in place of that answer (long wait decision 1,
  21 November 2026).
- A Codex model request is `POST /responses` for an OpenAI API key or a
  Codex own endpoint login. It is `POST /backend-api/codex/responses` for
  a ChatGPT sign-in. The metadata routes of a ChatGPT sign-in pass each
  429 unchanged.
- The gateway reads the wait as Codex reads it: a number of seconds, or
  an HTTP date in one of its three forms. These forms are IMF-fixdate,
  RFC 850, and asctime. A date with a wrong weekday, and a number above
  the largest signed 64-bit number, are not a wait.
- The gateway reads the wait after it removes the login from the
  headers. Reason: an upstream can echo a login in `retry-after`, and the
  reset time must not carry it.
- The error of the gateway has the error type `usage_limit_reached`, the
  code `model_rate_limited`, and the reset time in `resets_at`. The reset
  time is the end of the wait. The error has no `retry-after` header and
  no part of the upstream body.
- A wait that ends after the year 9999 gives an error with no reset time.
  Reason: Codex shows no reset time after that year.
- Codex ends the turn on this error and does not send the request again.
  The chat shows the failed turn with the reset time, in the time zone of
  the sandbox. When the time zone of the sandbox has no name, the chat
  says "sandbox time" in place of the name.
- Each other Codex usage limit failure with a reset time also shows that
  time, such as a ChatGPT plan limit that OpenAI sends with `resets_at`
  (long wait decision 2, 22 November 2026). Reason: the user gets the
  same useful time.
- A time only for the long wait error was rejected. It needs a hidden mark
  in a field that Codex reads for promotions.
- A runner older than this rule shows the usage limit cause with no reset
  time. Its turn also ends. The sandbox installs the newer runner when the
  workspace is idle, as
  [Sandbox software](sandbox-software.md#installs-at-idle) says.
- Reason: Codex waits for the whole `retry-after` before it sends the
  request again, and the chat shows no error during the wait. A wait of
  38 hours kept two turns at "The agent is still working" for 14 hours.
- To pass the 429 unchanged was rejected, because the turn then waits
  with no error.

## Answers that do not change

- A 429 with a wait of 10 minutes or less passes unchanged. A 429 with no
  wait that the gateway can read also passes unchanged. Codex then applies
  its own resend rules.
- The answers of Claude do not change. Reason: Claude ends its turn by
  itself when a wait is more than 60 seconds.
- This rule is interim. A stop of the sandbox and a wake at the reset
  time will replace it.
