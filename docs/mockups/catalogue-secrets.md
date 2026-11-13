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
  agents.
- `replace` has the Replace form of VERCEL_TOKEN, a secret that Priya
  added: its description to change, and an empty field of a new value.
- `delete` has the question before Delete of VERCEL_TOKEN.
- `member` has the tab as Priya, a member, sees it: each value as dots, no
  Reveal, and Replace and Delete only on her own secrets. Its `add` variant
  has her form without the switch for all agents, and its `replace` variant
  has the Replace form of one of her secrets.
- `empty` has Firna, a new org, without secrets.

The `secrets` variant of `app/orgs/suspended/settings` has the tab of a
suspended org, with no action.

`app/new-workspace/capabilities` has the Capabilities control open on the
New workspace page: the secrets of Acme with FIGMA_TOKEN pre-approved, and
Mac access on. A phone opens it as a sheet. Its `no-secrets` variant has
Firna without secrets. `app/new-workspace/dialog/capabilities` has the same
control in the dialog.

`app/capabilities` has the control of Checkout address autocomplete, with
the approvals of its sessions and its value for the workspace, each with
Remove. Its `mac-access-off` variant has Mac access off. The
`mac-access-off` variant of `app/mac-commands` has a Mac command that the
workspace refused for that reason.

`app/secret-requests` has a request for PROD_DATABASE_URL just above the
composer, while the tool call waits. Its child pages:

- `several` has a request for two secrets. Its `mixed` variant has a
  secret of Acme and a name that Acme does not have in one card, and its
  `mixed-value` variant has the same card with a value.
- `temporary` has a request for MAPBOX_TOKEN, which Acme does not have,
  with no value yet. A phone shows Deny and Give a value. Its child pages:
  - `value` has a typed value and 15 minutes, and on a phone the sheet
    that Give a value opens. Its `workspace` and `saved` variants have the
    other two choices.
  - `late` has the request after the turn ended, with no value yet. Its
    `value` variant has the value that Priya types later, and its `given`
    variant has her answer for this workspace and her message.
- `results` has the run after Allow for this session, with its output. Its
  variants have the run while it runs, a denied request, a pre-approved
  secret, and a value for 15 minutes.
- `late` has the request that nobody answered in time, in the chat after
  its turn. Its `answered` variant has the late Allow of Cal and his
  message, its `ran` variant has the run of the new turn, and its `denied`
  variant has a late deny, which sends no message. Its `not-answered`
  variant has the request that ended when Cal archived the workspace.
- `in-work` has the run in the open fold of its ended turn.

`user-flows/secret-request` goes from the request above the composer,
through the late request in the chat and its late Allow, to the run of the
new turn.
