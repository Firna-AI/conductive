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
  the env vars, the skills repository and its trust choice, and the org
  logins, from decisions 54 and 57, decision 2 of the org skills
  repository plan, and decision 403 of the skills trust plan. A member sees the General,
  Repositories, Cloud computer, and Agents tabs read-only: the values, without edit
  fields, Save, Build computer, or Connect. The General tab of a member is the child
  page `app/org-settings/member`, because `app/org-settings` has child
  pages. `DetailList` in
  [`src/ui/components/settings/`](../../src/ui/components/settings/) shows
  such values.
  A member also sees the skills that the lookup of the skills repository
  finds, and each notice in place of that list, from decision 7 of the
  org skills repository plan. A notice that asks for a change of the
  repository says that an admin can make it, as
  `app/org-settings/cloud-computer/member/private-skills` shows.
- Every member adds secrets on the Secrets tab, and replaces or deletes
  the secrets that they added, from secrets decision 3. Only an admin
  switches the mark for all agents and reveals a value, as
  `app/org-settings/secrets/member` shows.
- Each session runs on its login: the agent login of the member who
  started it, or the org login of its org, from decision 1 B of the org
  logins plan, which the user chose on 16 November 2026. A session takes
  its login at its first message and keeps it. The messages of other
  members use the login of a member only while that member shares it, with
  the switch under each login of the account. The org login has no such
  switch, so every member of the org sends on it, also after its starter
  leaves the org. So a reassign changes no login, and the cloud computer
  keeps running. The owner menu says "Each session keeps its agent login."
  in `app/reassign`.
- When a message uses the login of another member, the bar of the
  composer names that login after the model picker, such as "Cal's login"
  in `app/composer/login`. So the box keeps its place. The label names an
  own endpoint login in the same way, with no host, as [Logins](logins.md)
  says. A session on the org login names the org, such as "Acme's login",
  for every member, also for its starter, as `app/composer/org-login`
  shows. A new session names the org login while it is the default login
  of the viewer, as its `new-session` and `every-member` variants show. An
  empty session of another member names the default login of its starter,
  which its first message takes, as the `started-session` variant shows. A
  message on the own login of the viewer shows no name. When the login of
  the member who started a session is not available, a message of another
  member starts a new session. The notice over the composer of the first
  session says so, and its chat stays as it was, as
  `app/sessions/no-starter-login` shows. The same happens when that member
  does not share the login. The notice then says that the login is for the
  messages of that member only, as `app/composer/not-shared` shows. After
  an admin removed the org login of a session, the notice says that the
  login of the org is not available, as `app/composer/org-login/removed`
  shows. In each case, a message does not steer a running turn, and the
  new session runs on the default login of the sender. A viewer whom no
  login serves for the agent sees the notice that asks to connect, as
  `app/composer/no-agent` shows. The new session starts with a line that
  links back to the first session, then the new message, as
  `app/sessions/linked` shows. The parts live in
  [`src/ui/components/chat/SessionLogin.tsx`](../../src/ui/components/chat/SessionLogin.tsx)
  and `LinkedLine.tsx`.
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
  offers Restore.
- On the last day of Restore, the workspace also leaves the list, from
  decision 518 D of 13 November 2026: the Archived group, its count, and
  the palette leave it out. The app keeps all its data, so a direct link
  and a chip still open its read-only chat, from decision 519 B. The words
  say "removed", never "deleted", for the workspace, from decision 520 A.
  Until that day, the bar and the toast after Archive give the day when
  the workspace leaves the list, also when the bar offers no Restore, as
  `app/archive/no-computer` shows. A removed workspace shows the bar
  "Removed on" and the day. The bar says that the workspace left the list,
  that its cloud computer is being deleted while a failed delete tries
  again, or is deleted, and that the chat is read-only, as
  `app/archive/removed` and its `deleting` variant show.
- The menu of a workspace row follows the same roles, as
  `app/workspace-menu/roles` shows. Every member moves and renames a
  workspace that is not archived. Only an admin sees Reassign to, and only
  the owner and the admins see Archive, which archives at once. Every row
  offers Copy link. The archived row of an admin offers only Reassign to
  and Copy link. An archived row of a member and every row of a suspended
  org offer only Copy link. The menu has no
  Restore: the row keeps it, for every member of an org that is not
  suspended.
- No stopped workspace shows as expiring. On the `boat` account, near day
  14 of a stop, the app starts the cloud computer briefly and stops it
  again, from decision 43. The `e2b` account keeps a stopped cloud
  computer with no time limit.
- Any user creates orgs. Create org of the first run returns to Get started.
- Create org needs at least one repository, from decision 151, because it
  starts the first build of the cloud computer. The hint under
  Repositories says to add at least one, and Create org stays off until
  one is added, as `app/orgs/new/no-repository` shows. When the GitHub App
  reaches no repository, the list asks the person to give it access, with
  Manage access, as `app/orgs/new/no-access` shows.
- Create org of an operator also offers the provider account of the org,
  from e2b decision 222: By weights, the default, or an account by its ID,
  as `app/orgs/new/operator` shows. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. An operator can switch the account
  later, on the page of the org, as `app/operator/org/switch` shows.
  Nobody else sees the choice, so no other screen names a provider.
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
  offers no Restore, and its bar still gives the day when it leaves the
  list, as `app/orgs/suspended/workspace/archived` shows. A
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
  an admin. The parts live in `src/components/members/`. The parts and
  styles that the app shares live in
  [`src/ui/components/members/`](../../src/ui/components/members/).

No screen shows the value of an env var. Each env var of an org has a
Secret mark: an admin switches it in the row, and a new variable starts
secret. A member sees the mark as a word, without a control.
[`src/ui/components/settings/EnvVarParts.tsx`](../../src/ui/components/settings/EnvVarParts.tsx)
gives the switch and the mark, and `envVarCopy.ts` beside it gives the
note under the list. The app shares both.
`app/org-settings/cloud-computer`, its `add-variable` and `change-value`
pages, and its `member` page show them.

The Skills section of the Cloud computer tab names the public GitHub
repository whose skills the agents of every workspace use. An admin edits
it in a field, and a member sees it as text. Under it, the section lists
the skills that a lookup on GitHub finds, or it shows a notice in place of
the list. `src/components/settings/SkillsSection.tsx` draws the section.
`SkillList.tsx` in
[`src/ui/components/settings/`](../../src/ui/components/settings/) draws
the list, and `skillsCopy.ts` beside it holds the words and the result of
the lookup. The app shares both. Under the field, an admin sets the
switch "Trust this skills repository", which starts off for each
repository, and a member sees the saved choice as text. The choice exists
only while the field names a repository as owner/name. `SkillsTrust.tsx`
beside `SkillsSection.tsx` draws the switch and the read-only choice.
`skillsTrustCopy.ts` beside `SkillList.tsx` holds their words and the
address of the guide. [The catalogue](catalogue.md) gives its pages.

A secret of an org differs from an env var. An env var reaches every cloud
computer at each start. A secret reaches only one command that an agent
runs after a member allows it. The agent gets its name and its variable
name, never its value. Every
member adds secrets on the Secrets tab, and only an admin reveals a value,
one at a time, as `app/org-settings/secrets` shows.
[Secrets and Capabilities](design-secrets.md) gives the tab, the
Capabilities control, and the requests in the chat.

A file path can hold a secret value. The lists, the tabs, the page
headers, and the files of a finished turn then show "[redacted]" in place
of the value, and each file still opens by its real path. A tab whose file
name the app does not know shows "File". The `paths` state of the
workspace screen draws them, as `app/chat/masked-paths` shows.

## Logins

[Logins](logins.md) gives the agent logins of the account, the org logins
of the Agents tab of the org settings, the steps of Get started, and the
notice for an agent that is not connected.

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
  name the waitlist switch. The mockups take them from
  [`src/ui/screens/waitlistCopy.ts`](../../src/ui/screens/waitlistCopy.ts)
  and
  [`src/ui/components/settings/inviteCodeCopy.ts`](../../src/ui/components/settings/inviteCodeCopy.ts).
- The waitlist, the sign-in, and the sign-in of an invite link share one
  frame, as [the design](design.md) gives. The home page asks a visitor
  to sign up, as [the marketing site](marketing-site.md) gives. Outside
  open sign-up, the new account then waits on the waitlist.
