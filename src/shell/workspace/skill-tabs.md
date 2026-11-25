# The skill tabs

This page is part of the [workspace screen](README.md) guide. It gives the
skill tabs of the centre column: their place in the saved view, their
address, the page of a skill and its read, and the chips that open them.
[Skill tabs](../../../docs/protocol/skill-tabs.md) states the
requirements. The visual spec is `app/skill-mentions/tab` of the
[mockup catalogue](../../../docs/mockups/README.md). Each path is relative
to `src/shell/workspace/`, the folder of this guide.

## The tab in the saved view

- The kept chat keeps each skill tab in the row of its view, as a
  `SkillTab` of `src/shared/workspace-view.ts`, so the tab row orders,
  moves, and closes it as each other tab. The view route keeps the skill
  tabs in `skillTabs`, `activeSkill`, and `temporarySkill`, as the
  [tab row](../../chat/tab-row.md) guide says.
- The temporary tab is one tab for the files, the diffs, and the skills.
  `withActiveTab` of `files/view-tabs.ts` opens a file, a diff, or a skill
  with no tab in the place of the temporary tab of any of these kinds.
- A record of another repository closes the file and diff tabs, and keeps
  each skill tab, as the Worker does.

## The address and the navigation

- `skills/skill-address.ts` reads and writes the address
  `skills/<agent>/<name>` after the workspace. A link encodes a `/` of the
  name, and an address that a person types can keep it. A browser drops a
  part `.` or `..` of an address and reads `%2E` as a dot, so a name of
  only `~` signs and one or two dots gets one more `~` in front: `.` is
  `~.`, and `~.` is `~~.`.
- `skills/skill-navigation.ts` holds `useSkillNavigation`. Its `open`
  saves the tab as the open and active tab, then moves the address, as a
  press on a skill chip does. Its `keep` keeps the temporary tab, as a
  double-click on the tab and Keep open of its tab menu do.
  `useOpenSkillTab` opens the tab of a page that shows from an address,
  such as after Back, a reload, or a link.
- `files/chat-files.tsx` gives the chat the navigation as `skillTabs` of
  its mentions, for the skill chips, as
  [Chat integration](../../chat/integration.md) says.
- `ResumeOnTabOpen` resumes a stopped sandbox at each visit that opens a
  skill tab, and `RestoreShownTab` shows a saved active skill tab again at
  a return to the address of the workspace alone.

## The tab and its page

- `skills/skill-centre.tsx` holds `useSkillCentre`, which `ChatArea.tsx`
  calls. On desktop it draws each skill tab of the row with
  `SkillTabItem`, and the page of the tab of the address in place of the
  chat. Close of the shown tab shows the next skill tab, else the one
  before, else the chat with its session. The key of Close tab closes the
  shown tab, and Escape closes it while it is the temporary tab. The tab
  menu has Keep open on the temporary tab, the moves, and the closes, and
  no Copy path.
- Each skill tab keeps its view, Preview or Source, in `skills/skill-views.ts`,
  and its scroll offset of each view in the kept files, until it closes.
  `ForgetClosedSkillViews` of the same file follows the saved view in
  `screen-addons.tsx`, in each layout, so a tab that closes while a phone
  shows Files forgets its view too.
- `skills/SkillTabPage.tsx` gives `SkillPage` of the
  [Files screens](../../files/screens.md) the read of the text, the
  description from the list of the agent of the tab, and the view. On a
  phone, the Files part shows the page at the address of a skill, with the
  way back to All files, and `phoneView` of `WorkspaceColumns.tsx` shows
  the Files tab.
- `skills/skill-read.ts` holds `useSkillRead`. It reads the text with the
  fetch of the org, at each show of the page, when the sandbox runs again,
  at Try again, and after each skills report of `WorkspaceSkills` while
  the page shows. It uses the `ResourceLoader` of the Files screens, so a
  new read keeps the text that shows, and a reply for another skill never
  shows. A read of a text that shows, such as after a skills report, also
  keeps the text when it fails with a cause that can pass: a reply with a
  5xx status, such as `computer_stopped`, or a fetch that failed. Without
  a text that shows, and for a reply with a 4xx status, the page shows the
  notice of the failure. `skill_not_found`, `skill_too_large`, and
  `skill_reads_unsupported` show their notices. `computer_stopped` and
  `computer_starting` show the wait of the read, because the workspace
  then shows the state of its sandbox. Each other failure shows the
  failure with Try again.
- While the sandbox does not run, the page reads nothing, and
  `pagePlaceholder` of `files/page-placeholder.tsx` shows the state of the
  sandbox in place of the text, as for a file tab. A page that shows its
  text keeps it while the sandbox is stopped or starts.

## Development

`npm run dev` with `?skillChips=1` gives `checkout-autocomplete` a skills
report and two sent messages with skill chips, and `?skillRead=<state>`
gives each read a notice, as [The development fake](../../app/dev-fake.md)
says.

## Tests

`skills/SkillTabs.test.tsx` and `skills/SkillTabNotices.test.tsx` mount
the whole app over the fake API. They press a sent skill chip and check
the temporary tab, its address, its header, the Markdown body without the
front matter, Source, the keeps, the tab menu, Escape, the save of the
skill fields, and a press on a file that replaces the tab. They also
check each notice, Try again, the read after a skills report, the text
that a failed read after a report keeps, the Resume of a stopped sandbox,
the page on a phone, and the view of a skill that opens again on a phone
after a diff replaced its tab. `skills/skill-address.test.ts` reads the
addresses that `skillHref` writes, also of names with dots.
`skills/skill-test-kit.ts` serves the skills report, a sent message with
a skill chip, and the reads, also a read whose connection drops.
