# Terminal history scrolling

Status: Active. On branch `calummoore/terminal-history-scrolling-fix`, no pull request yet. The pull request that completes the work deletes this plan.

The user asked to fix scrolling through terminal history on 9 November 2026.
The terminal uses xterm.js in the browser and one persistent tmux shell in
each workspace. tmux uses the alternate screen and keeps the output history.
Its default mouse setting is off. xterm.js therefore sends arrow keys when
the user scrolls, which recalls shell commands instead of showing output.

Agent design call, 9 November 2026: enable tmux mouse support when the shell
server starts. Use the existing text transport for its SGR mouse reports.
Keep the persistent shell, the default history limit, and the default key
bindings. A browser history replacement would lose server history on each
reconnect. A custom wheel handler would duplicate tmux's existing behavior.
This repairs the requested behavior and requires no protocol change.

Contract owners:

- [Workspace tools](../docs/protocol/workspace-tools.md#terminal).
- [Terminal backend](../worker/terminal/README.md).
- [Terminal screen](../src/terminal/README.md).

## Milestone 1: Documentation

Depends on: none

- [ ] Update the terminal backend README for the mouse setting and its image
      rollout requirements.
- [ ] Check whether the screen README needs a correction.

## Milestone 2: Terminal scrolling

Depends on: 1

- [ ] Extend the installed shell server test to require mouse support.
      See its assertion fail before the fix.
- [ ] Enable mouse support in the shell server startup command.
- [ ] Verify real tmux scrolling through xterm.js with mouse input.
      Check scrolling up, scrolling down, and reconnecting to the same shell.

## Milestone 3: Verification and delivery

Depends on: 1, 2

- [ ] Run the targeted tests and the complete gate.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the full branch against `origin/main` with the
      `implementation-review` skill. Apply its fix rule and re-review once
      when needed.
- [ ] Delete this plan after its implementation and review complete.
- [ ] Open the pull request with the design call and rollout requirements.
