# Secrets and Capabilities

This page belongs to [the catalogue](catalogue.md). It gives the pages of
the secrets of an org and of the Capabilities control, from the secrets
decisions of 13 November 2026. [The design](design-secrets.md) gives their
parts.

`app/org-settings/secrets` shows the Secrets tab of Acme as Cal, an admin,
sees it. Its child pages:

- `reveal` has the value of PROD_DATABASE_URL that Cal revealed, with Copy
  and Hide, and the new record of the reveal.
- `add` has the Add secret form of an admin, with the switch for all
  agents. The hint of the name gives the characters that a new name can
  use. Its `invalid-name` variant has the form after Save secret refused
  the name "Linear API key": the error of the name, and each field as Cal
  typed it.
- `replace` has the Replace form of VERCEL_TOKEN, a secret that Priya
  added: its description to change, and an empty field of a new value.
  Its `invalid-name` variant lists Cloudflare (read-only), a secret with an
  older name, and has its Replace form, which keeps the name.
- `delete` has the question before Delete of VERCEL_TOKEN.
- `member` has the tab as Priya, a member, sees it: each value as dots, no
  Reveal, and Replace and Delete only on her own secrets. Its `add` variant
  has her form without the switch for all agents, and its `replace` variant
  has the Replace form of one of her secrets.
- `empty` has Firna, a new org, without secrets.

The child page `app/orgs/suspended/settings/secrets` has the tab of a
suspended org, with no action.

`app/new-workspace/capabilities` has the Capabilities control open on the
New workspace page: the secrets of Acme with FIGMA_TOKEN pre-approved, and
Mac access off. A phone opens it as a sheet from the menu of the + button.
Its `no-secrets` variant has Firna without secrets, and its `menu` variant
has that menu open on a phone. `app/new-workspace/dialog/capabilities` has
the same control in the dialog.

`app/capabilities` has the control of Checkout address autocomplete, with
the approvals of its sessions and its value for the workspace, each with
Remove. Its `mac-access-off` variant has Mac access off. Its `menu` variant
has the menu of the + button of a phone, with Attach files and
Capabilities. The
`mac-access-off` variant of `app/mac-commands` has a Mac command that the
workspace refused for that reason.

`app/secret-requests` has a request for PROD_DATABASE_URL just above the
composer, while the tool call waits, and the needs-input mark on the tab
of its session. Its child pages:

- `several` has a request for two secrets. Its child pages:
  - `mixed` has a secret of Acme and a name that Acme does not have in one
    card, and `mixed-value` has the same card with a value.
  - `waiting-and-late` has three requests in the stack above the
    composer: the request whose call waits on top, though it is the
    newest, the edges of the two older late requests behind it, and
    "1 of 3" with Previous and Next. Its `next` and `last` variants have
    the second and the third card on top. On a phone, the second card
    scrolls inside its outline. Its `answered` variant has the stack after
    an Allow of the card on top: the run of that request in the chat, and
    "1 of 2".
  - `asked-again` has a late request that hides the two older requests of
    the agent for the same secret, with "Asked 3 times". Its `denied`
    variant has the three requests at their places after one Deny. Its
    `allowed` variant has them after one Allow, with one line of the app
    and one new turn.
  - `mac-command` has a late request for a secret on top of a command on
    the Mac, in a browser, which cannot answer the command. So the late
    request comes first, though the call of the command waits. Its `next`
    variant has the command on top, with its state only. The
    `with-secret` variant of `mac-app/requests` has the same requests in
    the Mac app, which answers both, so the command is on top there.
- `temporary` has a request for MAPBOX_TOKEN, which Acme does not have,
  with no value yet. A phone shows Deny and Give a value. Its child pages:
  - `value` has a typed value and 15 minutes, and on a phone the sheet
    that Give a value opens. Its `workspace` and `saved` variants have the
    other two choices. Its `invalid-name` variant has Google Places key, a
    name with spaces, so Save as secret is off. Its `mixed-invalid-name`
    variant adds that name to a mixed request, and Save as secret is off
    for every value.
  - `late` has the late request above the composer after the turn ended,
    with no value yet. Its `value` variant has the value that Priya types
    later, and its `given` variant has her answer for this workspace, with
    the request at its place in its turn, and the line of the app that
    names her.
- `results` has the run after Allow for this session: its card, with no
  output, and the tool call line of the agent beside it. Its variants have
  the run while it runs, a denied request, a pre-approved secret, and a
  value for 15 minutes.
- `late` has the request that nobody answered in time. It waits just above
  the composer after its turn ended, with its late line and its choices.
  Its child pages have the request at its place in its turn after its
  answer or its end:
  - `answered` has the late Allow of Priya, the line of the app that names
    her, and the new turn for Cal. Its `ran` variant has the run of that
    turn. Its `fallback` variant has a late Allow whose turn cannot run,
    because Cal stopped sharing his login, so the agent learns of it at the
    next message. Its `login-gone` variant has the same Allow after Cal
    removed his login, so the line says that the agent learns of it when
    Cal connects Claude again. Its `org-login-gone` variant has the same
    Allow in a session on the Claude login of Acme, after an admin removed
    that login. Its line says that the agent learns of it when an admin
    connects Acme's Claude login again.
  - `denied` has a late deny, which sends nothing.
  - `not-answered` has the request that ended when Cal archived the
    workspace.
- `in-work` has the run in the open fold of its ended turn.

`user-flows/secret-request` goes from the request above the composer,
through the late request that stays above the composer and the late Allow
of Priya, to the run of the new turn for Cal.

`app/tabs/needs-input` has the late request in the first session while
the second session shows, so the tab of the first session shows the
needs-input mark. [The catalogue](catalogue.md) gives its child pages.
