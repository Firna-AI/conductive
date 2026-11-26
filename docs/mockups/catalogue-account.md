# The catalogue: the account

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives `app/account` and its child pages, the own
endpoint form, and the pickers that hide the models that an endpoint does
not list.

`app/account` shows Account › General in the Settings dialog: the
sign-in, GitHub, and the invite code. Each tab of the dialog list is a
link, and a phone shows each tab as a screen of its own, with Settings as
the way back to `app/settings`. Its child pages:

- `app/account/agents` shows the Agents tab, with Claude connected by a
  subscription token and Codex by an API key. The user asked for this tab
  on 13 November 2026. Its `org-login` and `every-member` variants have the
  line of the org login of Acme under Claude, as
  [org logins](catalogue-org-logins.md) gives.
- `app/account/preferences` shows the Preferences tab. It starts with the
  Favourites section, as `app/model-favourites/preferences` gives. The New
  workspaces section follows, from decision 142 of PR #73: Model and
  effort, and the choice of how New workspace opens on a computer, the page
  or a dialog. Its `not-saved` variant shows a save of that choice that
  failed, which keeps the saved choice. Its `model-menu` variant shows the
  menu of the picker open, with the favourites first and Fast on.
- `app/account/setup` shows General at the first run, with nothing
  connected. Its `agents` variant shows the Agents tab at the first run,
  with neither agent connected.
- `app/account/connect-claude` has the Connect form of Claude, whose
  switch starts on Subscription token. Its `api-key` variant has that form
  with API key selected.
- `app/account/connect-codex` has the Connect form of Codex, whose switch
  starts on API key. Its child page `app/account/connect-codex/chatgpt` has
  that form with ChatGPT plan selected, before the sign-in starts, with the
  link to the ChatGPT settings and Get a code. Its `code` variant shows the
  one-time code while the page waits for the sign-in. Its `expired` variant
  has a code that expired, with Get a new code. Its `refused` variant has a
  first request for a code that OpenAI refused, with the link and Get a
  code.
- `app/account/codex-token` has Codex connected by a sign-in to a ChatGPT
  plan, whose share switch starts off.
  Its `not-usable` variant has a sign-in that OpenAI did not renew: the row
  says Signed out, with the cause and Sign in again. Its `sign-in-again`
  variant has the ChatGPT sign-in form that Sign in again opens under that
  row, which keeps Remove and the share switch. Its `sign-in-again-code`
  variant has the code in that form.
- `app/account/share-not-saved` shows the Agents tab after a login share
  setting failed to save, with its saved value and the cause beside the switch.
- `app/account/invites` has the invite code while sign-ups are paused.
  [The waitlist, suspensions, and the operator](catalogue-operator.md)
  gives its variants.
- `app/account/deleted-orgs` has the Deleted orgs section at the end of
  General, with Acme Labs and Restore. Its `suspended` variant
  has the org after a suspension, without Restore. Its `failed` variant
  has a Restore that failed, with the error under the row.
- `app/account/shortcuts` shows the Keyboard shortcuts tab in a browser, as
  [the keyboard shortcuts page](catalogue-shortcuts.md) gives.
- `app/account/stats` shows the Stats tab, after Keyboard shortcuts. The
  user chose the tab and its counts on 16 November 2026. It holds the counts of the person signed in: the
  workspaces that the person owns, the workspaces that run now, the
  automations, and the orgs, then the workspaces by state, with Removed
  after Archived from decision 521, and the new workspaces and the
  automation runs of each UTC day of the last 30 days. Its
  `loading` variant shows the first load, with placeholders. Its `failed`
  variant shows a read that failed, with Try again and no number. Its
  `empty` variant shows a new account with one org, whose other counts
  are all zero.

`app/account/own-endpoint` shows the form of Claude on the own endpoint
kind, while Codex runs on an own endpoint. Its `typed` variant has a
typed address, and the hint names the address that the form saves from
it. Its `codex` variant has the form of Codex on that kind. Its `refused`
variant has an `http://localhost` address that the shared address rule
refused. Its `connected` variant has both agents on an own endpoint, each
with its host and its share switch on.
`app/account/endpoint-models` shows option G of decision 10 of the own
endpoint plan, which Cal chose on 10 November 2026: the pickers of the
owner of a login hide each model that its endpoint does not list. Both
agents run on Cal's proxy, whose model list does not name Fable 5.1. The
Claude row says that Fable 5.1 is hidden from Cal's model pickers, and
why, with the model ID, the time of the last read of the list, and
Refresh. The model menu of Cal also leaves out his favourite on Fable 5.1,
as `app/model-favourites/endpoint` shows. Its other states come from Codex base decision 1 C, which Cal
chose on 13 November 2026:

- `v1-added` has the note under the Codex row after a save that added
  `/v1` to the typed address, because only that address lists the models.
- `read-failed` has the warning under each row after a Refresh whose
  model list read failed, each with Refresh.
- `read-failed-unlisted` has the same warning above the models that the
  last Claude list leaves out, with one Refresh beside the warning.
