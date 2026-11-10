# Listening ports

- The runner reports the TCP ports that listen in its sandbox, for the
  [port previews](workspace-tools.md#port-previews) (decision 220). Each
  `ports.updated` event holds the full list.
- The list holds each port in the listen state on a wildcard or a loopback
  address, owned by the user of the runner. Reason: a specific address
  belongs to Boat's relay, and other users own system services, such as
  SSH.
- Cost: a port that a root process opens, such as a Docker port, does not
  show. The port field still opens it.
- The list leaves out the terminal port. It also leaves out each other
  port of the app's own services that a new sandbox shows.
- A port joins the list after two scans in a row find it, and it leaves
  after two scans in a row miss it. The runner scans every 2 seconds.
- Reason: a short test server of an agent does not change the list. A
  server that restarts after each edit, such as under `nodemon`, keeps its
  row, so the rows below it do not move.
- Each port has a name or none, and a folder or none (decision 221). They
  stay the same for the life of the socket of the port. A port whose
  process the runner cannot read has no name.
- The name is the file name of the program. For a known interpreter, such
  as `node`, `python3`, `bun`, or `deno`, it is the file name of the
  script, or the module after `-m`.
- The next word joins the name only when it has 1 to 20 lowercase letters
  and hyphens, such as `dev` or `serve`. Reason: a next word can hold a
  secret, so a token with digits or capitals stays in the sandbox.
- Risk: a password of lowercase letters alone can still pass. The output
  filter hides it only when it is a marked env value.
- The folder comes from the working folder of the process, as
  [Folder names](repository-folders.md#folder-names) places the
  repositories:
  - In the root of the workspace's own repository, the port has no folder.
  - Below that root, the folder is the path from the root, such as
    `apps/web`.
  - In another repository folder under `~/code`, the folder is the name of
    that folder and the path below it, such as `api` or `api/server`.
  - Outside these folders, the port has no folder. Reason: no path outside
    the repositories reaches the browser.
- A report holds at most 64 ports, in the order of their numbers.
- The private runner report keeps each selected label complete until the
  workspace filters secret values. No display cut precedes that filter.
- Each private report meets the runner envelope byte limit. When complete
  optional labels cannot fit the private budget, they become unavailable
  as whole labels. Their ports stay in the report. A private cut was
  rejected, because a longer secret can cross that cut too.
- The workspace stores and sends names of at most 40 characters and
  folders of at most 120 characters, after the secret filter. A longer
  folder keeps its end, after "…", because the end tells servers apart.
- Reason: stored and displayed reports stay small, and rows do not move
  under the pointer. Complete filter input prevents app-created secret
  fragments.
- The runner sends the list when it changes, and once after each connect,
  also when it is empty. It also answers a `report.refresh` of the kind
  `ports.updated`, as [Lost workspace updates](agent-runner.md#lost-workspace-updates)
  says.
- Port reports use the [runner protocol](agent-runner.md#the-agent-runner).
  They add no separate protocol version. Reason: only a runner that
  reports ports sends `ports.updated`, and only after a refused report of
  that kind does the workspace ask for its refresh.
- A port report is not activity under the rule of
  [Stop and resume](workspaces-and-sandboxes.md#stop-and-resume)
  (decision 29). So it does not delay the stop of a sandbox.
