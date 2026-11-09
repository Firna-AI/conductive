# Writing the public guides

The public guides are the public docs of the marketing site, at `/docs`
and `/docs/<id>`. This page gives the rules and the steps for their
authors. [Website docs](../../docs/protocol/website-docs.md) states the
requirements of the guides.
[The docs](../../docs/mockups/marketing-site.md#the-docs) of the marketing
mockups is their visual spec. The mockup pages hold example words, not
the final guides.

The site builds one page from each guide file.
[Public docs](README.md#public-docs) in the marketing README says which
guides exist and names the code that builds them.

## Where a guide goes

- Each guide is one Markdown file in `src/marketing/docs/`. Give the file
  the extension `.md`, and put it directly in that folder. The site reads
  no other extension and no subfolder.
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
- Only the file name gives the ID, also when the front matter has a
  `slug` field. So name the file with its ID, such as `get-started.md`
  for `/docs/get-started`.
- `overview.md` is the overview. Its only address is `/docs`, so
  `/docs/overview` is an unknown address. Keep this file, because the
  Docs links of the header and the footer lead to it.
- The Worker accepts the path of a built file only with ASCII letters,
  digits, `_`, `.`, and `-`. Another character, such as an accented
  letter, makes it reject the whole file list. Every page of the site then
  answers 503.

The top of `get-started.md` is an example:

```markdown
---
title: Get started
description: Get access, connect GitHub and an agent, and create your first workspace from a message.
group: Start
order: 20
---

## Before you start
```

| Field | What to write | Where the page shows it | Default |
| --- | --- | --- | --- |
| `title` | The name of the guide | The menu, the main heading, the browser title, and the previous and next cards | The ID |
| `description` | A short summary of the guide | The lead under the title, and the description in the head of the page | None, so the page has no lead |
| `group` | `Start`, `Work`, or `Manage`, with its capital letter | The group in the menu, and the label above the title | `Start` |
| `order` | A number without quotes, such as `30` | The place of the guide in its group | After each guide of its group that has an order |

- An empty value, or a value that is not valid, takes the default. The
  build does not stop. For example, `order: "30"` is text, so the guide
  goes after the guides of its group that have an order.
- Put a value in quotes when it holds a colon and a space, such as
  `title: "Step one: sign in"`. Without quotes, YAML cannot read the front
  matter, and the build stops at that file.
- The menu sorts the guides by group: Start, then Work, then Manage. In a
  group, a lower order comes first. Guides with the same order, or with
  none, follow the ASCII order of their IDs. The previous and next cards
  use the same order.
- The current guides use orders in steps of 10, such as `10` and `20`.
  Keep this step, so that a later guide can go between two others.
- [Source references](#source-references) lists the launch guides in the
  order of the menu.

## The body

- Write the lead in `description`, not in the body. The page shows the
  group, the title, and the lead, then "On this page", then the body.
- Start the body at `##`. The layout shows the title, so the body has no
  `#` heading.
- "On this page" links each `##` heading. The address of a section comes
  from the words of its heading. When you change those words, update each
  link to that section.
- The fragment of a section is the words of its heading in lowercase, with
  a hyphen for each space and no punctuation. So "Create your first
  workspace" gives `#create-your-first-workspace`.
- A second heading with the same words gets `-1` at the end of its
  fragment, and a third gets `-2`.
- A `###` heading can divide a section. "On this page" lists only the `##`
  headings.
- Put a guide action, such as the next page to open, alone in a list
  item. On a phone, its link is then a 44 px target that covers no other
  text. A link inside a sentence stays allowed.
- The build marks each link that is alone in its list item, also in a
  list with blank lines between its items. So a guide action needs no
  HTML of its own. A link inside a sentence keeps the height of the text.
- Link to another guide by its address, such as `/docs/get-started`.
- Write the product name as text. Markdown cannot read
  `docs/mockups/src/brand.ts`, so a rename of the product changes the
  guides too.

A guide action can link to the overview:

```markdown
- [Read the Overview](/docs)
```

### Links

- Start each link to a page of the site with `/`, such as `/docs`,
  `/docs/get-started`, `/terms`, or `/privacy`. Such a link works on each
  host of the site, also in a local preview.
- Do not end an address with `/`. The site answers `/docs/` and
  `/docs/get-started/` with the page for an unknown address.
- Add the fragment of a section to link to it, such as
  `/docs/get-started#create-your-first-workspace`.
- The current guides send readers to the app with **Sign in** in the site
  header, not with an address. The address of the app is different in a
  local preview and on the deployed site.

### Code and tables

- Give each code fence a language, such as `bash`. Use `text` for a block
  that is not code, such as a sample message.
- Prism gives each token of a known language a class. The site colours
  these classes in both colour schemes.
- A fence without a language shows plain text. An unknown language also
  shows plain text, and the build logs a warning.
- A long line of code scrolls inside its block. A wide table first wraps
  its words, then scrolls inside its own box. So the page never scrolls
  sideways.
- The build gives each code block and each table keyboard focus and a
  name, so that a keyboard can scroll it. A code block is a region named
  "Code example". A table takes the words of its header row as its name,
  such as "Agent, Login, What to enter".
- So write no HTML and no script for this. Give each table a header row
  with clear words. A header row without words gives the name "Table".
- Write the guide in Markdown. The pages allow no script and no `style`
  attribute, as [Access](../../docs/protocol/website-docs.md#access) says.

## Preview a guide

Run each command from the repository root, with the setup that
[Development](README.md#development) gives.

1. Run `npm run site:dev`. Open `http://localhost:4321/docs`, or
   `http://localhost:4321/docs/<id>` for another guide. The page reloads
   after each edit. If a new guide does not show, start the command again.
2. Check the menu, the group, the lead, "On this page", and the previous
   and next cards. A wrong field shows there, not as a build error.
3. Open each link and each section address of the guide.
4. Make the window narrower than 760 px. Open the Docs menu and "On this
   page". Scroll each code block and each table.
5. Run `npm run site:build`. It writes `docs.html` and `docs/<id>.html`
   into `public/_site/`, with the file list. Read its log for a warning,
   such as an unknown code language.
6. Run `npm run dev`, and open `http://localhost:5173/docs`. The Worker
   then serves the guide with the headers and the policy of the site.
   Start the command again after each change, because the Worker reads the
   file list only once.
7. Run the site tests with `npm run test -- worker/marketing src/marketing`.
   They build the whole site, with the guides, and serve its pages through
   the Worker. So a guide that breaks the file list fails them.

The development server of `npm run site:dev` adds scripts of its own. So
check the absence of scripts and the policy through the Worker.

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

## Requirement sources

These docs own the contract of the public guides and their layout:

- [Architecture](../../docs/architecture.md#marketing-site).
- [Access and security](../../docs/protocol/access-and-security.md#hostnames-and-gates).
- [Product names](../../docs/protocol/chat-and-events.md#names-in-the-product).
- [The provider](../../docs/protocol/workspaces-and-sandboxes.md#the-provider).
- The [marketing README](README.md).
- The [marketing mockups](../../docs/mockups/marketing-site.md).
- [Website docs](../../docs/protocol/website-docs.md) owns the public guide requirements.

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
