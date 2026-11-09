# Public website docs

Status: Active. On branch `calummoore/docs-section-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan. Implementation waits for the user's approval of this plan.

Conductive has a public Astro website, but no product guides. Add guides
written in Markdown at `conductive.build/docs`. Readers need no sign-in.
Keep the site's header, footer, design tokens, and policy that blocks scripts.

On 2026-11-09, Cal answered `1 = B` to the attached brainstorm.
Cal chose a custom docs layout in the existing Astro build.
Starlight was the alternative. It offers search, but its scripts need a
different content security policy. The selected approach keeps one design
and the current policy. The decision below records the choice.

Contract owners:

- [Architecture](../docs/architecture.md#marketing-site).
- [Access and security](../docs/protocol/access-and-security.md#hostnames-and-gates).
- [Product names](../docs/protocol/chat-and-events.md#names-in-the-product).
- [The provider](../docs/protocol/workspaces-and-sandboxes.md#the-provider).
- The [marketing README](../src/marketing/README.md).
- The [marketing mockups](../docs/mockups/marketing-site.md).
- Milestone 2 adds the public docs protocol under `docs/protocol/`.

## Decision 1: Choose how the website builds its docs

- **Status:** Answered. Cal chose B on 2026-11-09.
- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/`.
- **Terms:**
  - **Astro:** The tool that builds the marketing website into static pages.
  - **Content collection:** Astro's reader for content files and their page metadata.
  - **Starlight:** An Astro add-on that supplies a docs layout and browser search.
  - **Content security policy:** A response header that limits what a page can load and run.
  - **Prism:** A tool that colours code with CSS classes.
- **Background:** Astro builds the website, and the Worker serves the built files. The site runs no script and sets no cookie.
- **Problem:** The website has no product guides. Users cannot learn the product from public docs.
- **Impact if no action:** Visitors must sign in or ask for help to learn how the product works.
- **Root question:** How should the website publish product docs that the team writes in Markdown?
- **Options:**
  - **B.** Add a Markdown content collection and a custom Astro layout at `/docs` and `/docs/<page>`. Reuse the site's header, footer, and tokens. Add a desktop sidebar, heading links, and a phone menu that needs no script. Use Prism classes for code. Keep the current policy and tests. Search is absent at launch. Cost: maintain the layout. Effort: Large.
  - **C.** Add Starlight to the same Astro build at `/docs`. Reuse the site's header and footer through overrides. Get search, navigation, and code-copy controls. Cost: permit scripts on docs pages and maintain the overrides. Update the policy and the no-script tests for those pages. Effort: Large.
  - **D.** Apply B with only Overview and Get started at launch. Defer ten guides. This reduces the first review, but leaves most product questions unanswered. Effort: Large.
  - **E.** Apply B with plain code blocks. This saves the code-colour CSS, but makes examples harder to scan. Effort: Large.
  - **F.** Apply B with guide-to-protocol source lists in front matter. Read only the listed guides after a protocol change. This reduces reading, but a missing source link can leave a guide stale. Effort: Large.
  - **G.** Apply B with heading links only in the page contents list. Readers copy a section address from that list. This avoids a custom Markdown plugin. Effort: Large.
- **Left out:**
  - **A**, Mintlify: it serves pages outside the chosen Astro build and uses its own scripts.
  - Starlight with its scripts removed: it replaces most of the features that justify the add-on.
  - Docs inside the app: they would not be part of the public website.
  - Publish the team's `docs/` folder: it contains internal requirements and provider names.
  - A separate GitHub docs repository: its pages would not be part of the website.
  - A database editor: the Markdown files would not be reviewed through repository pull requests.
  - A separate docs build: it repeats the site's layout and breaks the selected single-build approach.
  - Rendering React mockup parts as docs pages: the Astro decision chose authored Astro pages over rendering mockup parts.
  - Change nothing: it leaves the request unmet.
- **Wider fix:** None. This decision adds a feature.
- **Previous examples:** PR #74 moved this website to Astro. The site and its legal mockups already share content.
- **Recommendation:** B. It keeps one design and the current policy without browser scripts.
- **Action:** Apply B, as Cal chose on 2026-11-09. The earlier request for a decision is closed.

Shared assumptions and their sources:

- The docs are public. Source: the website request and the marketing site's access rule.
- The team writes Markdown in this repository. Source: the request and the chosen Astro approach.
- The pages follow the site's design. Source: option B and the repository's mockup rule.
- The pages name neither the sandbox provider nor a different product name. Source: the naming requirements linked above.
- The guides describe available product behaviour. Source: the product requirements and the current implementation.
  A protocol requirement alone does not prove that a feature is available.
- The selected approach keeps scripts and cookies absent. Source: option B.
  Option C gives the alternative that permits scripts.

## Design calls

These are agent calls dated 2026-11-09. They implement the selected approach.

- Store the Markdown collection under `src/marketing/`, beside its layouts.
  The team's `docs/` files remain unpublished on the website. The repository itself is public.
- Use each file's collection ID for its address. Reserve the overview entry for `/docs`.
  Other entries use `/docs/<id>`. This gives each guide one address.
  Author IDs in lowercase ASCII kebab-case, as the existing Worker file list requires.
- Keep title, description, group, and order in front matter. Derive navigation and adjacent pages from those entries.
  This keeps one page list. Use metadata defaults instead of adding custom schema failures or build validation.
  Use the ID for a missing title, an empty description, the first group, and last position for missing metadata.
- Order groups as Start, Work, and Manage. Sort by group, then numeric order, then ASCII ID.
  This keeps navigation stable across builds. Overview, Get started, and Agent logins form Start.
  Workspaces through Pull requests form Work. The last four guides form Manage.
- Use Astro's content rendering and generated heading IDs. Use those headings for the page contents links.
  Interpret heading links as option G. This avoids a second parser and custom self-link plugins.
- Put the title in the layout. Begin the Markdown body at heading level two.
  This gives each page one main heading and its own description.
- Use native `details` and `summary` for the phone docs menu.
  It works without script. Reuse the site's 760 px phone breakpoint and its colour schemes for visual consistency.
- Use the sorted navigation for previous and next links, so all navigation has the same order.
  Mark the current page in the sidebar to orient the reader.
- Use Prism classes and site-token CSS imported into the Astro layout.
  The existing build inlines the CSS and hashes it. A separate linked theme file would be blocked by the current policy.
- Launch with the 12 guides below. Publish complete guides, with no placeholder pages or pictures.
  This covers the main product tasks. D leaves most of them unexplained, and E saves little work.
  Search and links from inside the app can follow separately. Search needs its own policy and route decisions.
- Add Docs to the site's header and footer, in both layouts.
  These links make the guides discoverable. Preserve all existing GitHub, page, and sign-in links.
- Keep the existing legal-page rule intact. Add separate guide-maintenance guidance to `AGENTS.md` and the marketing README.
  Read the guides when a protocol fact changes, then update each affected claim in the same change.
  This applies the existing documentation-alignment duty to the new guides. F can miss a source that a guide omits from its list.
- Keep one Astro build and the existing Worker file list. Listed nested HTML pages already have public paths.
  Reusing that route avoids another host, service, database, or build command.

The Mac downloads plan on `calummoore/desktop-app-website-mention` changes
the same header, footer, and maintenance guidance. Merge its changes through
`main` before implementation when available. Preserve both sets of links.
The mockups must check that the combined navigation fits on a phone.

Options check: B remains the selected approach. G clarifies heading links.
The report is `.context/website-docs/options-check.md`.

Technical references:

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/).
- [Astro syntax highlighting](https://docs.astro.build/en/guides/syntax-highlighting/).

## Launch guides

The guide title is followed by its source for requirements. The writer must
also inspect the current screens and code before making a product claim.
The source paths below remain internal. Public guides link to other public pages.

| Page | Public path | Internal source |
| --- | --- | --- |
| Overview | `/docs` | [Architecture](../docs/architecture.md) |
| Get started | `/docs/get-started` | [Orgs and members](../docs/protocol/orgs-and-members.md#get-started) |
| Agent logins | `/docs/agent-logins` | [Chat and events](../docs/protocol/chat-and-events.md#agents), [Security](../docs/protocol/access-and-security.md) |
| Workspaces | `/docs/workspaces` | [Create a workspace](../docs/protocol/create-a-workspace.md), [Workspaces](../docs/protocol/workspaces-and-sandboxes.md) |
| Sessions and chat | `/docs/sessions-and-chat` | [Chat and events](../docs/protocol/chat-and-events.md) |
| Files and changes | `/docs/files-and-changes` | [Workspace tools](../docs/protocol/workspace-tools.md#files-and-changes) |
| Terminal and previews | `/docs/terminal-and-previews` | [Workspace tools](../docs/protocol/workspace-tools.md) |
| Pull requests | `/docs/pull-requests` | [GitHub banner](../docs/protocol/github-banner.md) |
| Org image | `/docs/org-image` | [Org image](../docs/protocol/workspaces-and-sandboxes.md#the-org-image) |
| Orgs and members | `/docs/orgs-and-members` | [Orgs and members](../docs/protocol/orgs-and-members.md) |
| Mac app | `/docs/mac-app` | [Mac app](../docs/protocol/desktop-app.md), [Releases](../desktop/RELEASES.md) |
| Security | `/docs/security` | [Access and security](../docs/protocol/access-and-security.md), [Agent tools](../docs/protocol/agent-tools.md) |

The Mac app guide must use the release state at writing time.
The live sandbox desktop is currently hidden. Do not describe it as an available tool.
The security guide must explain the access that agents have to repository
code and credentials, in product language that matches the current requirements.

## Milestone 1: Docs mockups

Tags: mockup

Depends on: none

The `ui implementor` creates the visual spec before any implementation.

- [ ] Add a docs overview and a representative guide under the marketing catalogue.
      Show a sidebar, page contents, heading links, lists, a table, code, and adjacent-page links.
- [ ] Add phone variants with the docs menu closed and open. Check keyboard use and visible focus.
      Show light and dark schemes. Keep each catalogue page within the five-screen limit.
- [ ] Update the shared marketing header and footer with the Docs link.
      Preserve the Mac download links if present. Check the combined phone header.
      Connect the new mockups through real catalogue navigation.
- [ ] Run `npm run mockups:check`. Open the changed pages and compare both layouts.
      Save screenshots under `.context/website-docs/`.
- [ ] Update this plan's design and TODOs for each problem that the mockups show.

## Milestone 2: Requirements and maintenance docs

Depends on: 1

The `docs implementor` records the selected public behaviour before implementation.

- [ ] Add a public docs protocol under `docs/protocol/`.
      Record public paths, navigation, script-free access, naming, and content accuracy.
      Record B and the rejected Starlight alternative with their reason.
- [ ] Link that protocol from the architecture doc and the root README.
      Describe public guides as a responsibility of the existing website.
- [ ] Update the marketing README and mockup docs for the new pages and author workflow.
      Keep planned code entry points aligned as later milestones add them.
- [ ] Keep the legal-page rule unchanged. Add separate public-guide maintenance guidance in `AGENTS.md` and the marketing README.
      Read the Terms and Privacy pages in full when changing facts in the protocol or architecture.

## Milestone 3: Markdown collection and docs layout

Tags: ui

Depends on: 1, 2

The `ui implementor` builds the approved design in Astro.
The site stays usable with a complete overview and Get started guide.

- [ ] Add the content collection and complete Overview and Get started Markdown pages.
      Follow the current onboarding flow, including the automatic first org-image build.
- [ ] Add `/docs` and `/docs/<page>` through Astro's static page generation.
      Use collection metadata and the documented defaults and sorting for navigation. Add no new metadata-rejection gate.
- [ ] Add the docs layout with the site's existing header, footer, and tokens.
      Match the mockups, including heading links and the native phone menu.
- [ ] Add Docs to both site navigation areas and the shared path helpers.
      Preserve existing links, request markers, legal pages, and the unknown-address page.
- [ ] Add code styles with Prism classes. Check long code, tables, and URLs on a phone.
- [ ] Update the marketing README's author steps and code entry points.
      Check `npm run site:build` and open the pages through the Worker.

## Milestone 4: Complete the public guides

Depends on: 3

The `external docs implementor` owns the public writing and reviews the first two guides.

- [ ] Complete all 12 launch guides from the table above.
      Explain the user's actions, prerequisites, results, and relevant recovery steps.
- [ ] Confirm each claim against the current requirements and implementation.
      Distinguish the Mac app from the hidden live desktop of a sandbox.
      Do not promise a download, capability, or limit that has not shipped.
- [ ] Check the naming rules and all public page and heading links.
      Keep internal source paths and credentials out of published pages.
- [ ] Check each guide in the site build. Update the author workflow if writing exposes a missing step.

## Milestone 5: Docs behaviour checks

Depends on: 3, 4

The `non-ui implementor` extends the existing marketing integration tests.

- [ ] Cover the overview and a nested guide through the real built site and Worker route.
      Check that a guide body reaches the page, contents links reach headings, and navigation uses the sorted collection.
      Test site integration, not Astro's parser or guide prose.
- [ ] Add the overview and a representative nested guide to the existing built-page checks.
      Keep the no-script, no-`style`-attribute, provider-name, asset, and style-hash checks.
      Existing route tests cover GET, HEAD, headers, cookie absence, method handling, and missing pages.
      Review every guide's naming manually. Add no new test of all guide prose.
- [ ] Prove each new test fails on its intended defect. Run each new asynchronous test 10 times.
      Record the failures, pass counts, and test cost under `.context/website-docs/`.
      Do not add tests of guide prose or third-party parser internals.

## Milestone 6: Verification, review, and pull request

Depends on: 1, 2, 3, 4, 5

The orchestrator owns the combined checks and the pull request.

- [ ] Run format, lint, file-length, and unused-export checks before the complete gate.
- [ ] Run `npm run test -- worker/marketing src/marketing`.
      Check all changed Markdown links.
- [ ] Open the built site through the Worker with scripts disabled.
      Check desktop and phone navigation, keyboard use, both schemes, heading links, code, and missing pages.
      Save evidence under `.context/website-docs/`.
- [ ] Install the desktop and runner check dependencies, then run `npm run check`.
      Keep every existing test assertion and security header requirement.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete diff against `origin/main` after the push with `implementation-review`.
      Report findings, apply the fix rule, record follow-ups, and re-review once.
      Wait for the last commit's CI result.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request into `main`.
      Include the dated decision, design calls, plan permalink, checks, and added follow-up items.

## Post-merge follow-up (non-blocking)

- [ ] Check `/docs`, a nested guide, navigation, and response headers on the deployed website.
      Record this as a follow-up item when deleting the plan.
