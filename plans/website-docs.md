# Public website docs

Status: Active. On branch `calummoore/docs-section-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan. Cal approved implementation of Milestone 1 on 2026-11-09. Milestone 1 is complete. Cal approved all remaining milestones on 2026-11-09.

Conductive has a public Astro website, but no product guides. Add guides
written in Markdown at `conductive.build/docs`. Readers need no sign-in.
Keep the site's header, footer, design tokens, and policy that blocks scripts.

On 2026-11-09, Cal answered `1 = B` to the attached brainstorm.
Cal chose a custom docs layout in the existing Astro build.
Starlight was the alternative. It offers search, but its scripts need a
different content security policy. The selected approach keeps one design
and the current policy. The decision below records the choice.

[Requirement sources](../src/marketing/docs-authoring.md#requirement-sources) in the author page lists the contract owners.

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
  Use the ID for a missing or empty title, an empty description, the first group, and last position for missing metadata.
- Order groups as Start, Work, and Manage. Sort by group, then numeric order, then ASCII ID.
  This keeps navigation stable across builds. Overview, Get started, and Agent logins form Start.
  Workspaces through Pull requests form Work. The last four guides form Manage.
- Use Astro's content rendering and generated heading IDs. Use those headings for the page contents links.
  Interpret heading links as option G. This avoids a second parser and custom self-link plugins.
  Omit the contents when no level-two heading exists, so readers see no empty list.
- Put the title in the layout. Begin the Markdown body at heading level two.
  This gives each page one main heading and its own description. The browser title names the guide and the product.
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

These agent calls are also dated 2026-11-09. The Milestone 1 mockups showed the need for them.

- Title the org-image guide "Cloud computer", at `/docs/cloud-computer`.
  This matches the app's Cloud computer tab and the finished mockup. The old title and address have not shipped.
- Show the guides, the page, and its contents list as three columns on a wide desktop.
  Both side columns stay in view while the page scrolls, so a reader can move on at any point.
  Below 1120 px, put the contents in a box under the lead, so the page keeps a readable width.
  On a phone, put the contents in a second native disclosure, closed at first. It needs no script, and the body stays near the top.
- Show the group above the title, and the front-matter description under it as the lead. An empty description shows no lead.
  The contents box sits between the lead and the body, so the body cannot supply the lead.
- Link only level-two headings in the contents. Guides begin at that level, and a short list fits the phone box.
- Style the plain elements of the rendered body under one class. Markdown gives its headings, lists, and tables no classes.
  A table wraps its words first and then scrolls by itself, so it needs no wrapper or plugin.
- On a phone, show Docs, the GitHub mark alone in a 44 px square named GitHub, and Sign in.
  The links then fit beside the wordmark on a 360 px phone.
  On docs pages, mark Docs in the header as the current section. This also orients the reader.
- Give each link and disclosure of the docs pages the site's 2 px focus ring. Draw it inside menu rows and phone bars.
  An outer ring would be clipped there.
- The mockup guides put each guide action, such as a page to open next, alone in a list item.
  On a phone, that link is then a 44 px target that covers no other text.
  The author steps describe this pattern. It adds no check, and links in sentences stay allowed.

This agent call is also dated 2026-11-09. Commit af96807 on `main` changed app access, so Milestone 2a corrects the access copy of the docs mockups.
Milestone 2b takes the first writing task of Milestone 3, because the writing can proceed while 2a corrects the sample copy. Both read the same requirements and change different files, so they can run in parallel.

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

The launch keeps 12 guides. [Source references](../src/marketing/docs-authoring.md#source-references) in the author page lists each guide with its public path, sources, and writing notes. That page outlives this plan.

## Milestone 1: Docs mockups completed

Tags: mockup

Depends on: none

The `ui implementor` creates the visual spec before any implementation.

- [x] Add a docs overview and a representative guide under the marketing catalogue.
      Show a sidebar, page contents, heading links, lists, a table, code, and adjacent-page links.
- [x] Add phone variants with the docs menu closed and open. Check keyboard use and visible focus.
      Show light and dark schemes. Keep each catalogue page within the five-screen limit.
- [x] Update the shared marketing header and footer with the Docs link.
      Preserve the Mac download links if present. Check the combined phone header.
      Connect the new mockups through real catalogue navigation.
- [x] Run `npm run mockups:check`. Open the changed pages and compare both layouts.
      Save screenshots under `.context/website-docs/`.
- [x] Update this plan's design and TODOs for each problem that the mockups show.

Evidence: `.context/website-docs/milestone-1/` holds `ui-report.md`, `parent-smoke/report.json`, and `link-check.md`.

## Milestone 2: Requirements and maintenance docs completed

Depends on: 1

The `docs implementor` records the selected public behaviour before implementation.

- [x] Add a public docs protocol under `docs/protocol/`.
      Record public paths, navigation, script-free access, naming, and content accuracy.
      Record B and the rejected Starlight alternative with their reason.
- [x] Link that protocol from the architecture doc and the root README.
      Describe public guides as a responsibility of the existing website.
- [x] Update the marketing README and mockup docs for the new pages and author workflow.
      Keep planned code entry points aligned as later milestones add them.
- [x] Keep the legal-page rule unchanged. Add separate public-guide maintenance guidance in `AGENTS.md` and the marketing README.
      Read the Terms and Privacy pages in full when changing facts in the protocol or architecture.

Evidence: `.context/website-docs/implementation/m2-docs-report.md` and `m2-markdown-check.md`.

## Milestone 2a: App access in the docs mockups completed

Tags: mockup

Depends on: 1, 2

Since commit af96807 on `main`, a new account waits for app access before Get started. The `ui implementor` corrects the docs mockups for it.

- [x] Update the Get started sample for app access through the waitlist and invite codes. Keep the approved layout.
- [x] In [The marketing site](../docs/mockups/marketing-site.md), the desktop header still names "Start free with GitHub". Change it to "Join the waitlist".
- [x] Run `npm run mockups:check`. Compare the changed views on a desktop and a phone, with each phone disclosure open.
- [x] Update this plan's design and TODOs for each problem that the changed mockups show.

## Milestone 2b: Overview and Get started guides completed

Depends on: 2

The `external docs implementor` writes the first two guides, in parallel with Milestone 2a.

- [x] The `external docs implementor` writes the complete Overview and Get started Markdown pages.
      Follow the current onboarding flow, including the automatic first org-image build.
      Also follow the current app access flow, with the waitlist and invite codes, as [Waitlist](../docs/protocol/waitlist.md) says.

## Milestone 2c: Brand clear space and guide styles in the mockups completed

Tags: mockup

Depends on: 2a

- [x] Keep the brand clear space of the 30 px lockup in the mockup footer and phone header. In the mockup docs, match the site's styles for long words, `###` headings, and guide actions. Run the mockup check. Agent call dated 2026-11-09: the 60 px phone header keeps the 30 px lockup and required clear space within a 360 px phone.

## Milestone 3: Markdown collection and docs layout completed

Tags: ui

Depends on: 1, 2, 2a, 2b, 2c

The `ui implementor` builds the approved design in Astro, with the mockups of Milestone 2a and the guides of Milestone 2b.
The site stays usable with a complete overview and Get started guide.

- [x] The `ui implementor` adds the content collection and integrates the two completed guides.
- [x] Add `/docs` and `/docs/<page>` through Astro's static page generation.
      Use collection metadata and the documented defaults and sorting for navigation. Add no new metadata-rejection gate.
- [x] Add the docs layout with the site's existing header, footer, and tokens.
      Match the mockups, including heading links and the native phone menu.
- [x] Add Docs to both site navigation areas and the shared path helpers.
      Preserve existing links, request markers, legal pages, and the unknown-address page.
      Match the phone header of the mockups. In the mockups, it has about 30 px to spare at 390 px.
      If the Mac downloads header is on `main`, first check the combined phone header in the mockups.
- [x] Add code styles with Prism classes. Check long code, tables, and URLs on a phone.
      Let a keyboard focus and scroll each code block or table that scrolls.
      Give it a visible ring and a name, as the mockup's install script has.
- [x] The `docs implementor` updates the marketing README's author steps and code entry points.
      Describe the guide-action list item from the design calls.
      Check `npm run site:build` and open the pages through the Worker. Evidence: `.context/website-docs/implementation/astro-ui/results.md`.

## Milestone 4: Complete the public guides

Depends on: 3

The `external docs implementor` writes the remaining ten guides and checks all 12.

- [ ] Write the remaining ten launch guides that [Source references](../src/marketing/docs-authoring.md#source-references) lists.
      Explain the user's actions, prerequisites, results, and relevant recovery steps.
- [ ] Confirm each claim against the current requirements and implementation.
      Distinguish the Mac app from the hidden live desktop of a sandbox.
      Do not promise a download, capability, or limit that has not shipped.
- [ ] Check the naming rules and all public page and heading links.
      Keep internal source paths and credentials out of published pages.
- [ ] Check each guide in the site build.
      The `docs implementor` updates the author workflow if writing exposes a missing step.

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

Depends on: 1, 2, 2a, 2b, 2c, 3, 4, 5

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
