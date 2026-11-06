# GitHub banner UI

These parts show the GitHub state of a workspace branch: the pull request bar
of the right column, the compact pull request row of a phone, and the Checks
tab. Each action links to GitHub. [GitHub banner](../../docs/protocol/github-banner.md)
states the requirements, and the mockups under `app/banner` draw them.

The parts read the shared contracts in `src/shared/github.ts` and
`src/shared/events.ts`. Milestone 15i mounts them in the app shell.

## Use the parts in the app

```tsx
const github = useGitHubState({ orgId, workspaceId }, { fetch, subscribe })

// Desktop: the top of the right column, and the Checks tab.
<PullRequestBar
  github={github}
  now={now}
  onArchive={openArchive}
  viewer={{ id: user.id, role: org.role }}
  workspace={workspace}
/>
<ChecksList github={github} />

// Phone: the row under the workspace header, and the Checks tab.
<PullRequestRow checksHref={checksHref} github={github} onOpenChecks={openChecks} />
<ChecksList github={github} touch />
```

- `fetch` is the browser's `fetch`. The parts read the banner and the checks
  routes of `githubPaths`, with the session cookie of the app.
- `subscribe(afterEventNumber, listener)` opens the event stream of the
  workspace, and returns a function that closes it. The first message holds
  the stored history, and later messages hold live events, as
  `WorkspaceSocketMessage` says. The fake API's `server.events.subscribe` has
  this shape.
- Keep `fetch` and `subscribe` stable, for example with `useCallback`. A new
  function connects again and reloads.
- `now` is the clock of the relative times, such as "2h ago" after a merge.
  Give it a value that changes each minute.
- After a merge, the bar shows Archive only to the workspace owner and the
  admins (decision 42). `onArchive` opens the app's Archive flow, with its
  check for unpushed work. The bar itself archives nothing.
- `checksHref` is the app address of the Checks tab, because tabs are links.
  `onOpenChecks` lets the app's router open the tab in place.
- `touch` gives Try again the 44 px size of a phone.

The app shell provides the rest of the design:

- the `--ui-*` design tokens and the Firna theme of the colour scheme, as
  `docs/mockups/src/theme.ts` makes them
- a right column that is a size container (`container-type: inline-size`), so
  that a narrow column drops the detail and the link labels of the bar
- `--ui-touch-min: 44px` on a phone, as the mockups set it. The phone row is
  at least 44 px high also without it.

## Order of updates

- Events apply in the order of their numbers. The store skips an event of
  another workspace, a repeated event, and an event older than the last one.
- Each GitHub state carries the time of its banner, `banner.updatedAt`.
  Between an event and a load reply, the newer time wins. The stored history
  of a socket can arrive before, during, or after a load, so an older history
  never replaces a newer load.
- On a tie, a live event that arrives while a load runs wins over the reply
  of that load. A load reply wins a tie over history.
- These rules expect the Worker to give each new GitHub state of a branch a
  later `updatedAt`, and to push it to the open tabs as an event.
- Each workspace has its own store. A store that disconnected ignores a reply
  that arrives later.
- A failed load shows an error with Try again. A state that already shows
  stays, because GitHub events keep it current.

## Development page

Run `npm run dev`, and open `http://127.0.0.1:5173/src/github/dev/`. The page
uses the [fake API](../test-support/README.md) and `FAKE_TIME`. No app route
mounts it, and the production build leaves it out.

- The address keeps the options, such as
  `?state=checks-failed&scheme=light&viewer=member&github=error`.
- `state` is one of the ten banner states. `viewer` is `owner`, `admin`, or
  `member`. `github` is `normal`, `slow`, or `error`.
- Send gives a live `github.updated` event. With `github=error`, "Let GitHub
  answer" makes the next Try again succeed.
- The local Worker refuses the module requests of each page until
  `APP_ORIGIN` is `http://127.0.0.1:5173`. Set it in `.dev.vars`, as
  [Get started](../../README.md#get-started) says.

## Key code

- `useGitHubState.ts`: the hook that gives one workspace its store.
- `githubStore.ts`: merges loads, the event history, and live events in order.
- `githubClient.ts` and `githubParse.ts`: read the two API replies, and check
  them against the contract.
- `PullRequestBar.tsx`, `PullRequestRow.tsx`, and `ChecksList.tsx`: the views.
- `bannerStatus.ts` and `checkStatus.ts`: the words, the icons, and the tints
  of each state.
- `dev/`: the development page.

See [the shared contracts](../shared/README.md).
