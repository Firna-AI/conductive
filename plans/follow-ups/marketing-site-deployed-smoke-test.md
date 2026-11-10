# Smoke-test the deployed Astro marketing site

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-08, from the branch `calummoore/astro-marketing-site-switch`, the post-merge task of its plan. Extended on 2026-11-09 from `calummoore/conductor-feature-parity-list` with the Conductor Cloud comparison page.
- **Location:** None.
- **Reason:** The check needs the change deployed to `conductive.build`, which happens only after the merge.

- **Background:**
  - Astro builds the marketing pages into `public/_site/` during `npm run build`. Vite copies the folder into the Worker's static assets, and `wrangler deploy` uploads it.
  - The Worker serves the built pages on `conductive.build`, fills in the app origin and the year of each request, and answers a missing build with `503` and a warning.
  - The agreement page before GitHub comes from the same build. The app host shows it when a sign-in starts without the current Terms revision, such as the browser sign-in of the Mac app.
  - The site also has the Conductor Cloud comparison page at `/from-conductor`. Its rows, statuses, dates, and words come from `src/marketing/from-conductor/`. The link "From Conductor Cloud? Compare the features" above the home headline and the link "From Conductor Cloud" in the Product column of the footer lead to it. `docs/protocol/conductor-cloud-comparison.md` states its requirements.
  - Each push to `main` deploys `conductive.build` through the `Deploy` workflow, as `docs/automatic-deploys.md` says.
  - The branches checked all of this with `npm run build` and `npm run preview`, but not on Cloudflare.
- **Task:**
  1. Wait until the `Deploy` workflow of the merge commit ends with a pass in GitHub Actions. Do not deploy by hand, because the workflow also publishes the runner archive and applies the D1 migrations, as "Steps of a run" in `docs/automatic-deploys.md` says.
  2. Open `https://conductive.build/`, `/terms`, `/privacy`, `/from-conductor`, and an unknown address such as `/missing`.
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
- **Impact if no action:** A deployment that leaves out the site files would show visitors an empty `503` on `conductive.build`, and nobody would notice until a visitor reports it. A broken comparison page or entry link would leave Conductor Cloud users without the list while they move.
- **Needs:** The merged change, deployed to the production Worker.
- **Done when:** Each page, the comparison page with both entry links, and the agreement page show on the deployed site with today's headers, and the logs show no site warning.
