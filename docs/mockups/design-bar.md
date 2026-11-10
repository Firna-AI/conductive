# The design of the pull request bar

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the pull
request bar: its one main action in each state, the line under the bar,
the actions on top of the Checks tab of a phone, and Continue.

- The pull request bar shows one main action in each state, beside its
  links to GitHub, from decisions 220 to 228. `barModel.ts` in
  `src/components/workspace/` holds the rule: the action of each state, with
  the local work, the GitHub access of the viewer, and an action of the app
  that runs, and Merge needs a merge method. `barCopy.ts` beside it holds
  the labels, the messages under the bar, and the fixed prompts of the agent
  actions. Address review names "A reviewer" when GitHub names no login of
  a reviewer. `barIcons.ts` holds the icon of each agent action. They import
  no fixture, so the app uses them too.
  - The main action takes the primary tone. An agent action sends its fixed
    prompt, so the chat shows it as a message of the member who clicked.
    Merge names its method, such as "Squash and merge", and a spinner shows
    while the merge or Continue runs.
  - A refusal of GitHub, a Continue that stopped, and the wait of Continue
    for a turn show as one line under the bar. The line takes the tint of
    its state, and its bottom border stays neutral.
  - On a phone the row opens the Checks tab. `ChecksActions` in
    `BarActions.tsx` draws the actions, the line, and the link to GitHub at
    the top of that tab, at touch size.
  - `ContinueDialog` asks before Continue when the sandbox has local work.
    `LocalWorkList` in `src/components/workspace/` lists that work for the
    app and the mockups: each changed file that is not committed, and the
    commits that no remote branch holds. `ContinuedLine` in
    `src/components/chat/` draws the note of Continue in each session,
    centred and muted, as the first line of a linked session. It takes no
    fixtures.
