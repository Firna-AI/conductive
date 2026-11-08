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
- Each session runs on the agent login of the member who started it, also
  for the messages of other members. So a reassign changes no login, and
  the cloud computer keeps running.
- The line under the composer names the login that a message uses, such
  as "Uses Cal's Claude login" in `app/composer/login`, or "Uses your Claude
  login". When the login of the member who started a session is not
  available, a message of another member starts a new session. The notice
  over the composer of the first session says so, and its chat stays as it
  was, as `app/sessions/no-starter-login` shows. The new session starts
  with a line that links back to the first session, then the new message,
  as `app/sessions/linked` shows. The parts live in
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
- Three orgs show: Acme, Firna, the first org of the sign-up, and Acme Labs,
  which Create org makes. The parts live in `src/components/members/`.

## Logins

- The app runs every cloud computer in its own account. So no org has a
  key for its cloud computers, and no screen asks for one or for another
  account.
- The account connects Claude with a subscription token from
  `claude setup-token` or an API key, and Codex with an OpenAI API key.
  `AgentConnectForm` opens under the row of the agent. A connected login
  shows its kind and Remove.
- Get started has three steps: install the GitHub App, create the first
  org, and connect Claude or Codex, from decision 33. The next step opens
  its form.
- The composer shows a notice when the agent of the chosen model is not
  connected. In a session that another member started, a message uses the
  available login of that member, so no agent notice shows.
