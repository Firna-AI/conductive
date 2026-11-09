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
  Decline. A person who waits for app access sees the same rows on the
  waitlist screen, where Accept invitation also gives app access, as
  `app/sign-in/waitlist/invited` shows.
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
  `claude setup-token` or an API key, and Codex with an OpenAI API key.
  `AgentConnectForm` opens under the row of the agent. A connected login
  shows its kind and Remove.
- Under each connected login, the switch "Let other members use this
  login" says whether the messages of other members in the sessions of the
  user run on it, from decision 116. The switch starts off for a Claude
  subscription and on for an API key, as `app/account` shows. It saves at
  once. A change that the app did not save shows its cause beside the
  switch, as `app/account/share-not-saved` shows. The part lives in
  `src/components/settings/LoginShare.tsx`.
- Get started has three steps: install the GitHub App, create an org, and
  connect Claude or Codex, from decision 33. The next step opens its form.
  It opens only after app access, so a person who waits sees the
  waitlist instead.
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

## The waitlist

The waitlist comes from decisions 160 to 163. A new GitHub sign-in creates
an account without app access. The approval of an operator, an invite
code, an invite link, or an org invitation gives app access.

- A person without app access sees only the waitlist screen, as
  `app/sign-in/waitlist` shows. It stands alone, as the sign-in does, and
  it names the GitHub account with Sign out. It shows no place in line,
  because operators approve people in any order, and no Delete account.
  The Mac app shows the same screen in its window, as `mac-app/waitlist`
  shows.
- An approval sends one email, to the primary verified email of the
  GitHub account. The screen names that address. An account without a
  verified email gets no email, so the screen promises none. It says that
  the app opens there once the person is approved, as
  `app/sign-in/waitlist/no-email` shows.
- The screen takes an invite code. A typed code that does not work names
  its reason under the field: not found, disabled, or used up. A code that
  the pause stopped stays unused, and a notice asks the person to try it
  again later. The org invitations of the person show above the field,
  and Accept invitation is then the main action.
- During the pause, Accept invitation lets nobody in either. The person
  joins no org, and the invitation stays. A notice above it says so, and
  asks the person to accept it again when sign-ups resume, as
  `app/sign-in/waitlist/invited/paused` shows. The screen names the pause
  only after a code or an Accept that it stopped, because an approval
  still works during the pause.
- An invite link opens the sign-in with its code, as `app/sign-in/join`
  shows. The page names no owner of the code. When the code of the link
  does not work, the waitlist opens with a notice that names the reason,
  as `app/sign-in/join/failed` shows. A person who already has app access
  uses no code, and the app opens as usual.
- Each user with app access has an invite code with 5 invites. The
  Account page shows it at the end, after what every org shares, so that
  the form of an agent stays near the top on a phone. It gives the invite
  link with Copy, the code alone, and how many invites are left, as
  `app/account` shows.
  During the pause, the link stays under a notice. A code that is used up
  or turned off shows no link, as `app/account/invites` shows. The page
  names nobody who used an invite.
- The words say "waitlist" as one word, "invite code" and "invite link"
  for every code, and "Sign-ups are paused" for the pause. They never say
  "referral". The mockups take them from `src/screens/waitlistCopy.ts`
  and `src/components/settings/inviteCodeCopy.ts`.
- The waitlist, the sign-in, and the sign-in of an invite link share one
  frame, as [the design](design.md) gives. The home page asks a visitor
  to join the waitlist, as [the marketing site](marketing-site.md) gives.
