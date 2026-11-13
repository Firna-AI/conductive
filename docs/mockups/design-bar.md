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
  - On a tinted bar the main action takes the tint of the bar, so the
    button matches it: green, amber, red, or purple. A merged pull request
    tints its bar and its phone row purple, so Continue is purple too. The
    same button keeps that tint at the top of the Checks tab of a phone. On
    a bar without a tint, such as the bar without a pull request, the main
    action takes the outline tone of Archive, so the bar shows no primary
    fill. The user chose this on 10 and 11 November 2026. `TintedTheme` in
    `src/components/common/tint.tsx` gives the primary tone of Firna the
    fill of the tint, a deeper fill on hover, and a white label, from the
    `successFill`, `warningFill`, `dangerFill`, `mergedFill`, and `onFill`
    tokens. `barTint` in `prStatus.ts` gives the tint of each state.
  - An agent action sends its fixed prompt, so the chat shows it as a
    message of the member who clicked. Merge names its method, such as
    "Squash and merge", and a spinner shows while the merge or Continue
    runs.
  - On desktop, the tooltip of each button that takes a click, and of each
    link to the pull request, gives its label and the key of its command,
    such as "Create PR (⇧⌘P)" or "Open pull request #482 on GitHub (⇧⌘G)",
    from decision 199. A busy or disabled button and a phone show no key.
    `ShortcutTip` in `src/components/common/` gives the tooltip.
  - The number of a pull request opens it on GitHub, with an arrow after a
    divider. `PullRequestNumber` in `barParts.tsx` draws it, so the bar of a
    pull request has no other link to it. The row of a phone is one link to
    the Checks tab, so its number stays plain, and the top of that tab keeps
    Open on GitHub.
  - A refusal of GitHub, a Continue that stopped, the wait of Continue for
    a turn, and a base that moved to the default branch show as one line
    under the bar. The line takes the tint of its state, and its bottom
    border stays neutral.
  - When GitHub no longer has the stored base of a workspace, the Worker
    moves the base to the default branch (decision 294). The bar then names
    the default branch, and its line says which branch GitHub no longer
    has. That line is a status in the neutral tone, with the info icon, and
    it shows until a pull request opens. The fact `baseMoved` of
    `barModel.ts` chooses it, and `barCopy.ts` gives its words. On a phone
    it stands alone at the top of the Checks tab, because a bar without an
    action shows no buttons there.
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
