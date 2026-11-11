# Error reporting setup

This page is part of [Deployment inputs](../deployment.md). It gives the
steps of the operator for the error reports: the two Better Stack Errors
applications, the two DSNs, and the upload of the source maps.
[Error reporting](../protocol/error-reporting.md) states what the reports
hold and when the app sends them.

## The Better Stack applications

Make two applications in Better Stack Errors, in the operator's Better
Stack team:

| Application | Takes the reports of | Its DSN goes to |
| --- | --- | --- |
| Worker | The Worker and its Durable Objects | The Worker secret `CONDUCTIVE_ERROR_TRACKING_DSN` |
| Browser | The web app and the Mac app window | The browser DSN in `src/shared/error-reporting.ts` |

Give each application these settings:

- Data region: an EU region. Choose it when you make the application.
  Without a choice, Better Stack uses the default region of the team, which
  can be in the United States.
- Retention: 90 days. Better Stack's default is 90 days. The Privacy page
  states this period.
- Access: only the admins of the team.
- Spike protection: on.

Then check the region of each application:

1. Read the host of its DSN. Its form is
   `s<id>.<region>.betterstackdata.com`. The data region is every label
   between `s<id>.` and `.betterstackdata.com`, and it can have more than
   one label.
2. Check that this region is the EU region that you chose.
3. Check that the upload address of the application names the same region,
   as [The upload settings](#the-upload-settings) says.

Reason: the Privacy page says that Better Stack keeps the error reports in
the European Union. An application in another region makes that sentence
false.

## The Worker DSN

1. Copy the DSN of the Worker application from Better Stack.
2. Set it with `npx wrangler secret put CONDUCTIVE_ERROR_TRACKING_DSN`.

- Keep the DSN out of `wrangler.jsonc`, Git, and CI. Anyone with it can
  send false reports into the Worker application.
- Without the secret, the Worker sends no report. A value that is not a
  Better Stack DSN turns the reports off, and the Worker logs a warning.
- The reports of the deployment have the environment `production`, because
  its `APP_ORIGIN` is `https://app.conductive.build`.
- To test the reports locally, put a DSN in `.dev.vars`. The reports of
  `npm run dev` have the environment `development`, so they stay apart from
  the reports of the deployment.

## The browser DSN

- The browser DSN is public. It is the constant `BROWSER_ERROR_TRACKING_DSN`
  in `src/shared/error-reporting.ts`, and it stays empty until the operator
  sets it.
- With an empty DSN, the web app and the Mac app window send no reports.
  The content security policy then names no report origin. A value that is
  not in the DSN form of the protocol has the same effect.
- To turn the browser reports on, copy the DSN of the browser application
  into that file. Merge the change to `main`. Its deploy gives the new value
  to the web app and to the policy of the Worker.
- The Mac app window gets the value with the next release of the Mac app.
- Only the production app origin reports. So `npm run dev`,
  `npm run preview`, and the tests send nothing.

## The upload settings

The build uploads the source maps of the web app and of the Worker only when
its shell holds all five settings below. Take the values from the Advanced
settings tab of each application in Better Stack Errors.

| Name | Value |
| --- | --- |
| `SENTRY_AUTH_TOKEN` | A Better Stack Telemetry API token. One token serves both applications. It is a secret. |
| `SENTRY_URL` | The address for source map uploads, such as `https://<region>-sourcemaps.betterstackdata.com`. It is not the host of a DSN. |
| `SENTRY_ORG` | The ID of the Better Stack team. |
| `SENTRY_WORKER_PROJECT` | The ID of the Worker application. |
| `SENTRY_BROWSER_PROJECT` | The ID of the browser application. |

- Set the settings only in the shell of the operator who builds a release.
  Never put them in the repository or in CI. The token also gives access to
  the operator's Better Stack Telemetry account.
- Check that both applications show the same `SENTRY_URL` and the same
  `SENTRY_ORG`. The build uses one value of each for both uploads.
- Without all five settings, the build warns, uploads no maps, and goes on.
  A failed upload also warns and does not stop the build.
- No `.map` file reaches the deployed assets, also when an upload fails.
- An upload warning means that a build step could not confirm its work. It
  does not prove that every file failed to reach Better Stack. So check the
  upload status in both applications.
- The Deploy workflow has none of these settings, so CI uploads no maps.
  Its build still injects the same release and debug IDs as a build with
  the settings. No map, upload token, or extra upload step belongs in CI.
- A clean local build can upload the maps of a commit that the Deploy
  workflow deployed. It needs no new deployment when its JavaScript bytes
  and debug IDs match the deployed files.
- A later deployment of the same commit, with the same files, can use those
  maps. A new commit needs another map upload.
- The Mac app build injects the same release and debug IDs. It makes no
  maps and uploads no maps.

## Maps for a deployed commit

These steps upload the maps of a commit that the Deploy workflow deployed,
as [Automatic deploys](../automatic-deploys.md) describes. Reports of that
commit then show the original source.

1. Wait for the Deploy workflow to deploy the chosen commit.
2. Make a fresh clone of the repository, and check out that exact commit.
3. Use the Node version of `.nvmrc`, as the Deploy workflow does. Set no
   other setting that changes the built code.
4. Run `npm ci` from the repository root.
5. Set the five upload settings in your shell.
6. Run `npm run build`. It uploads the maps of the web app to the browser
   application and the maps of the Worker to the Worker application, under
   the release `conductive@<Git commit SHA>`. Then it deletes the maps.
7. Compare the built JavaScript bytes and debug IDs with the deployed files.
8. Confirm that `find dist -type f -name '*.map'` prints nothing.
9. Open the Advanced settings tab of each Better Stack application.
10. Confirm that the upload for `conductive@<Git commit SHA>` shows
    Processed in both applications.

More rules for these steps:

- The upload runs during the build, before the comparison. Do not claim a
  matching upload until the comparison passes.
- Keep the source clean. The build does not reject a checkout with
  changes. The generated build inputs must match too, and a fresh clone
  gives the same ones as the Deploy workflow.
- For the comparison, download the deployed web entry and the JavaScript
  chunks that it references. Read the Worker content through Cloudflare's
  script download API. Keep that read token in your shell too.
- Equal bytes and debug IDs are shown only for builds on one host, also
  from a second source folder. Another operating system or other tool
  versions can give other bytes, so the comparison decides.
- Reports show the original source after Better Stack processes the maps.
  Reports from before then show the frames of the bundle.
