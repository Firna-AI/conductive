# Smoke-test the deployed Astro marketing site

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-08, from the branch `calummoore/astro-marketing-site-switch`, the post-merge task of its plan. Extended on 2026-11-09 from `calummoore/conductor-feature-parity-list` with the Conductor Cloud comparison page. Extended on 2026-11-09 from `calummoore/docs-section-brainstorm` with the public Markdown guides. Extended on 2026-11-10 from `calummoore/from-conductor-timestamp-and-links` with the check time, the row links, and the local Conductor features of the comparison page. Extended on 2026-11-10 from `calummoore/billing-brainstorm` with the pricing page. Changed on 2026-11-13 from `calummoore/lisbon-kf2q`, which removed the pricing page. Changed on 2026-11-13 from `calummoore/lima-3p3p`, which removed the comparison page.
- **Location:** None.
- **Reason:** The check needs the change deployed to `conductive.build`, which happens only after the merge.

- **Background:**
  - Astro builds the marketing pages into `public/_site/` during `npm run build`. Vite copies the folder into the Worker's static assets, and `wrangler deploy` uploads it.
  - The Worker serves the built pages on `conductive.build`, fills in the app origin and the year of each request, and answers a missing build with `503` and a warning.
  - The agreement page before GitHub comes from the same build. The app host shows it when a sign-in starts without the current Terms revision, such as the browser sign-in of the Mac app.
  - The site also builds twelve public Markdown guides at `/docs` and `/docs/<id>`. They use the same file list and security headers, with native phone menus and an "On this page" link to each section. The header and the footer link to `/docs`. `docs/protocol/website-docs.md` states their requirements.
  - The site has no pricing page since 2026-11-13, because the product is free. `/pricing` gives the page for an unknown address.
  - The site has no Conductor comparison page since 2026-11-13. `/from-conductor` gives the page for an unknown address.
  - Each push to `main` deploys `conductive.build` through the `Deploy` workflow, as `docs/automatic-deploys.md` says.
  - The branches checked all of this with `npm run build` and `npm run preview`, but not on Cloudflare.
- **Task:**
  1. Wait until the `Deploy` workflow of the merge commit ends with a pass in GitHub Actions. Do not deploy by hand, because the workflow also publishes the runner archive and applies the D1 migrations, as "Steps of a run" in `docs/automatic-deploys.md` says.
  2. Open `https://conductive.build/`, `/terms`, `/privacy`, and an unknown address such as `/missing`.
  3. Check with `curl -sI` that each page has `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a content security policy that allows styles only by hash. Check that no page sends a `Set-Cookie` header.
  4. Check that each sign-in link leads to `https://app.conductive.build/`, that the footer shows the current year, and that the pictures, the font, and `/favicon.ico` load.
  5. Start the browser sign-in of the Mac app, or open `https://app.conductive.build/api/auth/github` without the Terms version, and check that the agreement page shows with its styles and that Continue with GitHub works.
  6. Check the Worker logs for the warning "The built marketing site is not available."
  7. Open `https://conductive.build/docs` and `/docs/get-started`.
     Check their titles, guide bodies, font, and code colours in both colour schemes.
     Check their response headers as in the header check above. Neither response sets a cookie.
  8. With page scripts off, use the desktop sidebar and the phone Docs menu.
      Open and close "On this page" by keyboard, then follow one of its links to a section.
      Check the current guide, previous and next links, and the header and footer Docs links.
  9. Check that `/docs/overview` and `/docs/unknown-page` return 404.
      A HEAD request to `/docs/get-started` returns 200 with no body.
  10. Check that `/pricing` returns 404 with the page for an unknown address, and that no header or footer link names Pricing.
  11. Check that `/from-conductor` returns 404 with the page for an unknown address, and that no header or footer link leads to it.
- **Impact if no action:** A deployment that leaves out the site files would show visitors an empty `503` on `conductive.build`, and nobody would notice until a visitor reports it. A broken guide or Docs link would leave visitors without the public guides. A broken pricing page or Pricing link would show visitors no prices, or prices that differ from the agreed plans.
- **Needs:** The merged change, including the public Markdown guides, deployed to the production Worker.
- **Done when:** Each page and the agreement page show on the deployed site with today's headers, and the logs show no site warning.
  The public guides show there with the same headers.
  The docs navigation and keyboard controls work with page scripts off.
  `/pricing` and `/from-conductor` return 404, and no site link names either.
