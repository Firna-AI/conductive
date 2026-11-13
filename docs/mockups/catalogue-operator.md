# The catalogue: the waitlist, suspensions, and the operator

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives what the operator controls: the pages of the
waitlist, a suspended org, and the operator section with its child pages.

The waitlist comes from decisions 160 to 163 and 230. Outside open sign-up,
a new GitHub sign-in creates an account without app access. The person
waits until an operator, a code, an org invitation, or open sign-up lets
them in. Its pages:

- `app/sign-in/waitlist` has the only screen of a person who waits, Sam
  Okafor, with the address that gets the approval email. Its child pages
  were its variants and kept their paths. `code-failed` has a typed code
  that was not found, and `paused` has a code that the pause of sign-ups
  stopped. `invited` has an org invitation that lets Sam in, and its
  `paused` variant has the same invitation after the pause stopped Accept:
  the invitation stays, and a notice asks Sam to accept it again when
  sign-ups resume. `no-email` has an account with no verified email. The
  code control of `mockups:serve` shows each reason that a code does not
  work: unknown, disabled, used up, and the pause.
- `mac-app/waitlist` has the same waitlist in a window of the Mac app, and
  its `full-screen` variant has it without the window buttons.
- `app/sign-in/join` has the sign-in page that an invite link opens, with
  its code. Its child page `app/sign-in/join/failed` has the waitlist after
  the code of the link did not work, here a used-up code, and its `paused`
  variant has the pause.
- `app/account` shows the invite code of the user at the end of the
  General tab, with 3 of 5 invites left. Its child page `app/account/invites` has the
  pause, and its variants have every invite used, a code that an
  operator turned off, and `open-sign-up`, whose notice says that anyone
  can sign up now and that the invites stay for later.
- The Sign up flow ends on the waitlist. The Join with an invite link flow
  goes from the link through Get started, so the people of each flow stay
  the same.
- Open sign-up comes from decision 230: the waitlist is off and sign-ups
  are not paused. `marketing/open-sign-up`, a child page of the home page,
  shows that the page stays the same, with Sign up. The Open sign-up flow
  goes from it through the sign-in to Get started.

`app/orgs/suspended` shows Acme after the operator suspended it, from
decision 129. Its notice is at the top of the list, and every workspace
shows stopped. Its child pages:

- `app/orgs/suspended/workspace` has a workspace with the refused bar of the
  org. Its `archived` variant has an archived workspace, with the notice of
  the org above the archived bar and no Restore. The bar still gives the
  day when the workspace leaves the list. Its `files` variant has
  the Files tab of a phone, whose panel shows the words of the org.
- `app/orgs/suspended/new-workspace` has the New workspace page, which an
  old tab can still open. The refused bar takes the place of the composer.
- `app/orgs/suspended/settings` has the four tabs, read-only also for an
  admin.
- `app/orgs/suspended/routines` has the routines of the org under its
  notice, without New routine, because a suspension takes away no read.
  Its child page `app/orgs/suspended/routines/routine` has a routine
  without Save, Run now, Delete, Turn off, or Add trigger. Its `runs`
  variant has the Runs tab of a phone, and its `unavailable` and
  `not-loaded` variants have the page when it cannot show the routine.
  The notice of the org stays at the top of each.
- `app/orgs/suspended/leave` has Leave org for a member who is not an
  admin, and its `confirm` variant has the question before the leave. Acme
  is the only org of that member, so Leave org opens
  `app/sign-in/get-started/no-org`: no org, and the agent still connected.
- `app/orgs/suspended/deleted` has a deleted org that is also suspended:
  the notice of the org above the page of the deleted org, with its date,
  and no Restore.

`app/operator` shows the Overview tab of the operator, the person who runs
the app for everyone, from decision 142. It holds live counts across every
org, as decision 144 chose for now. The workspaces by state count Removed
apart from Archived: the archived workspaces whose 14 days ended, which
left the list. The page of an org counts them in the same way. A line under the users counts the
people on the waitlist, from decision 160. The Orgs and Users tabs come from
decision 147, and they find a suspended org or user. The Waitlist and
Invite codes tabs come from decision 160. Its child pages:

- `app/operator/menu` has Operator in the rail, above the account, and in
  the org switcher of a phone, under Account. Only an operator sees it.
- `app/operator/orgs` has the Orgs tab: the newest orgs, a search by name,
  a search by preview address, and a search with no match.
- `app/operator/org` has the page of an org, with the names of its
  members, and Suspend org. Its child pages have the question before the
  suspension, the suspended org with Lift, the question before the lift,
  from decision 145, and a deleted org. The child page of the deleted org
  has its question before a suspension, the deleted org that is also
  suspended, and its question before a lift. They say that no admin can
  restore a suspended org, and that a lift leaves the org deleted.
- `app/operator/users` has the Users tab: the newest users, with Waiting
  under a person on the waitlist, a search, and a search with no match.
- `app/operator/user` has the page of a user, with the name, the age of
  the GitHub account, how and when they got app access, their referral
  code with Copy, Copy join link, and who used it, and Suspend user. Its
  child pages are below.
- `app/operator/waitlist` has the Waitlist tab: the people who wait, oldest
  first, a search, the question before Approve, the list after two
  approvals, one with its email not sent yet, and an empty waitlist.
- `app/operator/codes` has the Invite codes tab: Sign-ups with the state
  of the waitlist, Turn off the waitlist, and Pause sign-ups, the search,
  and the invite codes with their uses and states.
  Each code has Copy, and a code that works also has Copy join link. Its
  child pages are below.
- `app/operator/error` has the numbers that could not load, with Try
  again. Its `loading` variant has the page while it reads the numbers.

The child pages of `app/operator/user` follow. The first two were variants
of `app/operator/user` and kept their paths:

- `app/operator/user/suspend` has the question before a suspension, with
  the offer to disable the referral code of the user. Its `self` variant
  has the warning before the operator suspends their own account. The
  variant moved from `app/operator/user/self` and declares `movedFrom`.
- `app/operator/user/suspended` has the suspended user, whose referral
  code the suspension disabled. Its `lift` variant has the question before
  the lift. The variant moved from `app/operator/user/lift` and declares
  `movedFrom`.
- `app/operator/user/waiting` has a person on the waitlist, with Approve
  beside Suspend user. Its variants have the question before Approve, the
  page after the approval with its email not sent yet, and with its email
  sent. Its `approve-no-email` variant has the question for a person whose
  GitHub account has no verified email: no email goes out, and the person
  sees the app access at their next visit.
- `app/operator/user/access` has a user who came in with an invite code.
  Its child pages were its variants and kept their paths. They have a user
  who came in with a referral code, with an org invitation, which names
  the org and the admin who sent it, and as an operator. `email-not-sent`
  has an approval whose email never went, because the GitHub account has
  no verified email. `open-sign-up` has a user who came in by open
  sign-up, with the operator who turned off the waitlist. Its `waited`
  variant has a person who waited and got app access at their next visit.
- `app/operator/user/referral` has the question before the disable of a
  referral code. Its `disabled` variant has the disabled code.

The child pages of `app/operator/codes`:

- `app/operator/codes/new` has New code with its label and use limit. Its
  `made` variant has the new code at the top of the list.
- `app/operator/codes/disable` has the question before the disable of an
  invite code. Its `disabled` variant has the disabled code in the list.
- `app/operator/codes/search` has a search that finds an invite code by
  its text. The search also takes the label of an invite code and the
  GitHub login of the owner of a referral code. Its variants have a search
  that finds the referral code of a user, and a search with no match.
- `app/operator/codes/pause` has the question before Pause sign-ups. Its
  `waitlist-off` variant has the same question while the waitlist is off,
  and its links keep the waitlist off. Its other variants have the Invite
  codes tab while sign-ups are paused, with Resume sign-ups, and the same
  notice on the Waitlist and the Overview.
  The question and the notice say that new people wait, also while the
  waitlist is off.
- `app/operator/codes/waitlist-off` has the question before Turn off the
  waitlist, with the number of people who wait. Its `turned-off` variant
  has the Invite codes tab while the waitlist is off: the notice with Turn
  on the waitlist, above a Sign-ups box that says Open. Its `waitlist` and
  `overview` variants have the same notice on those tabs. Its `paused`
  variant has both notices while sign-ups are paused, the pause first.
