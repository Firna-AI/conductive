# The design of the operator section

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
tabs, the tables, the long runs, the Waitlist tab, the codes, and the
approval email of the operator section. It also gives Suspend, Lift, and
Approve, the daily chart, the notice of a pause, the waitlist switch, the
Providers tab, the account of each org, the switch of that account, and
the account choice of an operator on Create org.

- The operator section has the tabs Overview, Orgs, Users, Waitlist,
  Invite codes, Providers, and Settings, from `OperatorPage` in
  `src/components/operator/`. On a phone the seven tabs keep one line while
  they fit, with the `flow` mode of `LinkTabs`. When they do not fit, the
  last tabs move to a second line, so that every tab shows. A phone of
  390 px puts Providers and Settings on the second line. The Stop time
  box of the Settings tab uses the segmented control of `@firna/ui`,
  which wraps its five choices on a phone. The overview uses
  the stat tiles, the line chart, the table, and the skeletons of
  `@firna/ui`. A view runs no script, so the chart keeps the width that the
  page column gives it. The workspaces by state reuse `StatusGlyph`, the mark of the header.
  Removed follows Archived with the same mark, because a removed workspace
  stays archived. A line
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
- Long runs on the Overview is a table like the largest orgs, without an
  org mark, so a narrow window keeps the org name and its state. The
  login of the owner has the workspace number under it, such as `W-12`,
  in the monospace font of the label in the header. A cloud computer ID
  shows in the monospace font with Copy. A row without one has a dash,
  which screen readers hear as "No cloud computer ID yet". The run length
  has the state mark of the header under it: the glyph and its word. A
  phone keeps the org, and the run length with the state mark.
- An owner whom an operator suspended has the Suspended mark under the
  login, as a suspended org has under its name. The workspace number then
  moves to a third line. A phone leaves out the owner, so it adds a line
  under the org with the login and the mark. The login keeps the mark
  from reading as a mark of the org.
- A run length gives its two largest units, such as 3d 4h or 5h 12m, as
  the lengths of the chat do. A run under an hour gives its minutes, and
  a run under a minute its seconds. The last activity uses the words of
  the app for a past time: 3 minutes ago, Yesterday, or 5 Nov. The words
  and the format live in
  [`src/ui/components/operator/longRunsCopy.ts`](../../src/ui/components/operator/longRunsCopy.ts),
  which the app and the mockups both import.
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
  access, the codes, the pause, and the waitlist switch in `accessCopy.ts`
  and `codeCopy.ts`. The app and the mockups both import these modules
  from [`src/ui/components/operator/`](../../src/ui/components/operator/).
  They also import `WorkspaceStates` and `DailyChart` from there. Each
  text of an org takes its deletion, so the questions and the notices of
  a deleted org promise nothing that its members cannot open, and nothing
  that a lift does not give back. The Suspend question of a user offers to
  disable their referral code with `CheckOption` from
  `src/components/common/`, the checkbox of the browser in the accent
  colour, because `@firna/ui` has no checkbox.
- `DailyChart` names each point and each label of its axis with the UTC
  day, such as "10 Oct", in British English, so that no time zone and no
  locale of a browser or of the build machine changes a date. Its axis has
  one slot for each day and shows every few labels, so the labels leave
  out the year. Its own table lists the UTC days, because the table of the
  Firna chart cannot name its first column.
- The Sign-ups box at the top of the Invite codes tab names the state of
  sign-ups. While the waitlist is on, it says Waitlist on, with Turn off
  the waitlist beside Pause sign-ups. While the waitlist is off,
  `WaitlistOffNotice` tops each tab with Turn on the waitlist, and the box
  says Open with Pause sign-ups. So Open shows only during open sign-up.
- While sign-ups are paused, `PauseNotice` tops each tab of the section,
  with Resume sign-ups, before the notice of the switch. On the Invite
  codes tab it takes the place of the whole Sign-ups box. Turn off the
  waitlist asks first, and Turn on the waitlist and Resume sign-ups act at
  once.
- The Providers tab holds the weights of new orgs in its New orgs box: one
  slider between `boat` and `e2b`, from `WeightSlider`. `@firna/ui` has no
  slider, so it draws the range control of the browser in the accent
  colour, as `CheckOption` draws the checkbox. The first account fills the
  track from the left up to the thumb, and the second account gets the
  rest. Each end names its account by its ID in the monospace font, with
  its share in large tabular figures. Save weights sits at the bottom of
  the box. It is on only while the slider holds weights that are not
  saved, and it asks no question. A line under the slider gives the last
  change, with its time and its operator, as the notice of a pause does.
  A failed save keeps the moved weights and shows its error under the
  slider, as a login share does. With one account only, a line in place of
  the slider says that it gets every new org.
- With three or more accounts, one slider does not fit, so each account
  gets a whole-percent field in a row with its ID, from `WeightFields`. A
  line under the fields gives the total. While the total is not 100%, the
  line says that Save weights needs 100%, in the deep amber of a warning,
  and Save weights stays off. `WeightSlider`, `WeightFields`, and
  `AccountChoice` take `disabled`, so the app can turn them off while a
  save or a create runs. The options of `AccountChoice` wrap onto more
  lines when many accounts do not fit.
- Orgs by account, under the weights, lists each account by its ID with
  its count of orgs, in rows as the workspaces by state have, from
  `AccountCounts`.
- The Orgs tab gives the account of each org by its ID, in an Account
  column on desktop. A phone leaves out the column, so a second line under
  the name says "Runs on" and the ID. The Provider account box of the page
  of an org gives it as Account. `AccountId` in `directory.tsx` draws an
  ID in the monospace font.
- The Provider account box sits between Details and Workspaces on the page
  of an org, from `AccountSection` in `src/components/operator/`. Its rows
  give the account, then, for the newest switch that did not change it,
  Switch to with the new account and the start of the switch, and Switch
  build with the state of that build and a muted line that says why. A
  waiting build shows an hourglass, a build that runs a spinner, and a
  failed build the alert mark in red, as `StatusText` draws them. After a
  switch, Last switch gives the old account, the time when the account
  changed, and the operator. While the org has workspaces on more than one
  account, Workspaces by account lists each account with its count, in the
  rows of Orgs by account. The box shows the state of a switch build and
  never its log, because the section shows no file or chat.
- Switch account sits at the bottom of the box. It asks first, with
  `SwitchDialog` in `SwitchDialogs.tsx`. With one other configured account,
  the question names it. With more, a segmented control offers each
  account other than the current one by its ID, as `AccountChoice` does,
  and the title and the words follow the choice. When the switch build must
  wait for a build of the org, for Lift, or for an admin who is not
  suspended, the question says so. A build of the org that runs gets the
  offer to end it, a `CheckOption` that is off by default. After a failed
  switch build, Switch account takes the primary colour. While a switch
  waits or builds, Stop switch takes its place, and asks first with
  `StopSwitchDialog`. While a switch waits for Lift, the question of Lift
  adds that Lift starts the switch build. The words live in
  [`src/ui/components/operator/switchCopy.ts`](../../src/ui/components/operator/switchCopy.ts),
  which the app and the mockups both import. A sentence names an account
  by its ID in plain text, as the questions of Suspend and Lift do.
- Create org of an operator has Provider account under the repositories:
  a segmented control of By weights, the default, and each configured
  account by its ID, from `AccountChoice`. Its hint says that only
  operators see it, and that an operator can switch the account later, on
  the page of the org.
  Create org in the rail and in the org switcher of an operator opens this
  form. Nobody else sees the choice.
- Operator screens name an account only by its ID, such as `boat`, from
  e2b decision 221. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. The words of the tab, the account of an org, and the
  choice live in
  [`src/ui/components/operator/providerCopy.ts`](../../src/ui/components/operator/providerCopy.ts).
  The app and the mockups both import it, as they import `WeightSlider`,
  `WeightFields`, `AccountCounts`, and `AccountChoice` beside it.
