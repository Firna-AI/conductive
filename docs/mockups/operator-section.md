# The operator section

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.
[The catalogue](catalogue.md) lists each path of the catalogue and what it
shows. This page gives the pages of the operator section, at
`app/operator`. [Operator section](../protocol/operator-section.md) states
their requirements.

`app/operator` shows the Overview tab of the operator, the person who runs
the app for everyone, from decision 142. It holds live counts across every
org, as decision 144 chose for now. A line under the users counts the
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
- `app/operator/codes` has the Invite codes tab: Sign-ups with Pause
  sign-ups, the search, and the invite codes with their uses and states.
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
  Its variants have a user who came in with a referral code, with an org
  invitation, which names the org and the admin who sent it, and as an
  operator. Its `email-not-sent` variant has an approval whose email never
  went, because the GitHub account has no verified email.
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
  variants have the Invite codes tab while sign-ups are paused, with
  Resume sign-ups, and the same notice on the Waitlist and the Overview.
