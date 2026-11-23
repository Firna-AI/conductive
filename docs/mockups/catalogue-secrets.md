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
- `combined` is a proposal for review, not the spec in force. It draws
  the Env & secrets tab of Cal's reviews of 20 November 2026: env vars and
  secrets in one short list, each row with its name, an Env or Secret
  badge, the description of a secret, and one "⋯" menu. It also draws
  item 2 B, which Cal chose on 20 November 2026, and the open items 3
  and 4. Its child pages:
  - `add` has the compact Add modal with one secret. Its `env` variant
    has four env vars that a paste of `.env` lines split into rows.
  - `edit` has the Edit modal of FIGMA_TOKEN, which also renames it. Its
    `env` variant has the Edit modal of PLACES_API_KEY, and its `type`
    variant changes STRIPE_SECRET_KEY from an env var to a secret.
  - `menu` has the open menu of STRIPE_SECRET_KEY.
  - `member` has the list as Priya, a member, sees it. Its `add` variant
    has her modal, with no type.
  - `cloud-computer` has the Cloud computer tab without the env vars.

The child page `app/orgs/suspended/settings/secrets` has the tab of a
suspended org, with no action.

`app/new-workspace/capabilities` has the Capabilities control open on the
New workspace page: the secrets of Acme with FIGMA_TOKEN pre-approved. A
browser shows no Mac access part, so the control holds only the Secrets
part. A phone opens it as a sheet from the menu of the + button. Its
`no-secrets` variant has Firna without secrets, and its `menu` variant
has that menu open on a phone. Its `search` variant has twelve secrets,
with a Search secrets field above them and "deploy" typed in it. Its
`info` variant has the info box of PROD_DATABASE_URL open, with its
description, after a press on its info icon. STAGING_API_KEY there has no
description, so it has no info icon. `app/new-workspace/dialog/capabilities`
has the same control in the dialog.

`app/capabilities` has the control of Checkout address autocomplete in a
browser, with the approval of its open session and its value for the
workspace, each with Remove. It hides an approval of the pre-approved
FIGMA_TOKEN and an approval of another session. A browser shows no Mac
access part. Its `menu` variant has the menu of the + button of a phone,
with Attach files and Capabilities. The `mac-access-off` variant of
`app/mac-commands` has the card of an older Mac command that a workspace
refused while its Mac access was off.

In the Mac app, the control ends with the Mac access part: one switch with
no hint, from Mac access decision 7 of 21 November 2026. Each member sees
the switch of their own Mac. On starts a grant until Stop of the workspace
on this Mac, and off stops it. `mac-app/capabilities` has the control of
Checkout address autocomplete after Cal turned the switch on in the Mac
app. The switch is on, because this Mac started a grant until Stop, and the
bar of the workspace says Until you stop. The page shows only its canonical
screen. Its child pages:

- `off` has the switch of Cal's Mac off, with no grant. Priya's Mac has a
  grant, and Cal's Mac asks first at each command.
- `fifteen-minutes` has the switch off while the 15 minutes run. The bar
  gives the time left, 14:32, and the part has no hint.
- `stopped` has the switch after Cal turned it off. Stopped shows under it:
  each command from this workspace asks first. The bar names the same
  result.
- `not-started` has a start that the Mac did not make. The switch is off,
  with Not started and the cause that the Mac gave.
- `not-reached` has a start that found this Mac not available. The page
  cannot read the settings of this Mac, so the switch is off and disabled.
  Its result says that each command still asks first.
- `not-available` has the switch while the page cannot read the settings
  of this Mac, with no result. The switch is off and disabled, and the
  words under it say that this Mac is not available.

`mac-app/new-workspace` has the control of New workspace in the Mac app,
with the switch on, so the create starts the grant. Its variants:

- `mac-access-off` has the switch off, with no hint.
- `created` has the new workspace Saved carts after a create that started
  the grant, with the bar that says Until you stop.
- `not-started` has Saved carts after a create whose grant did not start,
  with a notice over the composer and Try again.
- `not-reached` has the same notice for a Mac that was not available.

`app/automations/automation/capabilities` has the control of an automation,
from the automation capabilities decisions of 18 November 2026. It opens
above the Capabilities icon in the bar of the prompt box, and a phone opens
it as a sheet. It has only the Secrets part: the secrets of Acme, with
FIGMA_TOKEN and VERCEL_TOKEN checked for each run workspace. Under the
prompt box, a line names the secrets that runs can use with no question,
and the hint of a pull request trigger follows. The `member` and `admin`
child pages of `app/automations/automation` have the same line, read-only.

`app/secret-requests` has a request for PROD_DATABASE_URL just above the
composer, while the tool call waits. Its child pages:

- `several` has a request for two secrets. Its `mixed` variant has a
  secret of Acme and a name that Acme does not have in one card, and its
  `mixed-value` variant has the same card with a value.
- `temporary` has a request for MAPBOX_TOKEN, which Acme does not have,
  with no value yet. A phone shows Deny and Give a value. Its child pages:
  - `value` has a typed value and 15 minutes, and on a phone the sheet
    that Give a value opens. Its `workspace` and `saved` variants have the
    other two choices. Its `invalid-name` variant has Google Places key, a
    name with spaces, so Save as secret is off. Its `mixed-invalid-name`
    variant adds that name to a mixed request, and Save as secret is off
    for every value.
  - `late` has the request after the turn ended, with no value yet. Its
    `value` variant has the value that Priya types later, and its `given`
    variant has her answer for this workspace and the line of the app that
    names her.
- `results` has the run after Allow for this session: its card, with no
  output, and the tool call line of the agent beside it. Its variants have
  the run while it runs, a denied request, a pre-approved secret, and a
  value for 15 minutes.
- `late` has the request that nobody answered in time, in the chat after
  its turn. Its child pages:
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
through the late request in the chat and the late Allow of Priya, to the
run of the new turn for Cal.
