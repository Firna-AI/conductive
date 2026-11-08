# Desktop backend

This area gets a new desktop stream URL for a workspace.
The production route dispatcher does not call this handler yet.
The browser uses the [shared desktop contract](../../src/shared/desktop.ts).

Call `createDesktopHandler(env, dependencies).fetch(request)` for the shared
desktop GET path. The handler checks sign-in, Origin, current org membership,
and workspace ownership. It calls the desktop API on each load.
A workspace whose owner is suspended gets 403 `user_suspended` before any
call to Boat, as [Sandbox access](../operator/README.md#sandbox-access) says.
It returns the URL and its expiry with `Cache-Control: no-store`.
It accepts only HTTPS URLs with a fragment token and no URL credentials.
It keeps query-token URLs and provider error details out of the response.

The URL permits a new connection for 10 minutes. An already-open stream
continues after that time. Reload and reconnect need a new URL, as the
[official desktop guide](https://docs.boat.dev/desktop-streaming/urls-and-security#how-long-a-desktop-url-works)
says. The lifecycle owner must not cache the URL.

An org suspension refuses a new desktop address with 403 `org_suspended` before any provider call.
The message gives the abuse address.

### Key Code

- [handler.ts](handler.ts) exports `createDesktopHandler`.
- [The tools adapter](../previews/provider.ts) checks access and maps the provider's ready or starting result.
- [The sandbox provider](../sandbox/README.md) owns the fixed desktop route and its typed parser.

See [access and security](../../docs/protocol/access-and-security.md#desktop).
