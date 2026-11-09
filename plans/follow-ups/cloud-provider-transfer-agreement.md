# Confirm the cloud provider's UK transfer agreement

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the legal-page review on `calummoore/privacy-and-terms-draft`, finding 1.
- **Location:** The "Transfers to other countries" section of `src/marketing/privacy.ts` and the legal sources in `src/marketing/README.md`.
- **Reason:** Only the operator can confirm a private agreement or request one from the provider.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Operator:** Firna Ltd, which runs Conductive and controls the personal data described in its Privacy notice.
  - **Provider:** Dedale AI, Corp., which provides Boat and runs the cloud computers in Firna's own account.
  - **Data processing agreement:** A contract that sets the provider's duties when it processes personal data for Firna.
  - **UK Addendum:** The UK's approved addition to the European Commission's standard contractual clauses for international transfers.
- **Background:**
  - Conductive sends workspace code, files, credentials, and service requests to the provider.
  - The provider is a US company. Its public Privacy Policy reports cloud computers and snapshots in Germany, Finland, and France.
  - The same policy describes other processing in the US and elsewhere. EU hosting alone does not prove that all access stays in the EU.
  - Its public policy says that it is not an Article 28 data processing agreement. It offers a separate agreement on request.
  - No supplied document or repository record shows whether Firna obtained that separate agreement with UK transfer terms.
  - The Privacy notice now states the verified published arrangements. It does not claim that Firna signed an agreement that the evidence cannot show.
- **Problem:** The notice cannot name the provider's applicable safeguard for other UK transfers until Firna confirms the agreement.
- **Impact if no action:** The provider's transfer disclosure remains incomplete. The public policy does not establish Firna's processor contract.
- **Root question:** Has Firna signed a provider agreement that covers UK transfers, and which safeguard does it apply?
- **Options:**
  - **A.** Verify the actual agreement and name its safeguard in the existing Privacy notice. Keep the legal email for copies. Effort: Medium.
  - **B.** Put the same verified information in a separate transfer notice and link to it. This adds another maintained page. Effort: Medium.
  - **C.** State only the arrangements that published terms prove. This has been applied. It does not establish the missing private agreement. Effort: Small.
  - **D.** If no agreement exists, obtain one with UK transfer terms from the provider. Then apply A. The provider controls its response time. Effort: Medium.
- **Left out:** Removing the section hides relevant information. Restoring a draft field conflicts with the requested public text. EU hosting alone cannot establish every safeguard.
- **Wider fix:** None. The legal-page rule and its source list already require accurate disclosures. Code cannot supply a private contract fact.
- **Previous examples:** None found for this provider agreement.
- **Recommendation:** A if Firna already has the agreement. Otherwise D, then A. Both routes establish the actual safeguard before the notice claims it.
- **Action:** ask the user, because only the operator can confirm or obtain this private agreement. C is already applied.

The operator can request the agreement at `support@ascii.dev`.
The request should name Firna Ltd and ask for the terms that cover UK personal data, including any UK Addendum or international data transfer agreement.
After verification, update only the Privacy notice's effective date if its text changes.
Do not change the Terms revision unless the Terms text also changes.

Sources checked on 9 November 2026:

- [Provider Privacy Policy](https://boat.dev/privacy), sections PP-2 and PP-6, effective 12 October 2026.
- [Provider Terms](https://boat.dev/terms), which offer a separate data processing agreement on request.
- [Article 13 of the UK GDPR](https://www.legislation.gov.uk/eur/2016/679/article/13), including the disclosure of transfer approvals or safeguards.
