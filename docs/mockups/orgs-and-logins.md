# Orgs, members, and logins

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

## Orgs and members

The product is free for now, as the user decided on 5 November 2026 in
decision 45. So the screens show no plans, no billing, no seats, and no
plan limits.

- An admin invites a person by email, from decision 78. An open invite shows
  its email, and a member row shows the GitHub login. The roles are admin and
  member, from decision 54. Only an admin manages the members, deletes the
  org, and reassigns a workspace. A member who is not an admin sees the
  members and each workspace's owner without actions. "Owner" names only
  the person who owns a workspace.
- After the GitHub sign-in, the invited person sees each pending
  invitation with its org and the invited email, as
  `app/sign-in/invitations` shows. Accept invitation joins that org and
  opens it. Continue to workspaces accepts nothing. The page has no
  Decline.
- Only an admin renames the org, and changes the repositories, the scripts,
  and the env vars, from decisions 54 and 57. A member sees the General,
  Repositories, and Cloud computer tabs read-only: the values, without edit
  fields, Save, or Build computer. The General tab of a member is the child
  page `app/org-settings/member`, because `app/org-settings` has child
  pages. `DetailList` in `src/components/settings/` shows such values.
- Each session runs on the agent login of the member who started it. The
  messages of other members use that login only while that member shares
  it, with the switch under each login of the account. So a reassign
  changes no login, and the cloud computer keeps running.
- The line under the composer names the login that a message uses, such
  as "Uses Cal's Claude login" in `app/composer/login`, or "Uses your Claude
  login". When the login of the member who started a session is not
  available, a message of another member starts a new session. The notice
  over the composer of the first session says so, and its chat stays as it
  was, as `app/sessions/no-starter-login` shows. The same happens when that
  member does not share the login. The notice then says that the login is
  for the messages of that member only, as `app/composer/not-shared` shows.
  In both cases, the line under the composer names the own login of the
  viewer, and a message does not steer a running turn. A viewer without a
  login for the agent sees the notice that asks to connect, as
  `app/composer/no-agent` shows. The new session starts with a line that
  links back to the first session, then the new message, as
  `app/sessions/linked` shows. The parts live in
  `src/components/chat/SessionLogin.tsx` and `LinkedLine.tsx`.
- A stopped turn names the member who pressed Stop, from decision 72,
  because all members of an org see the same chat. That member sees "You
  stopped the agent", as `app/chat/turns/interrupted` shows. The other members
  see the name of that member, such as "Cal stopped the agent" in
  `app/reassign/member-stop`. When no member pressed Stop, such as when
  the cloud computer stopped during the turn, the chat says "The agent
  stopped", as `app/shell/stopped/during-turn` shows.
- Each branch starts with the GitHub login of the owner of its workspace,
  such as `calummoore/lisbon-7k2q`, from decision 53.
- Archive, from decision 16, deletes the cloud computer and keeps the chat
  read-only in the Archived group at the end of the list. It checks first
  for work that is not committed or not pushed. The pull request bar offers
  it after a merge. Only the workspace's owner and the org's admins see
  Archive, from decision 42. An archived workspace has no file lists and no
  tools, so a phone shows only its chat.
- No workspace shows as expiring. Near day 14 of a stop, the app starts the
  cloud computer briefly and stops it again, from decision 43.
- Any user creates orgs. Create org of the first run returns to Get started.
- Delete org asks for the org name. The deleted org stays faded in the rail
  of its admins until the date when everything is deleted, and its page
  offers Restore.
- The operator can suspend an org, from decision 129. Its members still
  open it and read its chats, and its notice gives the abuse address.
  Nothing in it can change, so its screens show no action that it refuses,
  also for an admin. No notice promises its files. A deleted org that is
  also suspended shows the notice above its page, keeps the date when
  everything is deleted, and offers no Restore, as
  `app/orgs/suspended/deleted` shows.
- A person whom the last-admin rule of decision 123 lets leave sees Leave
  org on the General tab of a suspended org, as `app/orgs/suspended/leave`
  shows. The only active admin sees no Leave org, because the org keeps
  someone who can manage it. If a leave still gets the last-admin refusal,
  the screen names no step that the suspended org refuses.
- Three orgs show: Acme, Firna, the first org of the sign-up, and Acme Labs,
  which Create org makes. The parts live in `src/components/members/`.

## Logins

- The app runs every cloud computer in its own account. So no org has a
  key for its cloud computers, and no screen asks for one or for another
  account.
- The account connects Claude with a subscription token from
  `claude setup-token` or an API key. It connects Codex with an OpenAI API
  key or with a Codex access token from a ChatGPT Business or Enterprise
  workspace, from decision 170. `AgentConnectForm` opens under the row of
  the agent, as `app/account/connect` shows. Its switch chooses the kind of
  the login, and the first kind starts selected: Subscription token, then
  API key, for Claude, and API key, then Access token, for Codex. The words
  above the field say what to paste and where to make it.
- A connected login shows its kind and Remove. The name of the kind
  depends on the agent: a Claude token is a "Subscription token", a Codex
  token is an "Access token", and a key is an "API key". `loginLabels` in
  `src/fixtures/logins.ts` holds the names. On a phone, the state and the
  kind go on a second line under the name of the agent, so that the kind
  shows in full.
- Under each connected login, the switch "Let other members use this
  login" says whether the messages of other members in the sessions of the
  user run on it, from decision 116. The switch starts off for a Claude
  subscription token and on for an API key, as `app/account` shows. A
  Codex access token starts off too, from decision 171, as
  `app/account/codex-token` shows. The switch saves at once. A change that
  the app did not save shows its cause beside the switch, as
  `app/account/share-not-saved` shows. The part lives in
  `src/components/settings/LoginShare.tsx`.
- Get started has three steps: install the GitHub App, create an org, and
  connect Claude or Codex, from decision 33. The next step opens its form.
- A login belongs to the person, so the agent step has its own state. A
  person who leaves the last org returns to Get started with the agent
  still connected, as `app/sign-in/get-started/no-org` shows.
- The app and the mockups take the words of Get started from
  `src/screens/getStartedCopy.ts`. The words make no claim about earlier
  use.
- The composer shows a notice when the agent of the chosen model is not
  connected. In a session that another member started, a message uses the
  available login of that member while that member shares it, so no agent
  notice shows.
