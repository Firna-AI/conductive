# Mac app sign-in

This doc holds the requirements and the decisions in force for the sign-in
of the Mac app and its sign-in session. It also covers how the Worker
accepts the desktop origin. It belongs to [Mac app](desktop-app.md), which
covers the page, the window, the navigation, and the packages of the Mac
app. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Sign-in

- In the Mac app, GitHub sign-in opens in the user's default browser
  (decision 62). The browser then hands the sign-in to the Mac app through
  a `conductive://` address.
- A sign-in inside the app window was rejected. Reason: the browser already
  holds the user's GitHub sign-in and passkeys, and the window opens other
  sites in the browser.
- A sign-in that starts in the Mac app gives the browser no sign-in
  session.
- The `conductive://` address carries a handoff code. It never carries a
  sign-in session or a GitHub token.
- A handoff code works once, and only for 60 seconds.
- A handoff code works only with a secret that the Mac app made when it
  started that sign-in. Only the exchange with the Worker carries that
  secret.
- Reason: another app on the Mac can claim the `conductive://` scheme. A
  code that such an app catches is of no use without the secret.
- The Mac app accepts only its exact handoff address, and only while a
  sign-in that it started waits. It ignores every other `conductive://`
  address.
- The Mac app exchanges the code with the Worker for its own sign-in
  session. The scripts of the page never get the code or a session token.
- After a failed exchange, the user can start sign-in again.
- The Mac app writes no handoff code and no session token to its logs.

## GitHub App install

- Install the GitHub App opens GitHub in the user's default browser, as
  each other web address does.
- After the install, the browser shows a page that tells the user to go
  back to the Mac app. When an owner of the GitHub account must approve
  the install, the page says so.
- The Mac app reads the installs and the steps of Get started again when
  its window gets the focus.
- A `conductive://` address that opens the Mac app after the install was
  rejected. Reason: the Mac app accepts only the address of its sign-in.

## The sign-in session

- The Mac app has its own sign-in session, with its own session cookie.
  Only the cookie store of the Mac app holds that cookie.
- The cookie is HttpOnly, Secure, and SameSite=None. Reason: the page calls
  the API from the desktop origin, so a SameSite=Lax cookie does not go
  with those calls.
- The session cookie of the browser keeps SameSite=Lax, as
  [Access and security](access-and-security.md#sign-in) says.
- The Worker reads the cookie of the Mac app on a request whose `Origin`
  header is the desktop origin.
- It also reads that cookie on a GET of the exact launch address of a port
  preview without an `Origin` or an `Upgrade` header. When such a GET
  carries the cookie of the Mac app, the Worker reads no other session
  cookie.
- Reason: the window loads the launch address in a frame, and a navigation
  sends no `Origin` header. Such a GET returns only the launch page or a
  browser launch. No other origin can read either reply.
- Every other request uses only the session cookie of the browser. Reason:
  a frame in the window, such as a port preview, then cannot use the
  session of the Mac app for the API.
- The sign-in session stays across launches of the Mac app, until it
  expires or the user signs out. A suspension of the user ends it too, as
  [Operator actions](operator-actions.md#sessions-and-sign-in) says.
- Sign out ends the sign-in session of the Mac app, and removes its
  cookie.

## The Worker and the desktop origin

- The gate of `app.conductive.build` accepts the desktop origin wherever
  it accepts the app origin.
  [Access and security](access-and-security.md#hostnames-and-gates) states
  that gate.
- The API uses CORS to allow requests with credentials from the desktop
  origin. Its CORS headers name only the desktop origin, and never another
  origin.
- Every API response carries `Vary: Origin`.
- A preflight from the desktop origin needs no sign-in, and it gives no
  access. It allows the methods of the API, and `Content-Type` as the only
  request header outside the CORS safelist.
- The gate then needs a JSON body, or raw bytes on the two attachment
  upload routes, as
  [Attachment uploads](access-and-security.md#attachment-uploads) says
  (decision 144).
- The hostname for machines, `api.conductive.build`, and the preview
  domain, `conductive.page`, never accept the desktop origin.
