# Conductive Mac signing and notarization

The user approved option A on 8 November 2026.
Create a new Developer ID Application certificate and a Developer-role Apple API key.
Store the encrypted signing identity and Apple API credentials in the protected
`desktop-release` environment of `Firna-AI/remote-code`.
Build signed and notarized DMG and ZIP files for arm64 and x64 in GitHub Actions.
Version tags and manual runs start the release job.
Upload the files as Actions artifacts.

## Constraints

- Use Node 24 and the existing Electron 44 and electron-builder 26 dependencies.
- Keep pull request and ordinary development packages ad-hoc and free of secrets.
- Require all release credentials before packaging starts.
- Require Developer ID signatures, the expected Apple team, Hardened Runtime,
  valid signatures, stapled tickets, and Gatekeeper acceptance for release apps.
- Import the signing identity into a temporary runner keychain.
- Remove temporary keychains and credential files when the job ends.
- Keep secrets out of Git, logs, screenshots, and uploaded evidence.
- Do not merge the task branch. Agent merges are off.

## Tasks

- [x] Create the Apple credentials through the signed-in Brave session.
  Keep the local key encrypted. Check the certificate against its public key.
  Store credentials with `gh secret set` through standard input.
  Check secret names and environment branch restrictions without reading values.
- [x] Add release packaging in `desktop/scripts/package.ts` and signature checks
  in `desktop/scripts/release-signature.ts`.
  Add `package:release` in `desktop/package.json`.
  Test missing credentials and rejected signature or ticket results.
  Build and check an ad-hoc package to retain the existing path.
- [x] Add the protected release job in `.github/workflows/desktop-ci.yml`.
  Use `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`,
  `APPLE_API_ISSUER`, and `CONDUCTIVE_APPLE_TEAM_ID`.
  Give the signing process credentials only after dependencies and tests pass.
  Fail the release when signing or notarization cannot be verified.
- [x] Resolve the existing Mac window test failure if it blocks the release.
  Reproduce the consumed-response failure before changing its test fixture.
  Run the complete repository gate and the Mac checks.
- [x] Update `desktop/README.md` and `docs/protocol/desktop-app.md`.
  Check their relative links. Record credential setup, release commands,
  environment restrictions, and observed verification results.
- [ ] Review the branch, commit it, push it, and create a pull request.
  Run the GitHub release build from the reviewed task revision.
  Download its artifacts and validate signatures and notarization tickets.

## Review focus

- A missing or partial credential set must not produce an unsigned release.
- A pull request must not receive release secrets.
- The signing identity must belong to the expected Apple team.
- A skipped notarization must fail ticket validation.
- A failed or cancelled build must clean up temporary credentials.

## Execution record

- Baseline: build, desktop typecheck, 60 unit tests, and ad-hoc packaging pass.
- Baseline: the Mac package suite has one repeatable failure in
  `window-controls.spec.ts`: the fake API tries to clone a consumed response.
- Ruling: use a task branch in the current clean checkout. The dependencies and
  prepared packages are already here. This avoids a second large Mac setup.
- Ruling: the user approved implementation in option A. Execute in this session
  without a second plan approval. Use a final independent code review.
- Release guard tests: 22 expected failures before implementation. All 24 tests
  pass after implementation.
- Ruling: Node 24.2.0 caused the consumed-response fixture failure. The same
  window test passes with Node 24.22.2, the current Node 24 release. Use that
  version for the remaining checks. No fixture change is needed.
- Ruling: GitHub returned HTTP 422 for required environment reviewers because
  the billing plan does not support them. Use the supported deployment branch
  rules for `main` and `v*` tags. No subscription change is needed.
- The independent review found one P2 issue: local cancellation bypassed cleanup.
  Two signal tests failed first. The fix handles SIGINT and SIGTERM, runs long
  tools in a cancellable process group, waits for tool exit, and removes keys.
  The final desktop unit suite passes all 91 tests. This includes a real child
  process cancellation test. No review findings remain open.
- Both ad-hoc architectures build and pass strict signature verification.
  All 10 packaged Mac tests pass with Node 24.22.2.
- The app and Worker build and strict mockup build pass. Desktop and root
  typechecks, lint, formatting, and file-length checks pass.
- The local complete gate stops at 32 Worker test failures in 17 files on macOS.
  The failures include Linux-only commands and invalid-byte filename fixtures.
  The separate runner suite has 21 failures in 13 files, including filesystem
  assumptions and provider timeouts. These files are unchanged. Run the complete
  gate in its Ubuntu GitHub job before merge.
- Apple created certificate `CS7VCNVYT3`, valid until 8 December 2027.
  Its public key matches the local encrypted key. A real temporary-keychain
  import finds one valid Developer ID Application identity and cleans up.
- The `desktop-release` environment has all five secrets and the expected Apple
  team variable. Its deployment rules allow only `main` and `v*` tags.
