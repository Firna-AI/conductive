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
  stopped", as `app/shell/stopped/during-turn` shows.
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
  the owner and the admins see Archive, which archives at once. The
  archived row of an admin offers only Reassign to. An archived row of a
  member and every row of a suspended org have no menu. The menu has no
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
- Delete org asks for the org name. The deleted org stays faded in the rail
  of its admins until the date when everything is deleted, and its page
  offers Restore.
- The operator can suspend an org, from decision 129. Its members still
  open it and read its chats, and its notice gives the abuse address.
  Nothing in it can change, so its screens show no action that it refuses,
  also for an admin. No notice promises its files. An archived workspace
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
  `claude setup-token`, an API key, or an own endpoint, and Codex with an
  OpenAI API key or an own endpoint. `AgentConnectForm` opens under the
  row of the agent, with a choice of the kinds of that agent. On a phone
  the three kinds of Claude wrap onto two lines. The hint of a token or an
  API key says that the app tests it once and never shows it again. The
  hint of an own endpoint key promises no test, because the save sends no
  request to the endpoint. A connected login shows its kind and Remove.
- An own endpoint login sends the turns of its agent to a gateway or a
  proxy that the user chose, from decision 1 A of the own endpoint plan.
  The model gateway in the Worker, not the cloud computer, sends each model
  request of those turns to the endpoint, with the key, so the cloud
  computer gets neither. Its form asks for the address of the endpoint and
  its key, and the app stores both encrypted. `EndpointFields` in
  `src/components/settings/` draws the fields, as `app/account/own-endpoint`
  and its `codex` variant show.
  - The form says that the endpoint must serve the Anthropic Messages API
    for Claude, or the OpenAI Responses API for Codex. It names the models
    that the picker offers, which the endpoint must serve too, because the
    app keeps its own model list and does not read the models of the
    endpoint (decision 3 A of that plan).
  - The address is the base address of the endpoint. The placeholder gives
    an example, without `/v1` for Claude, and with `/v1` for Codex. One
    shared rule checks the address and builds the exact address of each
    request from it (decision 9 E of that plan). It keeps a query, and it
    drops a fragment, a trailing slash, and a final `/v1` of a Claude
    address. The hint names where the requests go, through the app, from
    the address in the field, such as https://gateway.example.com/v1/messages.
    When the rule changes the typed address, the hint first names the
    address that the form saves, such as "Saves as
    https://proxy.example.com", as `app/account/own-endpoint/typed` shows.
  - The rule accepts only an `https://` address with a public host, because
    the gateway calls the endpoint over the internet. It refuses
    `localhost` and each IP address that is not public, names of one label,
    internal names, the names of the app and of its previews, and a user
    name or a password in the address. The form and the save use the same
    rule. Its refusal names the rule in plain words: "Use a public https://
    address, without a user name or a password." The refusal takes the
    place of the hint under the address, and the key stays in its field,
    as `app/account/own-endpoint/refused` shows.
  - A connected own endpoint login shows its kind with the host of its
    endpoint under its row, such as "Own endpoint at proxy.example.com", so
    that a phone shows both in full. It never shows the key or the full
    address, as `app/account/own-endpoint/connected` shows. The part lives
    in `src/components/settings/LoginEndpoint.tsx`.
  - In a session on the own endpoint of another member, the bar of the
    composer names the login as for every login, such as "Cal's login".
    It names no host, because the members of an org trust each other with
    their logins (decision 5 of the own endpoint plan, which Cal changed on
    10 November 2026).
- Under each connected login, the switch "Let other members use this
  login" says whether the messages of other members in the sessions of the
  user run on it, from decision 116. The switch starts off for a Claude
  subscription, and on for an API key and an own endpoint (decision 4 B of
  the own endpoint plan), as `app/account` and
  `app/account/own-endpoint/connected` show. It saves at once. A change
  that the app did not save shows its cause beside the switch, as
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
  to sign up, and the new account then waits on the waitlist, as
  [the marketing site](marketing-site.md) gives.
