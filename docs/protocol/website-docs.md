# Website docs

This doc holds the requirements and the decisions in force for the public
docs. The public docs are the guides to the product on the marketing site,
at `conductive.build/docs`. A guide is one page of the public docs. The
overview is the guide at `/docs`. This doc covers how the site builds the
guides, their access, their addresses, their navigation, and the rules for
their words. The terms are those of the
[architecture doc](../architecture.md#terms). The
[marketing mockups](../mockups/marketing-site.md#the-docs) draw the layout
of the guides, at `marketing/docs` in the
[catalogue](../mockups/catalogue.md).

## How the site builds the docs

- The team writes each guide as a Markdown file in this repository. Each
  change to a guide then gets the review of a pull request.
- The marketing site builds the guides into static pages, in the same
  build as its other pages. The guides have a layout of their own, with the
  header, the footer, and the design tokens of the site.
- Reason: the guides keep the design of the site and its policy, which
  allows no script.
- Starlight, the docs add-on for Astro, was rejected. Its search and its
  other controls need scripts, so its pages need a policy that allows
  scripts. Its layout also needs overrides to match the site.
- A hosted docs service and a separate docs build were rejected. Reason:
  the one Astro build of the site keeps one design and one policy for all
  its pages.
- The site publishes none of the team's own docs, such as this doc.
  Reason: they hold internal requirements, and they name the sandbox
  provider.
- The public docs have no search. Reason: a search in the browser needs a
  script. A later search needs its own decision on its policy and its
  route.

## Access

- The public docs need no sign-in, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says
  for the marketing site.
- The Worker serves a guide as it serves the other pages of the site. A
  guide gets the same methods and response headers.
- The content security policy of a guide allows no more than the policy of
  the other pages of the site. It allows no script and no style attribute.
- A guide runs no script. Each part of a guide works with scripts off, also
  the menus of a phone.
- A guide sets no cookie.
- A guide loads files only from the site. It loads no font, picture,
  style, or script from another host.

## Addresses

- The overview has the address `/docs`. Each other guide has the address
  `/docs/<id>`, such as `/docs/get-started`.
- The ID of a guide holds only lowercase ASCII letters, digits, and
  hyphens.
- Each guide has one address. This holds also for the overview.
- Every other address under `/docs` shows the page of the site for an
  unknown address, with status 404. An example is an address that ends in
  a slash, such as `/docs/`.

## Page identity

- The front matter of each guide gives its title, its description, its
  group, and its order.
- The top of a guide shows the group, then the title, then the description
  as the lead. The title is the one main heading of the page.
- The browser title of a guide names the guide and the product, as on the
  other pages of the site. The head of the page gives the description of
  the guide.
- The body of a guide starts at heading level two.
- A field that is missing, or that has no valid value, takes its default:
  - title: the ID of the guide
  - description: none, so the page shows no lead
  - group: Start
  - order: after each guide of its group that has an order
- A valid title or description is text that is not empty. A valid group is
  Start, Work, or Manage. A valid order is a number.
- A field that is missing or not valid does not stop the build. A build
  error for such a field was rejected, because the defaults keep the guide
  readable.

## Navigation

- The header and the footer of the site link to the overview, with the
  name Docs. The header keeps the link on a phone.
- On a guide, the header marks Docs as the current section, for sight and
  for screen readers.
- Each guide lists every guide in three groups, in this order: Start, Work,
  and Manage.
- In a group, a guide with a lower order comes first. A guide without an
  order comes after the guides with one. Guides with the same order, or
  with none, follow the ASCII order of their IDs.
- The list marks the current guide, for sight and for screen readers.
- The foot of each guide links the previous and the next guide in the
  order of the list. The first guide has no previous link. The last guide
  has no next link.

## Contents and section links

- Each guide lists its level-two headings under "On this page", in the
  order of the page. Each item links to its heading.
- A guide without a level-two heading shows no "On this page".
- Each level-two heading has a fragment of its own. The address of a
  section is the address of its guide with that fragment, such as
  `/docs/get-started#sign-in`.
- The fragment comes from the words of the heading. So new words in a
  heading give its section a new address.
- A reader copies the address of a section from "On this page". A heading
  has no link of its own.
- A link on each heading was rejected. It needs a custom step in the
  Markdown build, and "On this page" already gives the address of each
  section.
- Only level-two headings show, so that the list stays short in the box of
  a phone.

## Layout

- A guide follows the desktop and the phone layouts of the
  [marketing mockups](../mockups/marketing-site.md#the-docs).
- The page never scrolls sideways. A long line of code or a wide table
  scrolls inside its own box.
- A guide follows the colour scheme of the visitor, as the other pages of
  the site do.
- Code shows the colours of its syntax in both colour schemes.

## Phones and keyboards

- On a phone, the guide list is in a "Docs menu" bar under the header.
  "On this page" is in a box under the lead. Both are closed at first.
- Each opens and closes in place, without a script. Touch, a pointer, and
  a keyboard can each open it.
- On a phone, each link and each bar of the docs navigation is a target at
  least 44 px high.
- A keyboard reaches each link and each control of a guide in the order of
  the page. Each shows a visible focus ring while it has focus.
- A keyboard can focus and scroll each code block and each table that
  scrolls. While it has focus, it shows the focus ring. It has a name for
  screen readers.

## Words of the guides

- A guide is for the users of the product. It uses the words of the
  product, not the names of internal parts.
- A guide describes only what the current product offers. A requirement in
  a protocol doc alone does not show that a feature is available.
- A guide does not describe a hidden or planned feature as available. For
  example, the app hides the live desktop of a sandbox, as
  [Desktop](workspace-tools.md#desktop) says.
- A guide promises no download, capability, or limit that the product does
  not have.
- The guides are part of the marketing site. So
  [Names in the product](agents-and-sessions.md#names-in-the-product) and
  [The provider](workspaces-and-sandboxes.md#the-provider) apply to them.
- A guide does not link to the team's internal docs, plans, or source
  files in this repository. It names no file path in this repository.
  Reason: these are written for the team, and some of them name the
  sandbox provider.
- This rule covers only this repository. A guide can show example paths of
  a user's own repository.

## Security in the guides

- A guide holds no real secret, such as a key, a token, a password, or the
  value of a secret env var. An example uses a value that is clearly not
  real.
- A guide claims no protection that
  [Access and security](access-and-security.md) does not state.
- A guide that says who can reach code, logins, tokens, or env vars gives
  the facts of Access and security. An example is
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox).
- A guide agrees with the Terms and Privacy pages of the site.
