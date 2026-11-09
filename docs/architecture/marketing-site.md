# Marketing site

This page describes the marketing site, one component of the
[architecture doc](../architecture.md). It uses the terms of that doc. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Responsibilities

- A few static pages at the root of `conductive.build`: the home page, the
  Terms and Privacy pages, and the Conductor Cloud comparison page.
  Visitors see them without a sign-in.
- Astro builds these pages ahead of time. The Worker serves the built files
  on `conductive.build`. It fills in the values of each request, such as
  the app address in the sign-in links and the year in the footer.
- [The marketing site README](../../src/marketing/README.md) describes how
  the Worker serves them.
- The same build also makes the page that asks for the
  [agreement to the Terms](../protocol/access-and-security.md#sign-in)
  before the GitHub sign-in. The Worker serves that page on
  `app.conductive.build`.
- The main action is "Join the waitlist", because a new account waits for
  app access. The site does not name Boat, and users need no Boat account
  (decision 80).
- The home page has a Mac app section. It links the DMG for Apple silicon
  first, then the DMG for Intel, from the latest release of the public
  source repository on GitHub. It names the oldest macOS version that the
  app runs on. The footer links the section. In the desktop layout, the
  header links it too.
- The DMGs come from GitHub, not from the Worker.
  [Releases](../protocol/desktop-app.md#releases) states their addresses.

## The comparison page

- The page at `conductive.build/from-conductor` shows people who move from
  Conductor Cloud the status of each Conductor Cloud feature in Conductive.
  [Conductor Cloud comparison](../protocol/conductor-cloud-comparison.md)
  states its requirements.
- Its rows are content of the site. The team checks them against the
  product, and a change to a row is a change to the repository.
- No component computes a status while the site runs. The page reads
  nothing from the app, the API, or a sandbox.
- The site build and the mockup catalogue read the same rows, so the page
  and its mockup show the same words.
- The page shows a status and a short note for each row. The evidence
  behind a status stays out of the page and out of its rows.
