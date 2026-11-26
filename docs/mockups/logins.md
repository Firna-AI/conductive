# Logins

This page belongs to [orgs, members, and logins](orgs-and-logins.md). It
gives the agent logins of the account and the org logins of the Agents tab
of the org settings. It also gives the steps of Get started, and the notice
for an agent that is not connected. The [mockups README](README.md) gives
the commands, the folder layout, how a screen is built, and links to the
other pages.

- The app runs every cloud computer in an account of its own. So no org
  has a key for its cloud computers, and no screen asks for one or for an
  account of the person.
- The account connects Claude with a subscription token from
  `claude setup-token` or an API key. It connects Codex with an OpenAI API
  key or with a device code sign-in to the ChatGPT plan of the member,
  from decision 175. `AgentConnectForm` opens under the row of the agent,
  as `app/account/connect-claude` and `app/account/connect-codex` show. Its
  switch chooses the kind of the login, and the first kind starts
  selected: Subscription token, API key, and Own endpoint for Claude, and
  API key, ChatGPT plan, and Own endpoint for Codex. For a token or a key, the words above the field
  say what to paste and where to make it.
- [Own endpoint login mockups](own-endpoint-logins.md) describes the fields,
  connected host, model list, and address refusal for both agents. It also
  describes the note after a Codex save that added `/v1`, and the warning
  after a model list read that failed.
- An admin connects an org login for each agent of an org, an API key or
  an own endpoint, on the Agents tab of the org settings, after Cloud
  computer, as `app/org-settings/agents` shows. This comes from decision
  1 B of the org logins plan, which the user chose on 16 November 2026.
  The tab is a copy of the Agents tab of the account with fewer options:
  its form offers only API key and Own endpoint, and asks for a key of the
  account of the org, as `app/org-settings/agents/form` shows. It has no
  share switch. A connected org login shows its kind, the host of an own
  endpoint, the models that the model list of the endpoint lacks, Replace,
  and Remove. After a save or a Refresh, an own endpoint also shows the
  note and the warning of the model list reads to the admin, as on the
  account, as the variants of `app/org-settings/agents/endpoint-models`
  show. Replace opens the form under the login, which serves until
  the new one saves, as `app/org-settings/agents/form/replace` shows. A
  failed save keeps the key in its field and names the cause over the
  buttons, as `app/org-settings/agents/form/not-saved` shows.
  `OrgAgents.tsx` in `src/components/settings/` draws the tab, with
  `AgentConnectForm`, `EndpointFields`, and `EndpointDetails` of the
  account. `orgAgentsCopy.ts` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/) holds
  the words of the tab, which the app shares. `EndpointDetails` draws the
  host, the note, the warning, and the model list of an own endpoint, with
  one Refresh, as on the account.
- Under each org login, the switch "Use for every member" of decision 7 B
  starts off. While it is off, the org login serves each member with no
  usable login of their own (decisions 4 and 6 A). While it is on, each new
  session in the org takes the org login, also for a member with a login
  of their own, as `app/org-settings/agents/every-member` shows. Older
  sessions keep their login. The switch saves at once, and a change that
  the app did not save shows its cause beside it, as its `not-saved`
  variant shows. `SettingSwitch.tsx` draws this switch and the share switch
  of a personal login.
- A member sees the Agents tab read-only: the agent, the kind, the host of
  an own endpoint, and the value of the switch as its hint, as
  `app/org-settings/agents/member` shows. Nobody sees the key or the full
  address. Only an admin sees the model list, the note and the warning of
  its reads, and Refresh, as `app/org-settings/agents/member/endpoints`
  shows.
- ChatGPT plan has no field. Its words say that Codex then runs on the
  plan, and that device code sign-in must be on first in the ChatGPT
  security settings, as `app/account/connect-codex/chatgpt` shows. They
  quote no label of ChatGPT, so they stay true after a rename. The link
  Open ChatGPT settings follows them, and opens those settings in a new
  tab. Get a code shows a one-time code in large type, the link to
  `auth.openai.com/codex/device`, the warning never to share the code and
  to enter only a code that the page shows, and a line that the page waits
  for the sign-in, as its `code` variant shows. A code works for 15
  minutes. An expired code offers Get a new code, as its `expired` variant
  shows. A refused sign-in gives its cause in the same place, as its
  `refused` variant shows. Its button says Get a code until a code showed,
  then Get a new code. A refusal because the setting is off has the same
  link. `ChatGptSignIn` in `src/components/settings/` draws the steps.
- The app renews a ChatGPT sign-in alone. When OpenAI does not renew it,
  the app can no longer use the login. Its row then says Signed out in
  place of Connected, gives the cause under the row, and offers Sign in
  again, as `app/account/codex-token/not-usable` shows. The cause comes
  from the field `unusableCause` of the login status. `LoginNotUsable.tsx`
  in `src/components/settings/` draws it. Sign in again opens the ChatGPT
  sign-in form in the place of the cause, as
  `app/account/codex-token/sign-in-again` shows. The row keeps the login
  with Remove, and the share switch stays, until a new sign-in replaces
  the login.
- `chatGptSignInCopy.ts` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/) gives
  the words of the ChatGPT sign-in, the address of the ChatGPT settings,
  the row of a sign-in that stopped working, and the causes of the Worker.
  The app, the Worker, and the mockups import the same words.
- A connected login shows its kind and Remove. The name of the kind
  depends on the agent: a Claude token is a "Subscription token", the
  ChatGPT sign-in of Codex is "ChatGPT plan", and a key is an "API key".
  `agentConnectCopy.ts` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/) holds
  the names.
  It also holds the switch order of `AgentConnectForm`, the field labels
  and placeholders, the words above the field, and the addresses of the
  key pages. The app shares these words. On a phone,
  the state and the kind go on a second line under the name of the agent,
  so that the kind shows in full.
- Under each connected login, the switch "Let other members use this
  login" says whether the messages of other members in the sessions of the
  user run on it, from decision 116. The switch starts off for a Claude
  subscription token and on for an API key or own endpoint, as `app/account` shows. A
  ChatGPT plan of Codex starts off too, from decisions 171 and 175, as
  `app/account/codex-token` shows. The switch saves at once. A
  change that the app did not save shows its cause beside the switch, as
  `app/account/share-not-saved` shows. The part lives in
  [`src/ui/components/settings/LoginShare.tsx`](../../src/ui/components/settings/LoginShare.tsx).
  The org logins plan keeps this switch as it is (decision 2).
- Under an agent, the account names each org whose org login serves the
  new sessions of the user: "Your new sessions in Acme use Acme's login."
  It shows while the user has no usable login of their own for the agent,
  as `app/account/agents/org-login` shows, and while an admin of that org
  turned on "Use for every member", as `app/account/agents/every-member`
  shows. The account names the default login of each org and agent, so the
  page shows that value and does not work it out. The part lives in
  [`src/ui/components/settings/OrgLoginLines.tsx`](../../src/ui/components/settings/OrgLoginLines.tsx).
- Get started has three steps: install the GitHub App, create an org, and
  connect Claude or Codex, from decision 33. The next step opens its form.
  It opens only after app access, so a person who waits sees the
  waitlist instead. The agent step offers the kinds of the account, also
  the own endpoint, and it shows no share switch. Its text says that the
  agents run on the own Claude or OpenAI account of the person, or on
  their own endpoint (decision 7 B of the own endpoint plan).
- A person with no login of their own, in an org whose org login serves
  an agent, needs none (decision 4 of the org logins plan). The agent step
  is then done with "Ready". Its words say that the person can start now
  with the login of the org, and a line under the agent names that login,
  as `app/sign-in/get-started/org-login` shows.
- Create org starts the first build of the cloud computer of the org, from
  decision 150. The org step shows that build under the org: preparing
  with its time, then ready, or the failure with its saved message, Try
  again, and a link to its log. An org with repositories and no build,
  such as after a build that did not start, shows No build yet with Build
  computer. The person connects an agent while the build runs.
- A repository or an install script that an admin saves during the first
  build goes into one more build, which starts by itself when the first
  build succeeds, from decision 151. The Cloud computer tab says so, as
  `app/org-settings/cloud-computer/first-build/script-changed` shows.
- The finish says that the org is ready for a new workspace only after the
  first build succeeded. While the build runs, it says that the cloud
  computer is still being prepared, as `app/sign-in/get-started/preparing`
  shows. After a failed build, it says that the cloud computer did not
  build, and with no build, that it needs a build. Open ‹org› stays on in
  each state.
- Until the first build succeeds, New workspace shows its state over the
  composer and keeps Send off, as `app/new-workspace/first-build` shows.
  Only an admin gets the link to the Cloud computer tab. The app and the
  mockups take the words of that notice from
  [`src/ui/screens/firstBuildCopy.ts`](../../src/ui/screens/firstBuildCopy.ts).
- A personal login belongs to the person, so the agent step has its own
  state. A person who leaves the last org returns to Get started with the
  agent still connected, as `app/sign-in/get-started/no-org` shows.
- A person whose orgs are all deleted counts as a person with no org.
  While a deleted org exists, Get started shows the Deleted orgs list with
  Restore before its steps, as `app/sign-in/get-started/deleted-orgs`
  shows. Otherwise it shows no list.
- The app and the mockups take the words of Get started from
  [`src/ui/screens/getStartedCopy.ts`](../../src/ui/screens/getStartedCopy.ts).
  The words make no claim about earlier use.
- The composer and the New workspace form show a notice when no login
  serves the agent of the chosen model: no usable login of the viewer, and
  no usable org login (decision 4 of the org logins plan). A form whose
  first message runs on the org login names it after the model picker,
  such as "Acme's login", as `app/new-workspace/dialog/org-login` shows.
  In a session on the login of another member or on the org login, a
  message uses that login while it serves the sender, so no agent notice
  shows.
- An automation run takes the default login of the owner of its
  automation: the own login, or the org login (decision 5 A of the org
  logins plan). It keeps the GitHub access of the owner. The line under the
  prompt names both, such as "Runs use Acme's Claude login and your GitHub
  access.", as `app/automations/automation/new/org-login` shows. Each
  member who reads the automation of another member reads the same logins,
  such as "Runs use Acme's Claude login and Cal's GitHub access.", as
  `app/automations/automation/member/org-login` shows. The model picker of
  the form follows the model list of the org endpoint (decision 3 A), as
  its `org-models` variant shows.
