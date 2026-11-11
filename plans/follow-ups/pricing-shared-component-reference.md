# Pricing guide names an unlisted shared part

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the documentation preservation audit on branch `calummoore/conductor-import-option`.
- **Location:** `src/marketing/pricing-page.md:73` and `src/marketing/key-code.md`.
- **Reason:** The incorrect claim came unchanged from main and needs one separate documentation correction.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Marketing code map:** `src/marketing/key-code.md`, the linked list of site files that maintainers open first.
  - **Section introduction:** `src/marketing/components/SectionIntro.astro`, a shared introduction used by the pricing page's cloud-hours section.
- **Background:** Conductive's public site has a pricing page. Its internal guide names shared components and points to the marketing code map. The cloud-hours component imports and renders the section introduction.
- **Problem:** The pricing guide says the code map names `SectionIntro.astro`. Neither the code map nor its README stub names that file. The claim was already incorrect before the code map moved out of the README.
- **Impact if no action:** A maintainer cannot find the promised entry through the guide's code-map link.
- **Root question:** How should the pricing guide lead a maintainer to its shared section introduction?
- **Options:**
  - **A.** Replace the code-map claim for this component with a direct link to its source file in the pricing guide. Effort: Small.
  - **B.** Add the missing component entry to the canonical marketing code map. Keep the guide's existing link and claim. Effort: Small.
- **Left out:** Only two useful approaches remain because the component exists and its behavior needs no change. Change nothing retains the incorrect promise. Remove the component mention gives no route to the shared part.
- **Wider fix:** None. The documentation skill already places code entry points in the area README or its linked code map.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the promised entry in the canonical code map and avoids another source list in the pricing guide.
- **Action:** fix after merge, apply B, because this unchanged main claim belongs in a separate documentation change.

`src/marketing/components/HoursRules.astro` imports `SectionIntro` from `./SectionIntro.astro` and renders it with the section label, title, and text. The component file exists. The other examples in the guide's sentence, `ClosingCall.astro` and `access-copy.ts`, already appear in the code map.

No product change, test, new requirement, or new gate is needed. Check the changed Markdown links and confirm the code-map entry names the current component.
