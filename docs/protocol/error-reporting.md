# Error reporting

This doc holds the requirements and the decisions in force for the reports
of unexpected failures that Conductive sends to Better Stack. The terms are
those of the [architecture doc](../architecture.md#terms).
[Error reporting setup](../deployment/error-reporting.md) gives the steps of
the operator.

## Terms

- **Better Stack Errors:** Better Stack's error tracker. It takes error
  events from the Sentry SDKs, groups them into issues, and sends alerts.
- **Report:** one error event that a part of Conductive sends to Better
  Stack Errors.
- **Unexpected failure:** a failure that Conductive does not plan for, such
  as a defect or a failed outside service. A refused request and a fault in
  the user's own code are not unexpected failures.
- **DSN:** the address and the key that a sender of reports uses. Its host
  names the Better Stack application and its data region.
- **Classification:** the kind of an unexpected failure, from a fixed list
  that the code holds. Each classification has a fixed text.
- **Isolate:** one running copy of the Worker or of a Durable Object.
- **Workers Logs:** Cloudflare's log store of the Worker. It keeps the
  warnings of the Worker.
- **Bookfolio:** the product of the repository `futex-ai/accounting`. It
  sends its error reports to Better Stack in the same way.

## Parts that report

- The Worker and its Durable Objects report their unexpected failures.
- The web app reports its unexpected failures from the browser.
- The Mac app window runs the web app, so it reports by the same rules.
- The Mac app's own process, the agent runner, and the marketing site send
  no reports. The pages of the marketing site run no script.
- Reason: the server and the client get the coverage that Bookfolio has.
  The agent runner or the Mac app's own process can join later with no
  change to these rules.
- The reports are error events, as Bookfolio sends. Log shipping was
  rejected: Cloudflare's log export, a Tail Worker, Logpush, and Better
  Stack's log library.
- Reason: error events give grouped issues and stacks with the original
  source. Cloudflare's log export gets no cause of an unknown error, because
  the Worker catches each request error. Better Stack's own Tail Worker
  copies each address with its query, which can hold a sign-in code.
- One Better Stack Errors application takes the reports of the Worker. A
  second application takes the reports of the web app and the Mac app
  window. Reason: the issues, the alerts, and the limits of each part stay
  apart.

## When reporting is on

- The Worker reports only while its secret holds a valid DSN. Without the
  secret, it sends no report.
- A DSN is valid only in the form
  `https://<key>@s<id>.<region>.betterstackdata.com/<id>`, with the same
  application ID in the host and in the path. Reason: a typo cannot send
  reports to another host.
- An invalid DSN turns the reports of the Worker off. The Worker then
  writes one warning to Workers Logs. The warning never holds the DSN.
- Reason: a bad setting turns one feature off, and the app stays up. A
  refusal to start, as Bookfolio's server does, was rejected.
- The web app reports only when all of these hold:
  - It is a production build with a release.
  - The browser DSN is set.
  - The configured app origin is `https://app.conductive.build`.
- In the browser, the configured app origin is the origin of the page. In
  the Mac app window, it is the app origin of its build, because the page
  origin there is `conductive-app://desktop`.
- An invalid browser DSN turns reporting off. The policy then names no
  report origin. Both parts use the DSN form above.
- Reason: local builds, local previews, and tests then send nothing.
- The Worker's DSN is a Worker secret. Reason: anyone with that DSN can
  send false reports into the application of the Worker.
- The browser DSN is public, and the code holds it. It stays empty until
  the operator sets it. Reason: each page must hold it to send reports.
- Risk: anyone can use the browser DSN to send false reports.

## Release and environment

- Each report names its release: `conductive@<commit SHA>`, where the SHA
  names the Git commit that built the code. All parts of one commit name the
  same release.
- A Worker from a build outside a Git checkout sends its reports with no
  release. A web app from such a build sends no reports.
- The environment of a Worker report is `production` when the Worker's
  `APP_ORIGIN` is `https://app.conductive.build`. Otherwise it is
  `development`.
- Reason: a developer can test with a DSN of their own, and those reports
  stay apart from the reports of the deployment.
- The environment of each web app report is `production`, because only
  that app origin reports.

## What the Worker reports

- Each final response with a status from 500 to 599 gives one report. The
  cause can be an unknown error, a known error with such a status, or a
  route that returns such a status.
- A failed alarm of a workspace Durable Object gives one report. The alarm
  still fails, so Cloudflare still retries it.
- A failed run of the cron gives one report. The run still fails.
- A catch that hides an unexpected failure gives one report. Examples are
  a runner message that the workspace fails to handle, and a failed
  deletion of an org.
- A normal result gives no report, such as an org deletion that another
  cron run already holds.
- A warning gives a report only when it records an unexpected failure of
  Conductive. A warning about a fault in the user's own code, such as a
  failed install script, stays in Workers Logs only.
- A response with a status from 400 to 499, a validation result, and a
  refused request give no report.
- One failure gives at most one report.

## What a Worker report holds

A filter rebuilds each report from this list, and drops every other field:

- the event ID, the time, the platform, the level, the environment, the
  release, and the name and the version of the SDK
- one exception. Its type is the name of the error class when that name is
  a plain identifier, and `Error` otherwise. Its value is the fixed text of
  its classification.
- at most 50 stack frames. Each frame holds only the function, the file
  name of the bundle, the line, the column, and whether the frame is
  Conductive code. The file name sits under a fixed synthetic root, and it
  never holds the path of a request or of the file system.
- these tags: the component, which is `request`, `workspace`, or `cron`,
  the classification, the HTTP method, the route template, the status, the
  code of a known error, and the Cloudflare Ray ID of the request
- for a reported warning, also its typed values that are codes, phases,
  numbers, or booleans, as tags

The route template keeps each path segment that the app's own route lists
name, and writes `:param` for every other segment. Reason: a segment can
hold an ID. The Ray ID finds the same request in Workers Logs, while Workers
Logs keeps request records.

## What the web app reports

- Reporting starts before the first render of the app.
- The web app reports each error that React reports at the root of the
  app: an uncaught error, an error that an error boundary caught, and an
  error that React recovered from.
- It also reports each uncaught error and each unhandled promise rejection
  of the page.
- The app shows no new error screen. A render crash still leaves a blank
  page.
- The reporter keeps sessions, traces, replays, logs, client reports, and
  breadcrumbs off. It stores nothing in the browser. Reason: the cookie
  text of the Privacy page stays true.

## What a web app report holds

A filter rebuilds each report from this list, and drops every other field:

- the event ID, the time, the platform, the environment, and the release
- one exception, with its type, and the fixed text of its classification
  as its value
- stack frames. Each frame holds only the function, the file name of the
  bundle, the line, the column, and whether the frame is Conductive code.
- the debug IDs of the bundle files, which match the frames to the source
  maps
- the names and the versions of the browser and of the operating system
- the tag `platform`: `web` in the browser, and `mac` in the Mac app window
- the tag `classification`
- the tag `screen`: the name of the screen in the route list of the app,
  such as `workspace`. Such a name never holds an address or an ID.
- `user.id`: the Conductive user ID of the signed-in user. The app sets it
  after the sign-in and clears it at the sign-out. The ID finds the account
  without the name of the person, as in Bookfolio.

## What no report holds

- No report holds an error message, an address, the raw path of a request,
  a query, a header, a cookie, a body, a token, or a secret.
- No report holds the ID of an org, a workspace, a session, or a sandbox.
  Only a web app report holds a user ID, as `user.id`.
- No report holds the GitHub login, the name, or the avatar of a person.
- No report holds breadcrumbs, console output, local variables,
  screenshots, chat messages, code, or the paths or the content of the
  files of a workspace.
- A typed value of a warning that is an ID stays in Workers Logs only.
- Each report passes the filter, also a report that code gives to the SDK
  directly. A report that the filter cannot rebuild is dropped.
- A second pass of the filter gives the same report.

## The browser connection

- The web app sends each report straight to Better Stack, at the origin of
  the browser DSN.
- The content security policy of each page allows that origin, as
  [Content security policy](access-and-security.md#content-security-policy)
  says.
- Better Stack can store the network address of each browser connection
  with the report.
- The Worker sends its reports from Cloudflare's network. So Better Stack
  gets no network address of a user with them.
- The direct connection follows Bookfolio. A tunnel route on the app origin
  was rejected. It hides the address of each user from Better Stack, but it
  adds a public route and a Worker request for each report.
- A report route of our own was rejected too, because the app would then
  own a stack parser for each browser.
- Risk: an ad blocker can block the reports.

## Repeat limits of the Worker

Each isolate limits the reports that it sends:

- The key of a report is its classification, its exception type, its route
  template, and its first frame of Conductive code.
- An isolate sends at most one report for each key in 60 seconds.
- An isolate sends at most 60 reports in any 60 seconds.
- An isolate keeps at most 1,024 keys. A new key then replaces the key with
  the oldest report.
- Reason: a failure loop cannot fill the quota of the application. Better
  Stack's spike protection is a second guard, not a replacement.

## Failure safety

- A failure to report never changes a response, an alarm, or a cron run.
- In the browser, a failure to start the reporter or to send a report never
  stops the app or changes what it shows.

## Source maps

- No source map is public. The deployed assets hold no `.map` file, and no
  deployed script names a map.
- When the upload settings of the operator are present, the build uploads
  the maps of the web app and of the Worker to Better Stack, under the
  release. Reports then show the original source.
- Without the settings, or when an upload fails, the build warns and goes
  on. Reason: a missing map costs only readable frames, and a new gate that
  fails the build is a choice for the user.
- The upload token never goes into the repository, CI, the Worker, or the
  output of a build.
- The Mac app build uploads no maps yet. Its reports show the frames of its
  bundle.

## Retention and access

- Both applications keep their reports in an EU data region.
- Better Stack keeps each report for 90 days.
- Only the admins of the operator's Better Stack team can read the reports.
- Spike protection is on for both applications.
- The Privacy page names Better Stack, what each report holds, the EU
  storage, and the 90 days.

## No uptime checks

- Conductive has no outside uptime checks, no heartbeat of the cron, and no
  status page.
- Better Stack Uptime checks of the hostnames with a heartbeat of the cron
  were rejected. So were a status page and a report of each late org
  deletion.
- Risk: the operator learns of a full outage, such as a DNS or certificate
  failure, only from a user report. A cron that stops sends no report.
