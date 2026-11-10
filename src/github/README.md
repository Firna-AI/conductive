# GitHub banner UI

These parts show the GitHub state of a workspace branch: the pull request bar
of the right column, the compact pull request row of a phone, and the Checks
tab. Each action links to GitHub. [GitHub banner](../../docs/protocol/github-banner.md)
states the requirements, and the mockups under `app/banner` draw them.

The parts read the shared contracts in `src/shared/github.ts` and
`src/shared/events.ts`. The workspace screen mounts them with one store for
the bar or the row and the Checks tab, as
[the GitHub part](../shell/workspace/README.md#the-github-part) says.

## Use the parts in the app

```tsx
const github = useGitHubState({ orgId, workspaceId }, { fetch, subscribe, delay })

// Desktop: the top of the right column, and the Checks tab.
<PullRequestBar
  archiving={archiving}
  github={github}
  now={now}
  onArchive={archive}
  viewer={{ id: user.id, role: org.role }}
  workspace={workspace}
/>
<ChecksList github={github} />

// Phone: the row under the workspace header, and the Checks tab.
<PullRequestRow checksHref={checksHref} github={github} onOpenChecks={openChecks} />
<ChecksList github={github} />
```

- `fetch` is the browser's `fetch`. The parts read the banner and the checks
  routes of `githubPaths`, with the session cookie of the app.
- `subscribe(afterEventNumber, listener)` opens the event stream of the
  workspace after `afterEventNumber`, and returns a function that closes it.
  The stream sends the stored history first, in one or more `history` pages,
  then live events, as `WorkspaceSocketMessage` says. The pages of one replay
  share one cutoff, and a page can leave out event numbers. The store holds
  a live event that comes before the final page, and applies it after that
  page. The fake API's `server.events.subscribe` has this shape. The
  workspace screen gives the GitHub events of the ordered stream of the
  workspace, each checked with the readers of the replies, as live messages
  with no history, because the store reads the current state when it
  connects.
- `delay` is `AppServices.delay`, the timer of the app. The store waits with
  it before each [backup read](#backup-reads). The development page gives
  `browserDelay`.
- Keep `fetch`, `subscribe`, and `delay` stable, for example with
  `useCallback`. A new function connects the same store again and reloads.
- `now` is the clock of the relative times, such as "2h ago" after a merge.
  Give it a value that changes each minute.
- After a merge, the bar shows Archive only to the workspace owner and the
  admins. `onArchive` runs the app's Archive, which archives at once with
  one request, and `archiving` makes the button busy while it runs. The
  bar itself sends nothing.
- `checksHref` is the app address of the Checks tab, because tabs are links.
  `onOpenChecks` lets the app's router open the tab in place.
- A failed load shows one Try again on each screen: in the bar on desktop,
  and in the row on a phone. The Checks tab names the error without its own
  button, so keep the bar or the row on the screen with the Checks tab.
- A narrow bar or row cuts its words with an ellipsis, and the detail gives
  up its width first. The actions keep their size, and the page keeps the
  whole words.

The app shell provides the rest of the design:

- the `--ui-*` design tokens and the Firna theme of the colour scheme, as
  `docs/mockups/src/theme.ts` makes them
- a right column that is a size container (`container-type: inline-size`), so
  that a narrow column drops the detail and the link labels of the bar
- `--ui-touch-min: 44px` on a phone, as the mockups set it. The phone row is
  at least 44 px high also without it.

## Order of updates

The store compares no times. It rests on these requirements of the protocol:

- A tab gets the stored history first, then the live events, as
  [Chat and events](../../docs/protocol/chat-and-events.md#events) says.
- A read returns the current state of the branch, and the Worker pushes each
  new state to the open tabs, as
  [GitHub banner](../../docs/protocol/github-banner.md#state-of-a-branch) says.

The store applies them in this way:

- Events apply in the order of their numbers. The store skips an event of
  another workspace, a repeated event, and an event older than the last one.
- The store keeps replay progress separate from its resume position. A
  reconnect starts after the last complete replay or handled live event.
  It receives unfinished pages again, so no held GitHub state gets lost.
- `GitHubStore.connect()` starts the first read and the event subscription.
  The first read starts even when the history never comes.
  `useGitHubState` connects the store and subscribes the views through
  `useWorkspaceStore` in `src/app/workspace-store.ts`.
- A live GitHub event shows at once, and it cancels a read that runs.
- A history that comes before a read shows at once. The reply of the read
  then replaces it, because the read returns the current state.
- A history that comes during a read, or after its reply shows, has no known
  order against that reply. When the two show different states, the store
  keeps what it shows and reads once more. Equal states need no read.
- Two states are equal when their banners, apart from `updatedAt`, and their
  checks, in GitHub's order, are equal. The order of keys does not count.
- Each workspace has its own store. A store that disconnected ignores a reply
  that arrives later.
- A failed load shows an error with Try again. A state that already shows
  stays, because GitHub events keep it current.

## Backup reads

GitHub events keep the state current. A change that no webhook names, or a
lost webhook, needs a fresh read. So the store reads again while it is
connected:

- The store waits five minutes after a read ends, then reads again. The
  wait is a choice of the app, not a product limit.
- A live event that cancels a read starts the wait too. A live event keeps
  a wait that runs, so events never put off a backup read.
- A backup read never overlaps another read, because each read stops the
  wait.
- A backup read shows no loading. When it fails, the state or the error that
  shows stays, and Try again still reads.
- A disconnect stops the wait.

## Development page

Run `npm run dev`, and open `http://127.0.0.1:5173/src/github/dev/`. The page
uses the [fake API](../test-support/README.md) and `FAKE_TIME`. No app route
mounts it, and the production build leaves it out.

- The address keeps the options, such as
  `?state=checks-failed&scheme=light&viewer=member&github=error`.
- `state` is one of the eleven banner states. `viewer` is `owner`, `admin`, or
  `member`. `github` is `normal`, `slow`, or `error`.
- `sample` changes the fake data to other valid data: `every-check` gives
  one check in each of the nine states, `no-checks` a pull request without
  checks, `no-create-link` a branch without a create link, and `long-base` a
  long target branch. `fake`, the default, keeps the data of the fake API.
  The live events of a sample carry the same data as its replies.
- Send gives a live `github.updated` event. With `github=error`, "Let GitHub
  answer" makes the next Try again succeed.
- The local Worker serves the page. [Get started](../../README.md#get-started)
  gives its local setup.

## Key code

- `useGitHubState.ts`: the hook that gives one workspace its store, through
  the shared `useWorkspaceStore`.
- `githubStore.ts`: starts the first read on connection, then merges reads,
  the event history, and live events in order. It also runs the backup
  reads.
- `useGitHubState.test.tsx`: mounts a hook probe with the real store and fake
  API in happy-dom. It checks the first read, live events, workspace switches,
  and retry after a failed first read through an unbound callback. After a
  switch, it also checks that only the new workspace gets a backup read.
- `freshReads.test.ts`: drives the store with `ManualDelay` on the fake API,
  in Node. It checks that a backup read shows a new state without a GitHub
  event. It checks that a failed backup read keeps the shown state or error.
  It also checks that a disconnect stops the timer, and how other reads and
  live events stop, keep, or start it.
- `PullRequestActions.test.tsx`: mounts the bar and row in happy-dom. It
  clicks the retry, Archive, and Checks actions and checks their callbacks.
  The other view tests keep their static markup checks in Node.
- [Shared state comparison](../shared/github-state.ts) compares two GitHub states, without the banner time.
- `githubClient.ts` and `githubParse.ts`: read the two API replies, and check
  them against the contract.
- `PullRequestBar.tsx`, `PullRequestRow.tsx`, and `ChecksList.tsx`: the views.
- `bannerStatus.ts` and `checkStatus.ts`: the words, the icons, and the tints
  of each state.
- `dev/`: the development page.

See [the shared contracts](../shared/README.md).
