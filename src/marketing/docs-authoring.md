# Writing the public guides

The public guides are the public docs of the marketing site, at `/docs`
and `/docs/<id>`. This page gives the rules and the steps for their
authors. [Website docs](../../docs/protocol/website-docs.md) states the
requirements of the guides.
[The docs](../../docs/mockups/marketing-site.md#the-docs) of the marketing
mockups is their visual spec. The mockup pages hold example words, not
the final guides.

The first two guide files are ready. The routes and docs layout do not
serve them yet.

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

## Source references

The table gives the page title of each guide, its public path, and its
source for requirements. The writer must also inspect the current screens
and code before making a product claim, as [Claims](#claims) says. The
source paths below remain internal. Public guides link to other public
pages.

| Page | Public path | Internal source |
| --- | --- | --- |
| Overview | `/docs` | [Architecture](../../docs/architecture.md) |
| Get started | `/docs/get-started` | [Orgs and members](../../docs/protocol/orgs-and-members.md#get-started) |
| Agent logins | `/docs/agent-logins` | [Chat and events](../../docs/protocol/chat-and-events.md#agents), [Security](../../docs/protocol/access-and-security.md) |
| Workspaces | `/docs/workspaces` | [Create a workspace](../../docs/protocol/create-a-workspace.md), [Workspaces](../../docs/protocol/workspaces-and-sandboxes.md) |
| Sessions and chat | `/docs/sessions-and-chat` | [Chat and events](../../docs/protocol/chat-and-events.md) |
| Files and changes | `/docs/files-and-changes` | [Workspace tools](../../docs/protocol/workspace-tools.md#files-and-changes) |
| Terminal and previews | `/docs/terminal-and-previews` | [Workspace tools](../../docs/protocol/workspace-tools.md) |
| Pull requests | `/docs/pull-requests` | [GitHub banner](../../docs/protocol/github-banner.md) |
| Cloud computer | `/docs/cloud-computer` | [Org image](../../docs/protocol/workspaces-and-sandboxes.md#the-org-image) |
| Orgs and members | `/docs/orgs-and-members` | [Orgs and members](../../docs/protocol/orgs-and-members.md) |
| Mac app | `/docs/mac-app` | [Mac app](../../docs/protocol/desktop-app.md), [Releases](../../desktop/RELEASES.md) |
| Security | `/docs/security` | [Access and security](../../docs/protocol/access-and-security.md), [Agent tools](../../docs/protocol/agent-tools.md) |

- The Mac app guide must use the release state at writing time.
- The live sandbox desktop is currently hidden. Do not describe it as an
  available tool.
- The security guide must explain the access that agents have to
  repository code and credentials, in product language that matches the
  current requirements.
