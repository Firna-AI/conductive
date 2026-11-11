# Mac packages and updates

This page holds the package, release, and update requirements of the [Mac app](desktop-app.md).
It includes the download names and addresses of the public GitHub releases.

## Packages

- The electron-builder tool packages a DMG and a ZIP for each processor
  type, arm64 and x64 (decision 62).
- Each package carries the app icon of the [brand files](../brand/README.md).
- Development and pull request packages have an ad-hoc signature and no
  notarization. They need no Apple signing credentials.
- Release packages use a Developer ID Application signature and Hardened
  Runtime. Apple notarizes the app before ZIP packaging. Each DMG is also
  signed and notarized. Each app and DMG has a stapled notarization ticket.
- Release packaging fails if credentials are missing, the signing team is
  wrong, or signature, ticket, or Gatekeeper verification fails.
- A release package runs on macOS 13 or later. Its app has
  `LSMinimumSystemVersion` 13.0, so macOS 12 and older refuse to open it.
- Risk: macOS refuses to open a downloaded ad-hoc build until
  the user allows it.

## Releases

- The update feed is the GitHub releases of this repository,
  `Firna-AI/conductive`, which is public.
- A separate feed repository was rejected. Reason: releases here need no
  stored credential and no second repository.
- One version covers the whole product. Reason: the Mac app bundles the
  web app, so each product change changes the Mac app.
- Versions have the form `0.x.y`.
- Each release comes from a release pull request into `main`. Each push to
  `main` updates its next version and its changelog from the Conventional
  Commit messages.
- The merge of the release pull request creates the tag `vX.Y.Z` on the
  merge commit, and a draft GitHub release.
- A version from a pushed tag or from a hand edit was rejected. Reason: one
  merge then sets the version, writes the changelog, and starts the
  release.
- After the merge, the release workflow runs the Mac checks. It then signs
  and notarizes both architectures, runs the packaged tests, and uploads
  the files to the draft.
- Before it signs, the release workflow checks that the tag `vX.Y.Z` points
  to the merge commit of the release pull request. A branch with the same
  name does not count. The release stops before signing when the check
  cannot find the tag on that commit.
- Reason: the release page, its source archives, and the start of the next
  changelog follow the tag. A tag that someone pushes before the merge can
  point to code that the release was not built from.
- A person then moves the tag to the merge commit and runs the failed jobs
  again. The release workflow never moves a tag. Reason: a workflow that
  moves a tag by itself rewrites a tag that a person pushed, without review.
- When a step fails, the release workflow publishes nothing.
- The draft becomes a published release only after GitHub lists every file
  with its full size. Reason: the updater reads only published releases,
  so no installed copy sees a partial release.
- A published release is never changed or deleted.
- Releases are full GitHub releases, not prereleases. Reason: the updater
  reads GitHub's latest release, which is never a prerelease.
- Every release of this repository holds the files of the Mac app. Reason:
  the updater reads the newest release of the whole repository, so a
  release without them stops all updates. The files are:
  - a ZIP file for arm64 and one for x64, which the updater installs
  - the block map of each ZIP file
  - a stapled DMG file for arm64 and one for x64, which people install
  - `latest-mac.yml`, which gives the updater the version and the ZIP files
- `latest-mac.yml` lists no DMG file. Reason: stapling changes each DMG
  after the build records its size and hash.
- Each DMG of a release has a fixed name, without the version:
  `Conductive-mac-arm64.dmg` for arm64 and `Conductive-mac-x64.dmg` for
  x64. So the address
  `https://github.com/Firna-AI/conductive/releases/latest/download/<name>`
  always gives the DMG of the latest release for that processor type.
- Reason: the marketing site runs no script, so it needs one address that
  always gives the newest DMG. A link to the release page was rejected,
  because the visitor must then choose from nine files. A Worker route that
  finds the newest version was rejected, because it adds a GitHub request
  to each download.
- Each ZIP file and its block map keep the version in their names. Reason:
  the updater finds each ZIP file through `latest-mac.yml`, so a ZIP file
  needs no fixed name.
- The releases before the fixed names, such as `v0.2.0`, keep the version
  in their DMG names. Reason: a published release never changes.
- From the second update after a DMG install, the block maps let the
  updater download only the changed blocks.
- Only workflow runs on `main` sign. The protected `desktop-release`
  environment holds the signing credentials, and it admits only `main`.
- Signing in tag runs was rejected. Reason: a tag can point to a commit
  that never merged. Any workflow run can create a release here, so the
  signing credentials decide which builds can install as an update.
- Each runner uses a temporary Keychain and removes its temporary
  credentials.
- A manual run of the release workflow from `main` checks and signs both
  architectures. It publishes nothing.
- The job that publishes installs no dependencies and runs no build. The
  job that signs cannot write releases. Reason: no dependency script then
  runs beside a token that can write releases.
- The first release is `0.1.0`. The signed `0.1.0-alpha.1` build has the
  updater off, so its users install a newer version by hand once.

## Updates in the app

- The Mac app updates itself with electron-updater, from the releases of
  this repository.
- Only the packages that a release publishes have the updater on. Manual
  signing runs, pull request builds, and local builds keep it off. Reason:
  a test build with the updater on could install a published version over
  itself.
- The updater never runs in development.
- Risk: an update installs in place only into a build with a Developer ID
  signature. A build with an ad-hoc signature cannot update itself.
- The app checks for a new version at launch and every 4 hours. It
  downloads a new version automatically, as Mokly does.
- The app shows "The update is ready." with Restart now and Later only
  after the macOS update framework accepts the downloaded version. Reason:
  macOS can still refuse it, and Restart now would then wait forever.
- Without a manual check, the app offers each downloaded version once.
- Restart now restarts the app into the new version. Later installs it at
  the next quit.
- A failed check, download, or install does not stop the app. Only a
  failed manual check shows an error.
- Help → Check for updates answers each manual check with a dialog:
  - No new version: "Conductive is up to date."
  - A failed check: "Conductive could not check for updates. Try again
    later."
  - A new version: "Downloading the new version. Conductive tells you when
    it is ready." Then "The update is ready." follows, as above.
  - A downloaded version that waits: "The update is ready." with Restart
    now and Later again.
- A manual check during a running check waits for the result of that
  check.
- A notification or a label in the Help menu was rejected as the answer.
  Reason: the person who asks could miss either one.
- Risk: a copy that runs from a read-only volume cannot update itself, and
  the app shows no error. This holds for a copy that runs from its mounted
  DMG. It also holds for a downloaded copy that macOS runs from a hidden
  read-only place until the user moves it.
- A later change adds an offer to move such a copy into Applications.
