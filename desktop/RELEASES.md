# Conductive for Mac releases

This file holds the release part of the [Mac app README](README.md).
[Signed release packages](#signed-release-packages) gives the signing command and its secrets.
[Releases](#releases) gives the release steps, the release files, and the versions.
[Updates](#updates) says which builds have the updater on.
[Packages and updates](../docs/protocol/desktop-app.md#packages-and-updates) in the Mac app protocol states the requirements.

## Signed release packages

The `package:release` command signs both architectures with a Developer ID
Application identity. It enables Hardened Runtime with only the JIT entitlement
that Electron needs. It notarizes and staples the app before ZIP packaging.
It also signs, notarizes, and staples each DMG.
It fails when a credential is missing or an app has the wrong Apple team.
It checks each app with `codesign --verify --deep --strict`, `stapler validate`,
and Gatekeeper. It checks each finished DMG as well.

```sh
npm --prefix desktop run build
npm --prefix desktop run package:release
npm --prefix desktop run test:packaged
```

The release command needs these environment values:

| Name | Value |
| --- | --- |
| `CSC_LINK` | The Developer ID Application identity, with its private key, exported as an encrypted `.p12` and encoded as one base64 line. |
| `CSC_KEY_PASSWORD` | The password of that `.p12` export. |
| `APPLE_API_KEY` | The downloaded Apple API `.p8` private key, encoded as one base64 line. |
| `APPLE_API_KEY_ID` | The ID of that API key. |
| `APPLE_API_ISSUER` | The issuer ID from App Store Connect. |
| `CONDUCTIVE_APPLE_TEAM_ID` | The ten-character Apple team ID that the signing certificate must match. |

The command imports the identity into a temporary Keychain.
It writes the API key in the same private temporary folder with mode `0600`.
The build process receives the Keychain path and API key path.
It receives no `.p12` value or export password.
The command restores the prior Keychain search list and removes temporary
credentials when it ends.
Ctrl+C and SIGTERM cancel the active tool before credential cleanup.

The signing job of the release workflow runs the three commands above.
It uses the `desktop-release` GitHub environment of `Firna-AI/remote-code`.
That environment admits only the `main` branch, so no run of a tag or of another branch gets its secrets.
The rule is a GitHub setting, not a file in this repository.
In GitHub, open Settings, Environments, `desktop-release`.
Deployment branches and tags must list only `main`.
The environment has no required reviewer.
Its five secrets have the names in the table above, except that the public
`CONDUCTIVE_APPLE_TEAM_ID` is an environment variable.

Use `gh secret set --repo Firna-AI/remote-code --env desktop-release NAME`
to enter a secret without printing it.
For a key file, pipe `openssl base64 -A -in FILE` into that command.
Use `gh variable set` for the Apple team ID.
Never commit keys, export passwords, or decoded credentials.

The signing job uploads `desktop-signed-packages` and
`desktop-release-evidence` as Actions artifacts for 14 days.
An `always()` step also removes temporary signing credentials after a failure
or cancellation.

## Releases

Each GitHub release of `Firna-AI/remote-code` carries the signed Mac app.
Installed copies update themselves from these releases.
[Releases](../docs/protocol/desktop-app.md#releases) in the Mac app protocol states the requirements.

`.github/workflows/release.yml` holds the whole release.
The reusable workflow `desktop-mac-checks.yml` holds the Mac checks, and `desktop-sign.yml` holds the signing steps.
The Desktop workflow and the release workflow run the same Mac checks.
`desktop/scripts/publish.ts` checks the files and publishes the draft.
It takes the file names from `latest-mac.yml` and from the signed files, so it holds no copy of the package naming rule.
A release happens in these steps:

1. On each push to `main`, release-please keeps one release pull request up to date.
   It sets the next version from the Conventional Commit messages.
   It writes that version into `package.json`, `desktop/package.json`, and their lockfiles.
   It also adds the changes to the root `CHANGELOG.md`.
2. Merge the release pull request.
   release-please then creates the tag `vX.Y.Z` on the merge commit, and a draft GitHub release.
3. The release workflow runs the Mac checks.
   Its signing job then builds both architectures with the updater on, signs and notarizes them, and runs the packaged tests.
4. The publish job uploads the files to the draft.
   It publishes the draft only after GitHub lists every file with its full size.

The publish job uploads the two ZIP files, their block maps, the two DMG files, and `latest-mac.yml`.
electron-builder writes the packages, their block maps, and `latest-mac.yml`.
The signing job then staples each DMG.
Stapling changes the DMG after electron-builder records its size and hash.
So `dmg.writeUpdateInfo: false` in `electron-builder.yml` leaves the DMG files out of `latest-mac.yml`.
For the same reason, the publish job uploads no DMG block map.
Risk: electron-builder marks `dmg.writeUpdateInfo` as private, so an upgrade can change it.

When a run fails, the draft stays.
A re-run of the failed jobs replaces the files of the draft.
A re-run uses the same release commit, so it repeats a failure that the publish code itself causes.
Then fix that code on `main`.
To publish the signed files of the failed run by hand, download its `desktop-signed-packages` artifact into `desktop/dist/release`.
Then run `RELEASE_TAG=vX.Y.Z RELEASE_VERSION=X.Y.Z node desktop/scripts/publish.ts` from the fixed checkout, with a GitHub login that can write releases.
Otherwise, delete the draft, and the next release carries the fix.
The publish job never changes or deletes a published release.
When the version already has a published release, it warns and publishes nothing.

The publish job runs on Linux with the built-in `GITHUB_TOKEN` and `contents: write`.
It downloads the signed files and uploads them with `gh`.
It runs no `npm ci` and no build, so no dependency script runs beside a token that can write releases.
The signing job keeps a read-only token.

**Run workflow** on the release workflow, from `main`, runs the Mac checks and the signing job.
That run keeps the updater off and publishes nothing.
Use it to test signing.

release-please uses the `RELEASE_PLEASE_TOKEN` secret when it exists, and the built-in token otherwise.
With the built-in token, `github-actions[bot]` opens the release pull request.
GitHub then runs CI on it only after a person with write access approves the runs.
The built-in token also needs "Allow GitHub Actions to create and approve pull requests" in the repository's Actions settings.
A token in the `RELEASE_PLEASE_TOKEN` Actions secret runs CI on the release pull request with no approval, and needs no code change.

One root release-please component covers the whole product, so the web app and the Mac app share one version.
Versions have the form `0.x.y`.
With `bump-minor-pre-major`, a breaking change raises the minor number before 1.0.
The manifest starts at `0.0.0` from the bootstrap commit in `release-please-config.json`.
The first `feat` commit after that commit makes the first release `0.1.0`.
A commit with the footer `Release-As: X.Y.Z` sets another next version.
The signed `0.1.0-alpha.1` build has the updater off.
People with that build install a newer version by hand once, from the DMG of a release.
After that, the app updates itself.

## Updates

electron-updater reads the GitHub releases of `Firna-AI/remote-code`.
`CONDUCTIVE_DESKTOP_UPDATES=enabled` at build time turns the updater on.
Only the signing job of a release sets it.
Manual signing runs, pull request builds, and local builds keep the updater off.
An unpackaged app never starts the updater.
In a build with the updater off, Help → Check for updates is disabled.
[Updates in the app](../docs/protocol/desktop-app.md#updates-in-the-app) states when the app checks and what it shows.
