# Smoke-test the deployed Astro marketing site

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-08, from the branch `calummoore/astro-marketing-site-switch`, the post-merge task of its plan. Extended on 2026-11-09 from `calummoore/conductor-feature-parity-list` with the Conductor Cloud comparison page. Extended on 2026-11-09 from `calummoore/docs-section-brainstorm` with the public Markdown guides. Extended on 2026-11-10 from `calummoore/billing-brainstorm` with the pricing page.
- **Location:** None.
- **Reason:** The check needs the change deployed to `conductive.build`, which happens only after the merge.

- **Background:**
  - Astro builds the marketing pages into `public/_site/` during `npm run build`. Vite copies the folder into the Worker's static assets, and `wrangler deploy` uploads it.
  - The Worker serves the built pages on `conductive.build`, fills in the app origin and the year of each request, and answers a missing build with `503` and a warning.
  - The agreement page before GitHub comes from the same build. The app host shows it when a sign-in starts without the current Terms revision, such as the browser sign-in of the Mac app.
  - The site also has the Conductor Cloud comparison page at `/from-conductor`. Its rows, statuses, dates, and words come from `src/marketing/from-conductor/`. The link "From Conductor Cloud? Compare the features" above the home headline and the link "From Conductor Cloud" in the Product column of the footer lead to it. `docs/protocol/conductor-cloud-comparison.md` states its requirements.
  - The site also builds twelve public Markdown guides at `/docs` and `/docs/<id>`. They use the same file list and security headers, with native phone menus and an "On this page" link to each section. The header and the footer link to `/docs`. `docs/protocol/website-docs.md` states their requirements.
  - The site also has the pricing page at `/pricing`. Its plans, prices, cloud hours, and words come from `src/marketing/pricing.ts`. The desktop header and the Product column of the footer link it. The phone header has no Pricing link, so a phone reaches the page from the footer. The page sells nothing, and it has no note that Conductive is free until billing starts. `docs/protocol/pricing.md` states its requirements.
  - Each push to `main` deploys `conductive.build` through the `Deploy` workflow, as `docs/automatic-deploys.md` says.
  - The branches checked all of this with `npm run build` and `npm run preview`, but not on Cloudflare.
- **Task:**
  1. Wait until the `Deploy` workflow of the merge commit ends with a pass in GitHub Actions. Do not deploy by hand, because the workflow also publishes the runner archive and applies the D1 migrations, as "Steps of a run" in `docs/automatic-deploys.md` says.
  2. Open `https://conductive.build/`, `/terms`, `/privacy`, `/from-conductor`, `/pricing`, and an unknown address such as `/missing`.
  3. Check with `curl -sI` that each page has `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a content security policy that allows styles only by hash. Check that no page sends a `Set-Cookie` header.
  4. Check that each sign-in link leads to `https://app.conductive.build/`, that the footer shows the current year, and that the pictures, the font, and `/favicon.ico` load.
  5. On the home page, follow the link above the headline. On another page, follow "From Conductor Cloud" in the Product column of the footer. Check that each link opens `https://conductive.build/from-conductor` with status `200`.
  6. On the comparison page, check these points against `src/marketing/from-conductor/` at the deployed commit:
     - The top says "Conductor Cloud features only.", and it gives the read-only day and the shut-down day of Conductor Cloud.
     - One table has the columns Area, Conductor Cloud feature, In Conductive, and Notes. It has one group for each area and one row for each feature. On 9 November 2026, that was 15 areas and 164 rows.
     - The status and the note of three rows from different areas match their files in `src/marketing/from-conductor/areas/`.
     - A row shows a due date only when its data has one. On 9 November 2026, no row had one, so each In progress and Planned row showed "No date yet".
     - The page source has no `<script` element.
     - In the light and the dark colour schemes, the icon of Not planned is red, In progress amber, Works differently green, Available green, Planned blue, and Under consideration grey. Each status also shows its word.
     - At a phone width, each row stacks its cells with its area on top, and the table does not scroll sideways.
  7. Start the browser sign-in of the Mac app, or open `https://app.conductive.build/api/auth/github` without the Terms version, and check that the agreement page shows with its styles and that Continue with GitHub works.
  8. Check the Worker logs for the warning "The built marketing site is not available."
  9. Open `https://conductive.build/docs` and `/docs/get-started`.
     Check their titles, guide bodies, font, and code colours in both colour schemes.
     Check their response headers as in the header check above. Neither response sets a cookie.
  10. With page scripts off, use the desktop sidebar and the phone Docs menu.
      Open and close "On this page" by keyboard, then follow one of its links to a section.
      Check the current guide, previous and next links, and the header and footer Docs links.
  11. Check that `/docs/overview` and `/docs/unknown-page` return 404.
      A HEAD request to `/docs/get-started` returns 200 with no body.
  12. On a desktop, follow Pricing in the header. On another page, follow Pricing in the Product column of the footer.
      Check that each link opens `https://conductive.build/pricing` with status `200`, and that the header marks Pricing as the current page.
      At a phone width, check that the header has no Pricing link and that the footer has it.
  13. On the pricing page, check these points against `src/marketing/pricing.ts` at the deployed commit, on a phone at 320 px and on a desktop, in both colour schemes:
      - The top shows the label, the title, and one sentence, with no note that Conductive is free until billing starts.
      - Four plans show, with no button, and no plan is marked as the best. On 10 November 2026 they were Free at $0 per month, with 20 cloud hours a month for the org and up to 3 workspaces that are not archived, then Plus at $20, Pro at $50, and Ultra at $200 per member per month, with 275, 700, and 2,750 cloud hours a month for each member and extra hours at $0.07 each.
      - The line under the plans says "All prices are monthly, in US dollars. Prices exclude VAT and sales tax." No text says that checkout adds the tax.
      - How cloud hours count gives 4 vCPU and 8 GB, one pool for the org, every minute of every cloud computer, the stop after 30 minutes without activity, and the monthly limit of extra hours that an org admin sets.
      - The last call to action has Sign up and Download for Mac, with the sentence that a new account waits for access.
      - The page source has no `<script` element, no text names Boat, and the page does not scroll sideways.
- **Impact if no action:** A deployment that leaves out the site files would show visitors an empty `503` on `conductive.build`, and nobody would notice until a visitor reports it. A broken comparison page or entry link would leave Conductor Cloud users without the list while they move. A broken guide or Docs link would leave visitors without the public guides. A broken pricing page or Pricing link would show visitors no prices, or prices that differ from the agreed plans.
- **Needs:** The merged change, including the public Markdown guides and the pricing page, deployed to the production Worker.
- **Done when:** Each page, the comparison page with both entry links, and the agreement page show on the deployed site with today's headers, and the logs show no site warning.
  The public guides show there with the same headers.
  The docs navigation and keyboard controls work with page scripts off.
  The pricing page shows the plans of `src/marketing/pricing.ts` on a phone and a desktop, with the same headers, and its header and footer links open it.
