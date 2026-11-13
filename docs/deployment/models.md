# Model inputs

This page belongs to [Deployment inputs](../deployment.md). It gives the
variables that choose the models of the app: the model list, the default
choice, and the title model.

## Models

`CONDUCTIVE_MODELS` holds the models that the app offers.
The `vars` of [`wrangler.jsonc`](../../wrangler.jsonc) hold this list and
`CONDUCTIVE_DEFAULT_CHOICE`, the app default. Edit them in the repository.
Each deploy publishes these values through the existing deploy workflow.
The Worker has no built-in list and no fallback model.

Keep both settings as JSON encoded in strings, because the model readers
expect text bindings. A `.dev.vars` value replaces its repository value
for local development.

- The value is a non-empty JSON array. Each entry is an object with these
  fields:
  - `agent`: `claude` or `codex`.
  - `model`: the model ID that the agent gets, as a non-empty string.
  - `label`: the name that the app shows, as a non-empty string.
  - `efforts`: a non-empty array. Each effort is `none`, `low`, `medium`,
    `high`, `xhigh`, or `max`.
  - `fast`: optional, `true` when the model has fast mode. A missing field
    means `false`. The model menu shows the Fast switch only for a marked
    model, as [Fast mode](../protocol/fast-mode.md#the-models-with-fast-mode)
    says. Mark a model only when the pinned agent program can run it in
    fast mode.
- `CONDUCTIVE_DEFAULT_CHOICE` is one JSON object with `agent`, `model`, and
  `effort`. The saved default of a user comes before it. The default choice
  of the app has fast mode off.
- An own endpoint login uses the same list. The owner's pickers hide each
  model of the list that the endpoint does not name in its own model
  list, as
  [Own endpoint logins](../protocol/own-endpoint-logins.md)
  says. The endpoint gets the full model ID that the agent program sends.
- The web app reads `GET /api/models` and `GET /api/account` when it
  starts. So it does not start without a valid model list. A user with no
  saved default also needs a valid default choice.

The shape of the two values, with placeholders in place of real values:

```json
[{ "agent": "claude", "model": "<model ID>", "label": "<label>", "efforts": ["low", "medium", "high"], "fast": true }]
```

```json
{ "agent": "claude", "model": "<model ID>", "effort": "medium" }
```

## Configuration failures

- `CONDUCTIVE_MODELS` is required for the app and tool model lists, and
  for session transcript reads in the app and tools. It is also required
  when an operation checks a fast choice: saving a default, creating a
  workspace or session, sending or retrying a message, changing a session
  choice, creating or updating a routine, and starting a fast routine run.
  This includes tool writes and a tool send that keeps a session's fast
  choice. A missing or invalid value gives `503 models_unavailable`.
  A routine run records `models_unavailable` as its failure cause.
  A standard-speed choice needs no model list for its choice check.
  Account reads and login-status replies also try the list to show which
  app models an own endpoint lacks. A missing or invalid list omits that
  optional model-list detail instead of failing the reply.
- `CONDUCTIVE_DEFAULT_CHOICE` is required when an account read needs the
  app default because the user has no saved default. Tool workspace and
  session creation also need it when the call omits the model or effort
  and the relevant user has no saved default. A workspace create uses the
  calling workspace's owner; a session create uses the calling turn's
  sender. A missing or invalid value gives `503 default_model_unavailable`.
  The tool model list also reads the app default when the calling
  workspace's owner has no saved default. For that list, a missing or
  invalid app default gives a null default choice instead of an error.
  [Models](../protocol/workspace-calls.md#models) states the tool list.

## The title model

`CONDUCTIVE_TITLE_MODEL` names the model that writes a title for a workspace
that has no name, as [Messages](../protocol/messages-and-attachments.md#messages)
says. It is operator data. The Worker has no built-in title model.

- The value is the model ID of a text generation model of Workers AI, the
  model service of Cloudflare. The
  [Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
  catalogue lists them. Choose a small, fast model.
- The Worker calls the model through the `AI` binding, on the Cloudflare
  account of the Worker. Each request counts toward the Workers AI use of
  that account.
- Without the binding or the variable, no automatic title is written.
  The Worker logs a warning when it would request a title.
  The Worker also logs a warning for a failed request.
  No route fails for a missing title.
- Workers AI runs only on the network of Cloudflare. `npm run dev` and
  `npm run preview` do not reach it. So they need no Cloudflare login, and
  no automatic title is written locally.
