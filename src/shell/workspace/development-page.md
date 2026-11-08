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
| `view`     | The tab of a phone: `files`, the default, or `chat`, `terminal`, `preview`, or `desktop`. |
| `list`     | The list of the Files panel: `changes`, the default, or `all`, or `checks`. |
| `controls` | `off` hides the controls, as for a picture. |

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

The page gives its own Files part, so the real chat fills the centre.
`dev/main.tsx` makes the store of that part in a stable `create`, and
`DevPage` connects it through `useWorkspaceStore`. The other parts are the
app's own: the tools, the pull request bar, and the owner picker. The fake
has no terminal socket, so the terminal shows Disconnected.

Run the tests with `npm run test -- src/shell/workspace`.
