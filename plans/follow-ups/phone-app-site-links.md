# Phone app links still reach the site frame

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, the wider fix of review finding 5.
- **Location:** `docs/mockups/src/components/marketing/LegalLinks.tsx`, `docs/mockups/src/components/marketing/CatalogueText.tsx`, `src/ui/components/settings/skillsTrustCopy.ts:28`, and the phone-app context of `docs/mockups/src/components/tools/`.
- **Reason:** the fix changes shared parts that the web pages and the marketing pictures also draw, so it reaches views outside the phone mockups of the branch that found it.

- **Source:** Review. **Category:** mockup.
- **Terms:**
  - **Phone apps:** the iOS app and the Android app that the Expo app builds. The `phone-app` folder of the mockup catalogue draws the states that only they have.
  - **Site frame:** the header and the footer of the pages of the marketing site. `docs/protocol/pricing.md` requires that they link Pricing.
  - **In-app browser:** the browser view of the system that opens over a phone app, with Done.
- **Background:**
  - A design call of the universal Expo app plan, of 23 November 2026, says that no pricing or checkout shows in the phone apps.
  - The phone sign-in links Terms and Privacy to pages of the app host without the site frame, in the in-app browser. Its sign-in frame takes these destinations as props.
  - Other shared parts still link to pages of the site from phone pages. "How trust works" in the Cloud computer settings opens the public docs, from `src/ui/components/settings/skillsTrustCopy.ts:28`. The docs have the site frame, so a phone app reaches Pricing in two taps.
  - The phone mockups already mark the phone app with one context that the shared tab parts read.
- **Problem:** Each shared part keeps its own web destination. A phone page that draws such a part links to the site frame with Pricing.
- **Impact if no action:** the phone mockups, and Milestone 22 after them, keep paths to Pricing that the design call rules out.
- **Root question:** Which page does each link from a phone page to the site open, so that no path reaches the home page or Pricing?
- **Options:**
  - **A.** Fix each link where a phone page draws it, with a prop, as the sign-in frame does. Effort: Medium.
  - **B.** Give the phone-app context one map of destinations for each link to the site. `SignInFrame`, `LegalLinks`, `CatalogueText`, and the guide links read it. Terms and Privacy go to the pages of the app host. The home page, Pricing, and the docs get no link, or a page without the site frame. Add a design call that lists each page of the site that a phone app opens. Effort: Medium.
  - **C.** Show each such page in a screen of the app, not in a browser. An old copy of the app then shows old words. Effort: Large.
- **Left out:** removing Pricing from the site frame for all visitors, because `docs/protocol/pricing.md` requires it.
- **Wider fix:** B, because a new shared part then reads the same map.
- **Previous examples:** the phone sign-in linked Terms and Privacy to the framed marketing pages, until the fix of review finding 5 of pull request #671.
- **Recommendation:** B. One map keeps every phone page away from the site frame.
- **Action:** fix after merge, apply B, because it changes shared parts that views outside the phone mockups also draw.
