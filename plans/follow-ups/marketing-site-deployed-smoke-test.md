# Smoke-test the deployed Astro marketing site

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-08, from the branch `calummoore/astro-marketing-site-switch`, the post-merge task of its plan.
- **Location:** None.
- **Reason:** The check needs the change deployed to `conductive.build`, which happens only after the merge.

- **Background:**
  - Astro builds the marketing pages into `public/_site/` during `npm run build`. Vite copies the folder into the Worker's static assets, and `wrangler deploy` uploads it.
  - The Worker serves the built pages on `conductive.build`, fills in the app origin and the year of each request, and answers a missing build with `503` and a warning.
  - The agreement page before GitHub comes from the same build. The app host shows it when a sign-in starts without the current Terms revision, such as the browser sign-in of the Mac app.
  - The branch checked all of this with `npm run build` and `npm run preview`, but not on Cloudflare.
- **Task:**
  1. Deploy the merged change: run `npm run build`, then `npx wrangler deploy`. The build writes `.wrangler/deploy/config.json`, which points the deploy at `dist/conductive/wrangler.json` and the assets in `dist/client/`. Check that `dist/client/_site/site-files.json` exists before the deploy.
  2. Open `https://conductive.build/`, `/terms`, `/privacy`, and an unknown address such as `/missing`.
  3. Check with `curl -sI` that each page has `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a content security policy that allows styles only by hash.
  4. Check that each sign-in link leads to `https://app.conductive.build/`, that the footer shows the current year, and that the pictures, the font, and `/favicon.ico` load.
  5. Start the browser sign-in of the Mac app, or open `https://app.conductive.build/api/auth/github` without the Terms version, and check that the agreement page shows with its styles and that Continue with GitHub works.
  6. Check the Worker logs for the warning "The built marketing site is not available."
- **Impact if no action:** A deployment that leaves out the site files would show visitors an empty `503` on `conductive.build`, and nobody would notice until a visitor reports it.
- **Needs:** The merged change, deployed to the production Worker.
- **Done when:** Each page and the agreement page show on the deployed site with today's headers, and the logs show no site warning.
