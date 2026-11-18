# The own endpoint form accepts a preview host that the save refuses

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from review round 1 of branch `calummoore/cli-proxy-setup`, listed outside the scope of its area.
- **Location:** `src/shell/account/EndpointFields.tsx`, which calls `readEndpointAddress` of `src/shared/endpoint-address.ts` without the preview domain, and the save route in `worker/app-api/boot.ts`, which passes `env.PREVIEW_DOMAIN` as a refused domain.
- **Reason:** The own endpoint change chose that the browser form need not know the preview domain.

- **Terms:**
  - **Own endpoint login:** an agent login that sends the model requests of an agent to a gateway or a proxy that the user chose, with the user's key.
  - **Preview domain:** the domain of the port previews of the cloud computers, `conductive.page` in the deployment, set in `PREVIEW_DOMAIN` of `wrangler.jsonc`.
- **Background:**
  - One rule checks each own endpoint address in the form, at the save, at the dispatch of a turn, and in the gateway. It refuses a name in the domains of the app and of the previews.
  - The form shows a refusal at the endpoint field before the save. It refuses the product domain, but it does not know the preview domain.
  - The save refuses an address in the preview domain with HTTP 400 and the code `invalid_endpoint`, and the form then shows the refusal.
- **Problem:** The form shows no refusal for a preview host until the user presses Connect.
- **Impact if no action:** A user who enters a preview address sees the refusal one step later.
- **Root question:** How does the form refuse each address that the save refuses, before the save?
- **Options:**
  - **A.** Give the browser the preview domain, for example in the account data or the app configuration, and pass it to the rule in the form. Effort: Small.
  - **B.** Change nothing, because the save refuses the address with the same text. Effort: Small.
- **Left out:** A second rule in the browser, because one rule must decide which addresses work.
- **Wider fix:** None. The shared rule is already the wider fix.
- **Previous examples:** None found.
- **Recommendation:** A, if the app already sends its configuration to the browser. Otherwise B.
- **Action:** fix after merge, apply A, because the change is outside the area that the review covered.
