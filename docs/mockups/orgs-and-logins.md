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
- Every member adds secrets on the Secrets tab, and replaces or deletes
  the secrets that they added, from secrets decision 3. Only an admin
  switches the mark for all agents and reveals a value, as
  `app/org-settings/secrets/member` shows.
- Each session runs on the agent login of the member who started it. The
  messages of other members use that login only while that member shares
  it, with the switch under each login of the account. So a reassign
  changes no login, and the cloud computer keeps running.
- When a message uses the login of another member, the bar of the
  composer names that login after the model picker, such as "Cal's login"
  in `app/composer/login`. So the box keeps its place. The label names an
  own endpoint login in the same way, with no host, as [Logins](#logins)
  says. A message on
  the own login of the viewer shows no name. When the login of the member who
  started a session is not available, a message of another member starts
  a new session. The notice over the composer of the first session says
  so, and its chat stays as it was, as `app/sessions/no-starter-login`
  shows. The same happens when that member does not share the login. The
  notice then says that the login is for the messages of that member only,
  as `app/composer/not-shared` shows. In both cases, a message does not
  steer a running turn. A viewer without a login for the agent sees the
  notice that asks to connect, as `app/composer/no-agent` shows. The new
  session starts with a line that links back to the first session, then
  the new message, as `app/sessions/linked` shows. The parts live in
  `src/components/chat/SessionLogin.tsx` and `LinkedLine.tsx`.
- A stopped turn names the member who pressed Stop, from decision 72,
  because all members of an org see the same chat. That member sees "You
  stopped the agent", as `app/chat/turns/interrupted` shows. The other members
  see the name of that member, such as "Cal stopped the agent" in
  `app/reassign/member-stop`. When no member pressed Stop, such as when
  the cloud computer stopped during the turn, the chat says "The agent
  stopped", as `app/shell/stopped/during-turn` shows. When the agent of a
  session stopped the turn with a workspace tool, the chat names that
  session, not a member, from decision 279. It says "Stopped from" and
  shows the session chip of that session, as `app/chat/agent-stops` shows.
- Each branch starts with the GitHub login of the owner of its workspace,
  such as `calummoore/lisbon-7k2q`, from decision 53.
- Archive stops the cloud computer at once, with no check and no question,
  and keeps the chat read-only in the Archived group at the end of the
  list, from decision 1 of PR #138. The pull request bar offers it after a
  merge. Only the workspace's owner and the org's admins see Archive, from
  decision 42. An archived workspace has no file lists and no tools, so a
  phone shows only its chat.
- Restore puts an archived workspace back in its section, stopped, with its
  files and sessions. The toast after Archive offers it, and the archived
  bar and the row in the Archived group offer it until its last day, 14
  days after the Archive. The bar gives that last day. Every member of an
  org that is not suspended sees Restore, from decision 2 of PR #138, as
  `app/command-palette/actions/archived` shows. After the last day, nothing
  offers Restore. The bar gives the day when Restore ended while a failed
  delete of the cloud computer tries again, as `app/archive/restore-ended`
  shows. After the delete, the bar says that the cloud computer is deleted,
  as `app/archive/deleted` shows.
- The menu of a workspace row follows the same roles, as
  `app/workspace-menu/roles` shows. Every member moves and renames a
  workspace that is not archived. Only an admin sees Reassign to, and only
  the owner and the admins see Archive, which archives at once. Every row
  offers Copy link. The archived row of an admin offers only Reassign to
  and Copy link. An archived row of a member and every row of a suspended
  org offer only Copy link. The menu has no
  Restore: the row keeps it, for every member of an org that is not
  suspended.
- No stopped workspace shows as expiring. Near day 14 of a stop, the app
  starts the cloud computer briefly and stops it again, from decision 43.
- Any user creates orgs. Create org of the first run returns to Get started.
- Create org needs at least one repository, from decision 151, because it
  starts the first build of the cloud computer. The hint under
  Repositories says to add at least one, and Create org stays off until
  one is added, as `app/orgs/new/no-repository` shows. When the GitHub App
  reaches no repository, the list asks the person to give it access, with
  Manage access, as `app/orgs/new/no-access` shows.
- Delete org asks for the org name. The deleted org leaves the rail. Until
  the date when everything is deleted, the General tab of the Account page
  lists it for its admins with Restore, as `app/account/deleted-orgs`
  shows. Its page still offers Restore at its address.
- Each person keeps their own order of their orgs, from decision 515 C of
  11 November 2026, as `app/orgs/reorder` shows. The server saves it with
  their memberships, so the rail, the org switcher of a phone, and the org
  rows of the command palette show it on every device. A drag on the rail,
  or Move up and Move down in the menu of a tile, change it. Alt and Up or
  Down move a focused tile, from decision 517 B. On a phone, a long press
  lifts an org in the org switcher and opens no menu. A new org goes at the
  end of the rail. Create org, Operator, and the account stay where they
  are.
- The operator can suspend an org, from decision 129. Its members still
  open it and read its chats, and its notice gives the abuse address.
  Nothing in it can change, so its screens show no action that it refuses,
  also for an admin. Its tile in the rail still moves, because the order of the rail belongs to the person,
  from decision 516 A, as `app/orgs/reorder/suspended` shows. No notice
  promises its files. An archived workspace
  offers no Restore, as `app/orgs/suspended/workspace/archived` shows. A
  deleted org that is also suspended shows the notice above its page, keeps
  the date when everything is deleted, and offers no Restore, as
  `app/orgs/suspended/deleted` shows.
- A person whom the last-admin rule of decision 123 lets leave sees Leave
  org on the General tab of a suspended org, as `app/orgs/suspended/leave`
  shows. The only active admin sees no Leave org, because the org keeps
  someone who can manage it. If a leave still gets the last-admin refusal,
  the screen names no step that the suspended org refuses.
- Three orgs show: Acme, Firna, the first org of the sign-up, and Acme Labs,
  which Create org makes. Priya is a member of Acme and of Firna who is not
  an admin. The parts live in `src/components/members/`.

## Logins

- The app runs every cloud computer in its own account. So no org has a
  key for its cloud computers, and no screen asks for one or for another
  account.
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
  connected host, model list, and address refusal for both agents.
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
- `chatGptSignInCopy.ts` in `src/components/settings/` gives the words of
  the ChatGPT sign-in, the address of the ChatGPT settings, the row of a
  sign-in that stopped working, and the causes of the Worker. It imports no
  fixture, so the app and the Worker can import the same words.
- A connected login shows its kind and Remove. The name of the kind
  depends on the agent: a Claude token is a "Subscription token", the
  ChatGPT sign-in of Codex is "ChatGPT plan", and a key is an "API key".
  `loginLabels` in `src/fixtures/logins.ts` holds the names. On a phone,
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
  `src/components/settings/LoginShare.tsx`.
- Get started has three steps: install the GitHub App, create an org, and
  connect Claude or Codex, from decision 33. The next step opens its form.
  It opens only after app access, so a person who waits sees the
  waitlist instead. The agent step offers the kinds of the account, also
  the own endpoint, and it shows no share switch. Its text says that the
  agents run on the own Claude or OpenAI account of the person, or on
  their own endpoint (decision 7 B of the own endpoint plan).
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
  `src/screens/firstBuildCopy.ts`.
- A login belongs to the person, so the agent step has its own state. A
  person who leaves the last org returns to Get started with the agent
  still connected, as `app/sign-in/get-started/no-org` shows.
- A person whose orgs are all deleted counts as a person with no org.
  While a deleted org exists, Get started shows the Deleted orgs list with
  Restore before its steps, as `app/sign-in/get-started/deleted-orgs`
  shows. Otherwise it shows no list.
- The app and the mockups take the words of Get started from
  `src/screens/getStartedCopy.ts`. The words make no claim about earlier
  use.
- The composer shows a notice when the agent of the chosen model is not
  connected. In a session that another member started, a message uses the
  available login of that member while that member shares it, so no agent
  notice shows.

## The waitlist

The waitlist comes from decisions 160 to 163 and 230. Outside open sign-up,
a new GitHub sign-in creates an account without app access. The approval
of an operator, an invite code, an invite link, or an org invitation gives
app access. While an
operator has turned the waitlist off and sign-ups are not paused, each
sign-in gives app access, from decision 230. This is open sign-up.

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
- During open sign-up, a person who waits gets app access at their next
  request, and the app opens. So the waitlist screen needs no state of its
  own. The invite code on the Account page says that anyone can sign up
  now, and that the invites stay for later, as
  `app/account/invites/open-sign-up` shows. The pause wins, so the notice
  of the pause shows while both are on.
- The words say "waitlist" as one word, "invite code" and "invite link"
  for every code, "Sign-ups are paused" for the pause, and "Anyone can
  sign up now" for open sign-up. They never say "referral", and they never
  name the waitlist switch. The mockups take them from `src/screens/waitlistCopy.ts`
  and `src/components/settings/inviteCodeCopy.ts`.
- The waitlist, the sign-in, and the sign-in of an invite link share one
  frame, as [the design](design.md) gives. The home page asks a visitor
  to sign up, as [the marketing site](marketing-site.md) gives. Outside
  open sign-up, the new account then waits on the waitlist.
