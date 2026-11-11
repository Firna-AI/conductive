# Development page

This page is part of the [workspace screen](README.md) guide.

The development page runs the app shell with this workspace, its chat, and
its Files panel over the [fake API](../../test-support/README.md). It uses
React alone, with no Worker. The clock of the page stands still at
`FAKE_TIME`, so each stored age stays as drawn. The product build does not
include the page. From the repository root:

```sh
npx vite --config src/shell/workspace/dev/vite.config.js --port 5182
```

Then open `http://localhost:5182/src/shell/workspace/dev/`. The root of
this server is the repository root, so it also serves the
[Files development page](../../files/README.md#development) at
`/src/files/dev.html`. The address holds the state of the page:

| Parameter  | Values |
| ---------- | ------ |
| `repair`   | The failed repairs of the stored history: `name`, `start`, `all-files`, and `changes`, joined by commas. The default, `name,changes`, is the picture of `app/chat/lost-updates`. `none` stores none. |
| `viewport` | `desktop`, or `phone`. The default follows the window. |
| `scheme`   | `dark`, or `light`. The default follows the system. |
| `view`     | The tab of a phone: `files`, the default, or `chat`, `terminal`, or `preview`. `desktop` opens the hidden Desktop address, which shows Terminal. |
| `list`     | The list of the Files panel: `changes`, the default, or `all`, or `checks`. |
| `controls` | `off` hides the controls, as for a picture. |
| `start`    | Opens the new workspace of the create flow in a state of its first start, with its queued messages: `waiting`, `failed`, `time-limit`, or `retrying`, as `app/new-workspace` draws them. The app's own Files part then shows. |
| `viewer`   | `member` signs in Priya, a member who is not the owner. With `bar`, Priya has the member role, so she may not archive. |
| `bar`      | The GitHub state of the pull request bar, such as `ready-to-merge` or `merged`. The page then uses the app's own Files part, so a phone shows the actions at the top of Checks, and `list` names the list of a phone. |
| `turn`     | `running` starts the fake with a turn that runs. |
| `access`, `method`, `merge`, `work`, `continue` | How the actions of the bar end: the member's access, the merge method, the end of a merge, the local work, and the end of Continue. The first value of each is the default. |

For example, `?viewport=phone&view=terminal&repair=name,start,all-files,changes`
draws the bars of the name and the start steps on the Terminal tab of a
phone. The Files tab shows the notices of the two lists.

The controls have a row for each kind: Name, Start steps, All files, and
Changes.

- "Lose an update" sends the marker of a first loss, and nothing shows.
- "Lose its fresh report" sends the marker of a failed repair, and the
  notice shows.
- "Send a full report" clears the notice of that kind only.
- "Send a tree update" sends a tree delta, which leaves the notice of All
  files.
- "Open the workspace again" mounts a new workspace screen in the same
  tab. The kept notices start a new view, so a bar that Dismiss hid shows
  again, with no new read of the stored history.

Without `bar`, the page gives its own Files part, so the real chat fills
the centre. That part reads the kept files, which the workspace screen
connects. The other parts are the app's own: the tools, the pull request
bar, and the owner picker. The page gives the command palette of the app.
The fake has no terminal socket, so the terminal shows Disconnected.

With `bar`, `scenarioFetch` of `src/test-support/fake-bar-dev.ts` answers
the actions of the bar as the Worker does with its state. A completed merge
publishes the merged state. A Continue publishes the workspace on its new
branch, a note in each session, the changes report of the new branch, and
its GitHub state. A message shows the text that it sent. So the page runs
the real action state, the real chat send, and the real event pipeline.
For example, `?bar=merged&work=files&continue=question&viewer=member`
asks the question of Continue, and `?bar=checks-failed&work=none` offers
Fix checks.

Run the tests with `npm run test -- src/shell/workspace`.
