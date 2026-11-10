# The design of the operator section

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
tabs, the tables, the Waitlist tab, the codes, and the approval email of
the operator section. It also gives Suspend, Lift, and Approve, the daily
chart, and the notice of a pause.

- The operator section has the tabs Overview, Orgs, Users, Waitlist, and
  Invite codes, from `OperatorPage` in `src/components/operator/`. On a
  phone the five tabs keep one line while they fit, with the `flow` mode
  of `LinkTabs`. On a narrower phone the last tabs move to a second line,
  so that every tab shows. The overview uses
  the stat tiles, the line chart, the table, and the skeletons of
  `@firna/ui`. A view runs no script, so the chart keeps the width that the
  page column gives it. The workspaces by state reuse `StatusGlyph`, the mark of the header. A line
  under the users tile counts the people on the waitlist and opens the
  Waitlist tab.
- A table of the operator keeps fewer columns on a phone, so that each
  name keeps one line. The line under a name gives what a search found,
  when it is not the name, and the state of a suspended or deleted target,
  or Waiting for a person on the waitlist, with a dot between them. A phone
  can add a second line for a column that it leaves out, such as the age
  of a GitHub account. A column of days fits a day of another year, such
  as 30 Sept 2026, on one line. A person shows on a disc and an org on a
  square, with `PersonAvatar` and `InitialsTile` from
  `src/components/orgs/`.
- The Waitlist tab shows no picture. Each login opens the GitHub profile in
  a new tab, with a small mark for it. After Approve, the row keeps its
  place with Approved and the state of its email, in plain words.
- A code shows in the monospace font, with Copy beside it. A code that
  still works also has Copy join link, for a link such as
  `https://app.conductive.build/join/<code>` on the domain of the app.
  Disable on a row is a quiet icon, as in the member list of an org. A
  code that no longer works keeps the place of Disable empty.
- The Approval email row of a user page gives the state of the email. A
  state of an email that did not go has a short muted line with the
  reason. No state has an action, because the person keeps app access.
- Suspend and Lift sit in the header of the page of an org or a user, and
  in its footer on a phone. A person who waits also has Approve there. Each
  asks first, with `ConfirmDialog`. The words of the questions and the
  notices live in `operatorCopy.ts`, and those of the waitlist, the app
  access, the codes, and the pause in `accessCopy.ts` and `codeCopy.ts`.
  These modules import no fixture, so the app uses them too. So do
  `WorkspaceStates` and `DailyChart`. Each text of an
  org takes its deletion, so the questions and the notices of a deleted
  org promise nothing that its members cannot open, and nothing that a
  lift does not give back. The Suspend question of a user offers to
  disable their referral code with `CheckOption` from
  `src/components/common/`, the checkbox of the browser in the accent
  colour, because `@firna/ui` has no checkbox.
- `DailyChart` names each point and each label of its axis with the UTC
  day, such as "10 Oct", in British English, so that no time zone and no
  locale of a browser or of the build machine changes a date. Its axis has
  one slot for each day and shows every few labels, so the labels leave
  out the year. Its own table lists the UTC days, because the table of the
  Firna chart cannot name its first column.
- While sign-ups are paused, `PauseNotice` tops each tab of the section,
  with Resume sign-ups. On the Invite codes tab it takes the place of the
  Sign-ups box, which holds Pause sign-ups while sign-ups are open.
