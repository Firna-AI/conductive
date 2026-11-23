# Operator key code

This guide belongs to [the operator section](README.md). It names the
files, the types, and the functions of the operator section that a reader
opens first. Each path is relative to `src/shell/operator/`, the folder of
this guide.

- `OperatorRoutes.tsx`: the access check, the frames, the page of each
  address, and the pause and the switch that each page reads when it
  opens.
- `OperatorPage.tsx`: the header, the tabs, and the notices of the pause
  and of the switch of each page.
- `OverviewTab.tsx`, `OverviewParts.tsx`, and `OverviewLoading.tsx`: the
  Overview, its tiles with the count of the people who wait, largest orgs,
  and placeholders. Its charts are `DailyChart` of
  `src/ui/components/operator/`.
- `LongRuns.tsx`: Long runs, with its columns, which the placeholders
  share.
- `useCopyToast.ts`: Copy of a value, such as a code or a cloud computer
  ID, with its toast.
- `OrgsTab.tsx`, `UsersTab.tsx`, `DirectoryList.tsx`, and
  `SearchField.tsx`: the searches and their rows.
- `WaitlistTab.tsx` and `ApproveDialog.tsx`: the Waitlist tab, Approve,
  and its question.
- `CodesTab.tsx`, `CodeParts.tsx`, and `CodeDialogs.tsx`: the Invite codes
  tab, a code with Copy and Copy join link, New code, and Disable.
- `SignUpsBox.tsx`: the Sign-ups box with Pause sign-ups and Turn off the
  waitlist, its placeholders and failures, and their questions.
- `PauseParts.tsx` and `pause-context.ts`: the notice of the pause with
  Resume sign-ups, and the question of Pause sign-ups.
- `SwitchParts.tsx` and `switch-context.ts`: the notice of the switch with
  Turn on the waitlist, and the question of Turn off the waitlist.
- `ProvidersTab.tsx` and `provider-weights.ts`: the Providers tab, its
  weights that the operator changed, and Save weights.
  `../orgs/AccountField.tsx`: the account choice of Create org.
- `SettingsTab.tsx`: the Settings tab, with the Stop time box and Save
  stop time.
- `OrgPage.tsx`, `OrgDetails.tsx`, `UserPage.tsx`, `UserDetails.tsx`,
  `AccessSections.tsx`, `TargetPage.tsx`, and `TargetDialogs.tsx`: the
  pages, the app access of a user with each way in, also an open sign-up
  with its operator, the referral code of a user, Suspend with its offer,
  Lift, and their questions. `useQuestion.ts`: the write of a question,
  which closes the question after a write that worked.
  `CheckOption.tsx`: the checkbox of the offer.
- `AccountBox.tsx`, `AccountSwitchDialogs.tsx`, and `account-switch.ts`:
  the Provider account box of the page of an org, Switch account and Stop
  switch with their questions, and the words of each state of a switch
  from the fields of the reply.
- `TargetParts.tsx` and `format.ts`: the rows of users and orgs, the links
  to a GitHub profile, and the formats of counts, days, and the age of a
  GitHub account.
- `../../app/operator-read.ts`: `OperatorRead`, the read of the Overview
  and of a page, and the refusal of a person who is not an operator. It
  is the `PageRead` of `../../app/page-read.ts`, which the Stats tab of
  the account also uses.
- `../../app/operator-directory.ts`: `OperatorDirectory`, a search, its
  pages, Show more, a new read after a write, and `write`, a write that
  changes one row, such as Approve or Disable. It also gives the count
  that leaves out the approved rows. `DirectoryList` takes the key of a
  row from it. `../../app/operator-row-changes.ts`: `RowChanges`, the
  changes that the writes confirmed, by the key of the row.
- `../../app/operator-target.ts`: `OperatorTarget`, a page with Suspend
  and Lift. `../../app/operator-org-switch.ts`: `OperatorOrgSwitch`,
  Switch account and Stop switch of an org.
- `../../app/operator-pause.ts`: `OperatorPause`, the pause with Pause and
  Resume sign-ups. `../../app/operator-switch.ts`: `OperatorSwitch`, the
  waitlist switch with Turn off and Turn on the waitlist.
  `../../app/operator-access.ts`: Approve, New code, and Disable.
  `../../app/operator-providers.ts`: `OperatorProviders`, the provider
  accounts and the save of their weights.
  `../../app/operator-idle-stop.ts`: `OperatorIdleStop`, the stop time and
  its save.
- `../../app/api/read-operator.ts`, `read-operator-pages.ts`,
  `read-operator-providers.ts`, `read-operator-idle-stop.ts`,
  `read-operator-runs.ts`, `read-operator-switch.ts`, and
  `read-operator-waitlist.ts`: the readers of the replies.
