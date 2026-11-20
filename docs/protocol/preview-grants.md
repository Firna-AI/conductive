# Preview grants

This doc holds the requirements and the decisions in force for the load
of a preview: its launch address, its one-use grant, the authorizer, the
browser launch of the Mac app, the credential cookie, and a launch at a
path. It belongs to
[Terminal, previews, and desktop](terminal-previews-and-desktop.md#port-previews),
which states the other rules of the preview domain. The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. An HTML
preview decision number names a decision of the change that shows HTML
files rendered, as [HTML file preview](html-file-preview.md) says.

## The launch

- The API gives each preview a launch address on the app's hostname. The
  address holds no secret, because each load needs the sign-in and access
  to the workspace.
- Each load of the launch address, in a frame or in a tab, gets a new
  grant. A form on the launch page posts the grant to the authorizer, a
  fixed hostname on the preview domain. The authorizer sets the credential
  cookie, then sends the browser to the preview hostname, at the path of
  the launch when it names one.
- Only pages on the app origin and on the desktop origin of the
  [Mac app](desktop-app.md#the-page) can frame the launch page.
- A grant works for 60 seconds at most, and only for its own preview. It
  works only once (decision 95). A reusable grant was rejected, because a
  copy of a used grant could give a second browser access for the life of
  the preview.
- A used grant gets the same 404 as an invalid grant. The reply sets no
  cookie, and no sandbox gets a request.
- A request that fails any other check, such as a wrong `Origin` or the
  hostname of another preview, leaves its grant unused.
- A grant never goes to a sandbox or into a log. It never goes into the
  path or the query of a URL. A grant in a query was rejected, because
  the browser sends the query to the server.
- The launch page sends only the app's origin as its referrer. Reason:
  under `no-referrer`, the form sends `Origin: null`, and the authorizer
  refuses it.

## The browser launch

- Only a [browser launch](desktop-app.md#port-previews) carries a grant in
  a URL. The grant, the preview hostname, and the path of the launch go in
  the fragment of an authorizer address, because a browser sends no
  fragment to a server.
- Risk: the browser can keep that address in its history. The grant in it
  works only once, and it stops working within 60 seconds.
- At that address, the authorizer serves its own page, the authorizer
  page. No page can frame it. Before any request or navigation, the page
  removes the fragment from its address.
- The authorizer page goes only to the preview address that its fragment
  names: the preview hostname, at the path of the fragment when it holds
  one. Any other reply ends in the failure of the page.

## The authorizer

- The authorizer accepts a grant in two ways. Each needs one preview
  hostname and one valid grant for an active preview:
  - a form POST with the app's `Origin`, from the launch page. The
    authorizer then sends the browser to the preview address.
  - a POST with the authorizer's own `Origin` and the grant in its
    `Authorization` header, from the authorizer page. The authorizer then
    returns the preview address, and the page goes there.
- The preview address is the path of the launch on the hostname of the
  redeemed preview, as [Launch paths](#launch-paths) says. Without a path,
  it is the root of that hostname.
- Both ways set the same credential cookie. The authorizer never serves
  sandbox content.
- Reason: a service worker of a previewed app can read a form that the
  browser posts to the origin of that preview. A handoff on the preview
  hostname was rejected for that reason.
- Authorizer form bodies have a size limit of 1,000,000 bytes under decision 65.
  The authorizer cancels an oversized body and returns 404.
- The authorizer never reads or buffers the body of a POST with an
  `Authorization` header.

## The credential cookie

- The credential cookie is HttpOnly, Secure, SameSite=None, and
  Partitioned. It expires no later than its preview.
- Reason: a frame under the app is a third-party context, where browsers
  can block a cookie that is not partitioned. A partitioned cookie works
  there, but only under the top-level site that set it. So a frame and a
  tab each get their own cookie, and another site that frames a preview
  gets none.

## Launch paths

- The launch address takes an optional `path` query (HTML preview
  decision 3 A). The path names a file by its path from the top of the
  repository, such as `reports/index.html`.
- A valid path is not empty and holds no NUL. No segment of it, split at
  `/`, is empty, `.`, or `..`.
- A launch address whose path is not valid gets HTTP 400 with the error
  code `invalid_input`, and no grant, as a file read refuses such a path.
- The grant of a launch holds its path, encrypted. A browser launch also
  carries the path in its fragment, so that the authorizer page can check
  the preview address, as [The browser launch](#the-browser-launch) says.
- The authorizer sends the browser to the path of the redeemed grant. The
  preview address keeps each character of a valid path, also a lone CR, a
  lone LF, CR LF, a tab, and a backslash.
- Reason: a browser changes each lone CR and each lone LF of a form field
  to CR LF. The grant is encrypted text with no line break. So it arrives
  unchanged, and a changed grant is not valid.
- The credential cookie holds no path, because it opens the whole preview
  hostname.
- The authorizer builds the preview address from `https://`, the hostname
  of the redeemed preview, and each segment of the path, percent-encoded.
  It never reads the path as an address. Reason: a path such as
  `\/evil.example/x` then stays on the preview hostname.
- For one release, a launch with a path also sends it in the request:
  - The launch page posts the path in a field of its form.
  - The authorizer page posts the path of its fragment in the query of its
    POST.
- For the same release, the authorizer also reads a path from the request.
  It uses that path only for a grant that holds no path. When the grant
  holds a path, the authorizer uses the path of the grant.
- Reason: in a deploy or a rollback, the
  [previous Worker](../automatic-deploys.md#migrations-and-the-previous-worker)
  runs beside the new Worker. An older Worker reads the path only from the
  request, and its grants hold no path.
- The authorizer checks the path of the grant and a path in the request
  before the redemption. A path that is not valid gets the same 404 as an
  invalid grant, and the grant stays unused.
- A launch without a path opens the root of its preview hostname.
- Only the tab of an HTML file sends a path, as
  [HTML file preview](html-file-preview.md) says. A local address in chat
  text still opens its preview without its path, as
  [Port previews](port-previews.md) says.
- Reason: a frame and a new tab each need their own load, because the
  browser keeps their cookies apart. A path in the launch opens the page
  of a file in one load and on one origin, with no migration.
- These options of HTML preview decision 3 were not chosen:
  - A files preview for each HTML file, with its path stored in the
    preview. It needs a migration, and each file gets a new origin, so
    pages share no storage.
  - A load of the root, then a move of the frame to the file. It needs two
    loads for each show, shows the root first, needs a reply that gives
    the hostname, and Open in a new tab still needs a path in the launch.
- A start page at the root of the file server that reads the path from
  the fragment was rejected. The root of the file server is the top of the
  repository, where its own `index.html` lives.
- These ways to keep the path exact were not chosen, though each keeps
  it exact:
  - The path in the form in a reversible ASCII encoding.
  - The path in the query of the form's action.
- Reason: the chosen way binds the path of the launch to its grant. So the
  redirect needs no separate path from the browser.
- These ways to keep the path while two Workers run together were not
  chosen:
  - A marker of the new format in the fragment, because it adds a field
    and a branch to the authorizer page.
  - A check of the authorizer page that also accepts the root of the
    preview hostname. The page could then go to an address that the reply
    does not name.
  - A new grant from the outer Worker for each browser launch of an older
    Worker. It adds grant work to the shared route, and it misses the
    addresses that the previous outer Worker gave out.
- These ways were rejected:
  - A refusal of a path with a line break, because such a path names a
    valid file.
  - A change of each CR LF back to LF, because a lone CR, a lone LF, and
    CR LF all arrive as CR LF.
  - A `fetch` of the authorizer from the launch page, because the cookie
    then belongs to the site of the app, and Open in a new tab gets none.
  - A form body in `multipart/form-data` or `text/plain`, because a
    browser changes its line breaks too.
