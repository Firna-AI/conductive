# The home page keeps two copies of some words

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from Milestone 5 of the plan for the Mac app downloads, branch `calummoore/mac-app-downloads-site`.
- **Location:** `src/marketing/pages/index.astro:41`, `:63`, `:64`, and `:77`, and `docs/mockups/src/screens/MarketingScreen.tsx:42`, `:70`, `:71`, and `:77`.
- **Reason:** the branch moved only the hero sentence, the footer tagline, and the words of the site actions into shared exports.

- **Terms:**
  - **Shared words:** `src/marketing/features.ts`, which the Astro site and the mockups both read. It holds the feature texts, the Mac app section, and `productSummary` with the hero sentence and the footer tagline.
- **Background:** The mockups in `docs/mockups/` are the visual spec of the marketing site at `conductive.build`. The site is built with Astro from `src/marketing/`. The shared words keep one source for each text that both show.
- **Problem:** The hero title "Give every coding task its own cloud computer.", the grid title "Less to look after." and its sentence, and the closing title "Give your next task its own cloud computer." each have one copy in the site and one in the mockups. No test compares the copies.
- **Impact if no action:** A change of one copy leaves the other old, so the site and its visual spec show different words.
- **Root question:** How do the site and the mockups read each text of the home page from one place?
- **Options:**
  - **A.** Move these words into the shared words, next to `productSummary`, and make the site and the mockups read them. Effort: Small.
- **Left out:** A test that compares the copies: it keeps the copies. Only one approach removes them, so the item has one option.
- **Wider fix:** A.
- **Previous examples:** The feature texts moved into `src/marketing/features.ts` on 8 November 2026. The hero sentence and the tagline moved there on 9 November 2026. The words of the site actions, Sign up and Download for Mac, moved into `siteActionCopy` in `src/marketing/access-copy.ts` on 10 November 2026.
- **Recommendation:** A. It removes the last copies of the words of the home page.
- **Action:** fix after merge, apply A, because the files are outside the scope of the Mac app downloads.
