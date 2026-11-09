# Writing the public guides

The public guides are the public docs of the marketing site, at `/docs`
and `/docs/<id>`. This page gives the rules and the steps for their
authors. [Website docs](../../docs/protocol/website-docs.md) states the
requirements of the guides.
[The docs](../../docs/mockups/marketing-site.md#the-docs) of the marketing
mockups is their visual spec. The mockup pages hold example words, not
the final guides.

The site does not serve the guides yet. No route, docs layout, or guide
file exists.

## Where a guide goes

- Each guide is one Markdown file in `src/marketing/docs/`.
- Every file in that folder is for the public. Keep notes for authors,
  such as this page, outside that folder.
- Each push to `main` deploys the site. So treat a guide on `main` as
  public, and merge only a complete guide, with no placeholder text.

## Front matter and IDs

- The front matter gives `title`, `description`, `group`, and `order`.
  [Page identity](../../docs/protocol/website-docs.md#page-identity) gives
  the default of a missing field.
- The group is `Start`, `Work`, or `Manage`. The order is a number. A
  lower order comes first in its group.
- The ID of a guide is the last part of its address, such as
  `get-started` in `/docs/get-started`. Use only lowercase ASCII letters,
  digits, and hyphens.
- The Worker accepts the path of a built file only with ASCII letters,
  digits, `_`, `.`, and `-`. Another character, such as an accented
  letter, makes it reject the whole file list. Every page of the site then
  answers 503.

## The body

- Start the body at `##`. The layout shows the title, so the body has no
  `#` heading.
- "On this page" links each `##` heading. The address of a section comes
  from the words of its heading. When you change those words, update each
  link to that section.
- Put a guide action, such as the next page to open, alone in a list
  item. On a phone, its link is then a 44 px target that covers no other
  text. A link inside a sentence stays allowed.
- Link to another guide by its address, such as `/docs/get-started`.
- Write the product name as text. Markdown cannot read
  `docs/mockups/src/brand.ts`, so a rename of the product changes the
  guides too.

## Claims

- Write for the users of the product, in the words of the product. The
  copy rules of the `product-ui` skill apply.
- Check each claim against the current screens and code, not only
  against a protocol doc. A protocol requirement alone does not show that
  a feature is available.
- [Words of the guides](../../docs/protocol/website-docs.md#words-of-the-guides)
  and
  [Security in the guides](../../docs/protocol/website-docs.md#security-in-the-guides)
  give the rules for names, links, secrets, and the facts of access.
- [Public docs](README.md#public-docs) in the marketing README says when
  a change to the product also changes the guides.
