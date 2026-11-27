# Frame sources

This page belongs to [Deployment inputs](../deployment.md). It gives the
origins of `CONDUCTIVE_FRAME_SOURCES`, which let the Desktop tab show
the desktop stream of a sandbox.

`CONDUCTIVE_FRAME_SOURCES` lists the origins that the pages of the app can
show in a frame, in addition to the port previews. The Desktop tab shows
the desktop stream of a sandbox in such a frame.

- The value is a list of HTTPS origins, separated by spaces. An origin is
  `https://`, a host, and an optional port, with no path. A host can start
  with `*.` to cover each subdomain.
- List the desktop stream hosts as `https://*.on.boat.dev`, the domain of
  Boat's sandbox hosts. Boat's [desktop guide](https://docs.boat.dev/desktop-streaming/urls-and-security)
  shows the stream host only as `<sandbox-desktop-host>`, and Boat
  generates it for each running sandbox. A list of exact hosts was
  rejected, because it fails for each new workspace.
- A sandbox on E2B has no desktop stream, so E2B needs no entry.
- The wildcard also lets the pages of the app frame any other page on a
  Boat sandbox host, also a page of another Boat customer. To use this, an
  attacker first needs a way to put HTML into a page of the app.
- A desktop URL carries its token in the fragment. Put no token or other
  secret in the value.
- The Worker gives each page of the app a content security policy. Its
  frame sources are the page's own origin, `https://*.<PREVIEW_DOMAIN>`,
  and each origin of the value. The Worker leaves out each entry that is
  not an HTTPS origin, such as an `http://` address or an address with a
  path.
- Without the variable, a page frames only its own origin and the port
  previews. The Desktop tab then cannot show a stream.
- The Mac build reads its own `CONDUCTIVE_FRAME_SOURCES`, as the
  [Mac app README](../../desktop/README.md#development) says. It does not add
  the preview domain itself. So give the Worker and the Mac build the same
  value: `https://*.<PREVIEW_DOMAIN> https://*.on.boat.dev`. The Worker
  lists the preview origin only once.
