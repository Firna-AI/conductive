# Sandbox software

This doc holds the requirements and the decisions in force for the
[sandbox software](../architecture.md#terms), the app's own software in
each sandbox. It covers the releases, the updates of each sandbox, the
install in a build, and the software image that a first build starts from.
It belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md).
[Sandbox software](../architecture/sandbox-software.md) in the
architecture docs describes its parts. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A sandbox software decision number, such as sandbox software
decision 5, names a decision of the change that makes the sandbox software
update itself. An idle update decision number, such as idle update
decision 2, names a decision of the change that installs a new release
while the workspace is idle. A build time decision number, such as build
time decision 1, names a decision of the change that shortens the software
step of a build.

## Releases

- A release is one version of the sandbox software. It holds the program
  `conductive` and the other parts that the program installs.
- Each deploy from `main` publishes a release (sandbox software decision
  6). Reason: the runner then keeps matching the Worker.
- A release only with each release of the Mac app was rejected, because
  the runner then lags the Worker until that release.
- The release files live in the R2 bucket `conductive-runner`. The bucket
  serves them at `https://runner.conductive.build` (sandbox software
  decision 4).
- The newest release of each platform is one JSON file at
  `releases/latest/conductive/<target>` under that address. `<target>`
  names the platform of the program, such as `x86_64-unknown-linux-musl`.
- The JSON file has the format that the `cli-updater` crate of
  `futex-ai/cli-release` reads. It gives the version, the download address,
  and the SHA-256 digest of the program. It always gives the digest.
- Reason: the HTTP client of `cli-updater` reads these static files with
  no change. The files need no server. A later release server can serve
  the same paths with no change in any sandbox.
- Worker routes, a release server, and one JSON file in each GitHub
  release were rejected.
- The newest release never goes back to an older version. A deploy of an
  older commit does not change it.
- The other files of a release never change after the deploy writes them.
- Each sandbox trusts each writer of the bucket `conductive-runner` as it
  trusts the Worker deploy, because a release from the bucket becomes the
  software of each sandbox at its next start (sandbox software decision
  10). Today the only writer is the deploy token, which can also deploy
  the Worker. So a writer of the bucket gets no access that the deploy did
  not already give.
- Reason: a write to the bucket then adds no new attacker. A signature of
  each release, with a key that the deploy holds and a public key in the
  program, was not chosen for now. It becomes the better guard if any key
  other than the deploy token can write to the bucket.
- A digest that the Worker gives to each sandbox was rejected, because it
  needs a Worker route, as the rejected Worker routes above do.

## Updates

- The program `conductive` updates itself and the other parts of the
  sandbox software in its sandbox (sandbox software decision 1). Reason: a
  fix then reaches each sandbox with no new workspace and no manual
  install.
- The program checks for a newer release each time that the agent runner
  starts, such as at each start of the sandbox. It also checks every 10
  minutes while the runner runs (idle update decision 2). Reason: the
  check reads one small static file, so a fix reaches a running sandbox
  sooner for almost no cost.
- An hourly check was rejected, because a running sandbox then learns of a
  fix up to an hour late.
- A check that the Worker asks for after each deploy, and a check soon
  after each new connection, were rejected. Reason: each needs more work.
  The first also needs a new command, and an older runner closes its
  connection at an unknown command.
- It downloads a newer release in the background. A start never waits for
  a download.
- An update downloads only the parts that changed since the release that
  the sandbox runs.
- The program installs only a release with a higher version than the
  release that the sandbox runs.
- It refuses a release whose JSON file gives no digest. It also refuses
  each downloaded file whose digest does not match. Reason: each deploy
  writes the digest, so this refuses only a broken release.
- A failed check or download changes nothing in the sandbox. The program
  logs a warning. The next check tries again. Reason: the sandbox keeps
  working on its current release.
- A download never changes the files of the release that runs. Reason: a
  tool call and the running runner then never mix two releases.
- The next start of the agent runner applies the newest complete download,
  before the runner starts its work.
- While the sandbox runs, the runner also installs a newer release when
  its workspace is idle, as [Installs at idle](#installs-at-idle) says.
- The program never restarts the runner service to apply an update.
  Reason: a restart stops each running turn, and each process that an
  agent started, such as a dev server.
- The sandbox keeps the previous release. When the software of a new
  release fails to start, the next start runs the previous release again.
- A new runner confirms its release when it first connects to the Worker.
  A new release without that confirmation at the next start counts as a
  failed start. The program never installs that release again.
- A sandbox without the program gets the program at its next start. That
  start changes nothing else. The program then updates the rest of the
  software by these rules.
- Reason: such a sandbox has no other way to get its first updater.
- A sandbox can run an older runner until an update applies. So the Worker
  serves each runner protocol version that a live sandbox can hold, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- An install of the newest software at each start was rejected, because a
  start then takes longer and can fail in a new way. A start that
  downloads only the changed parts was rejected for the same reason.
- A separate updater service and updates over the runner connection were
  rejected. Reason: the program itself then holds the one update path of
  each part.
- A check at each command was rejected, because each command then waits
  for a request to the release address.

### Installs at idle

- The runner installs a newer release when its workspace is idle (idle
  update decision 1). Reason: a fix then reaches each running workspace
  within minutes.
- The workspace is idle when no turn runs in any session and no command
  waits or runs in the runner. A turn that waits for its
  [background work](agent-runner.md#background-work) is a running turn.
  Input in a terminal or a port preview does not count.
- The runner installs only when the workspace was idle for 2 minutes.
  Reason: the next message most likely comes just after a turn ends.
- It installs only when its own release is confirmed, and never a release
  that failed to start. Reason: an install then never goes back or loops.
- The runner swaps to the new release in place. It closes its connection
  and ends its work as at a shutdown. It then installs the release and
  runs the new release in the same process.
- So the runner service keeps running. Each process that an agent started
  keeps running, such as a dev server or a build daemon. Each terminal
  keeps running too.
- The app shows nothing new for the install. The runner is away for a few
  seconds, as after a short drop of its connection. A command that the
  runner did not read before the install reaches the new release once.
- The install restarts neither the preview relay nor the terminal service.
  They run the new release from their next start, such as at the next
  start of the sandbox.
- After a failed install that changed nothing, the runner logs a warning.
  It then connects again on its own release. It does not install at idle
  again until its next start. Reason: the same failure then does not
  disconnect the runner every 2 minutes.
- A new release that exits at its start is a failed start. The runner
  service then starts again within seconds, on the previous release. That
  restart stops each process that an agent started.
- A runner that cannot install at idle gets each update at a later start.
- No check guards a new release that runs but never connects to the
  Worker (idle update decision 3). Reason: the app relies on CI and on the
  software image build of each deploy to find a broken release.
- Risk: such a release reaches each idle running workspace within minutes
  of its deploy. No agent of such a workspace can then work until the next
  start of the sandbox, which runs the previous release again.
- A rollback when the new release has not connected after some minutes
  was rejected, as a check by the new release and as a check by the
  previous release. Reason: the rollback stops that release for good, so
  an outage of the Worker can keep a good fix away until the next deploy.
  A broken release can also break its own check.
- A restart only when no process of an agent runs was rejected, because a
  build daemon can then hold the update back for hours. A restart that
  stops only the runner process was rejected, because systemd advises
  against it, and a crash then also leaves processes behind.
- Installs only at a later start, and a notice in the app that asks a
  member to restart, were rejected, because a workspace that stays on then
  keeps its old release.
- An install by the check every 10 minutes was rejected, because that
  check cannot tell whether a turn runs.
- A service of its own for the processes that agents start, so that a
  restart of the runner stops none of them, was not chosen for updates.
  Reason: the install in place already stops no such process.

## Installs in a build

- Each build of an org image installs the newest release. A software image
  build does the same. Reason: each build and each sandbox then install the
  software in the same way.
- Each refresh of an org image also installs the newest release, through
  the same software step (sandbox software decision 15). It still runs no
  install script. Reason: each refreshed image then holds current
  software, so a new workspace needs no first update.
- When no release is available, the refresh fails, and the org keeps its
  last good image. A refresh that keeps the installed release was
  rejected, because a new workspace then runs older software until an
  update applies at a later start.
- The terminal scripts and their units are parts of each release (sandbox
  software decision 1). So an update brings a fix of the terminal to each
  sandbox.
- The software step installs the system packages `ttyd`, `tmux`, and the
  GitHub CLI `gh` with apt. It also masks the ttyd service of the package.
  Reason: Ubuntu owns these packages.
- A build or a refresh runs this apt part only when one of these packages
  is missing, when the ttyd service is not masked, or when the apt part
  changed since the image last ran it (build time decision 1). Reason: the
  step then takes about 20 seconds less in each build and each refresh, and
  a change of the apt part still upgrades the packages.
- The app keeps the version of the apt part alone for each image. A new
  release does not change it. Reason: a version that includes the release
  changes at each deploy, so each build then runs apt again.
- A skip of the apt part with no rerun was rejected, because the packages
  then never upgrade. No change was rejected, because each build and each
  refresh then spends about 20 seconds on parts that the image already
  holds.
- When the image holds the program `conductive`, the step installs the
  newest release through that program. So the step downloads only the parts
  that changed, as [Updates](#updates) says. When the program is missing,
  or its update fails, the step downloads the full program and installs
  the release with it. Reason: either way, each build and each refresh end
  with the newest release.

## The software image

- The software image is a saved snapshot of the base image with the app's
  own software installed. That software is a release of the sandbox
  software, the terminal packages, and the GitHub CLI.
- It holds no org data and no secret, because every org uses it.
- One software image belongs to each version of the app's own software. A
  change of any install step of that software makes a new version.
- A build of an org without an org image starts from the ready software
  image of the current version. It copies the repositories, installs the
  newest release, then runs the install script. A later build and a
  refresh start from the last org image.
- Reason: the first build of a new org then installs only the parts that a
  newer release changed.
- In place of the software image, a skip of the parts that each org image
  already holds was rejected. It does not make a first build faster. A
  later build and a refresh still skip the apt part when their org image
  holds it, as [Installs in a build](#installs-in-a-build) says.
- Without a ready software image of the current version, such a build
  starts from the base image. It copies the repositories, installs the
  app's own software, then runs the install script. A missing software
  image slows a build and never fails it.
- Each deploy run asks the Worker to build the software image of the
  deployed version, and waits for the result. A deploy run whose version
  has a ready software image waits for nothing.
- A Worker cron job that builds it by itself, and a build at the first org
  build after a release, were rejected. Reason: the deploy run then shows
  the result.
- The deploy run proves itself with a token of its own, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
- The deploy run fails unless the software image is ready when its wait
  ends. The new Worker stays live. Reason: one rule covers a failed build,
  a wait that ends first, and a refused request. A warning in the summary
  of the run was rejected, because it hides the failure.
- One software image build runs at a time. A build of a newer version ends
  an unfinished build of an older version.
- A failed build starts again only for a later deploy run. So a re-run of
  the deploy builds again.
- A software image build has a time limit of 60 minutes. A build that
  outlasts the wait of its deploy run goes on until it ends or reaches
  that limit.
- When a new software image is ready, the app deletes each older one that
  no running build still starts from. A rollback of the Worker then finds
  no software image of its version, so builds install the app's own
  software until the next deploy run builds one.
