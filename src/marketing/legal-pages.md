# Legal pages

The [marketing site README](README.md#legal-pages) gives the pages of the
site and the rule for a change to a fact that the legal pages restate.
This page gives the operator, the shared text, and the sources for the
review of the Terms and Privacy pages.

The operator is Firna Ltd, registered in England and Wales.
`legalOperator` in `legal-text.ts` holds its company number, registered
office, and VAT number. Both pages use those details. Each page keeps its
own effective date. The Terms use the law of England and Wales and preserve
mandatory consumer protections.
The facts about the service come from the
[architecture doc](../../docs/architecture.md) and the
[protocol docs](../../docs/protocol/). The Privacy page names what the
waitlist, the invite codes, and each record of app access keep, the
GitHub token and the verified emails that each sign-in keeps, and Resend,
which sends the emails, from
[The record of app access](../../docs/protocol/waitlist.md#the-record-of-app-access).

The words of the legal pages, of the page for an unknown address, and of
the sign-in agreement are text without markup. `terms.ts` with
`terms-service.ts`, `terms-work.ts`, and `terms-org.ts`, `privacy.ts` with
`privacy-uses.ts`, `privacy-recipients.ts`, and `privacy-skills.ts`, and
`legal-text.ts` hold them.
`terms.ts` takes its "The service" section from `terms-service.ts`, its
"Your work" section from `terms-work.ts`, and its "Working in an org"
section from `terms-org.ts`. `privacy.ts` takes
its "What Conductive uses, and why" section from `privacy-uses.ts`, and
its "Who gets your data" section from `privacy-recipients.ts`. It takes
its "Org skills repositories" section from `privacy-skills.ts`.
`layouts/LegalPage.astro` and `components/RunningText.astro` build their
HTML for the site. The mockups and the sign-in screen of the app render the
same text with React. So every surface shows the same words.

Sources for the review:

- The ICO guidance on the privacy information to give:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/>.
  It lists the identity and the contact, the purposes and the lawful
  basis, the recipients, transfers to other countries, retention, the
  rights, and complaints. The Privacy page has a section for each.
- The [ICO guide to lawful bases](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/)
  explains contract, legitimate interests, and legal obligations.
- [Data protection complaints](https://www.gov.uk/data-protection/make-a-complaint)
  gives the contact details of the Information Commissioner's Office.
- [Article 13 of the UK GDPR](https://www.legislation.gov.uk/eur/2016/679/article/13)
  states the information that a notice must give about international transfers.
- The [UK-US data bridge guidance](https://www.gov.uk/government/publications/uk-us-data-bridge-supporting-documents/uk-us-data-bridge-factsheet-for-uk-organisations)
  and [its regulations](https://www.legislation.gov.uk/uksi/2023/1028/contents)
  cover transfers to US organisations certified under the UK Extension.
- [Cloudflare's data processing terms](https://www.cloudflare.com/cloudflare-customer-dpa/)
  and [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
  describe their published transfer protections.
- [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy),
  [its data processing terms](https://www.anthropic.com/legal/data-processing-addendum),
  and [OpenAI's data processing terms](https://openai.com/policies/data-processing-addendum/)
  describe protections under the account that an agent session uses.
- Boat's terms: <https://boat.dev/terms>. They cover the allowed use of
  the app's Boat organization, and they make the operator answer for what
  users do in it. The Terms and Privacy pages do not name the cloud computer
  provider or link to its terms. The Acceptable use section passes on
  those rules in its own words.
- [Boat's privacy policy](https://boat.dev/privacy) reports its EU hosting
  locations and says that an Article 28 agreement is available on request.
  Its public policy does not prove that Firna has that agreement.
- [E2B's terms](https://e2b.dev/terms) identify its contracting company as
  FoundryLabs, Inc., a Delaware corporation. They require written consent
  to give others access to its service and to build an application that
  interacts with it. The user reported on 20 November 2026 that E2B gave
  that consent for Conductive's hosted use.
- [E2B's privacy policy](https://e2b.dev/privacy) identifies the same US
  company and describes possible processing in the United States. It
  does not establish that all account, support, or other operations stay
  in the EU.
- [E2B's region table](https://docs.e2b.dev/faq/egress-ip-ranges) places
  its default region, `US`, in Google Cloud `us-west1`. It also says that
  E2B can run sandboxes in more than one Google Cloud region, and can
  change their place over time.
  [Google's location list](https://docs.cloud.google.com/workstations/docs/locations)
  identifies `us-west1` as The Dalles, Oregon, in the United States.
  [E2B's regional resource guide](https://docs.e2b.dev/faq/migrate-between-regions)
  says that each project belongs to one region, and that templates,
  sandboxes, and snapshots stay in the region of their project.
  Conductive's E2B project runs in the default region.
- [E2B's security page](https://e2b.dev/security) offers a data processing
  addendum through its Trust Center and a signed copy through
  `trust@e2b.dev`. The subprocessor list is also available on request.
  These public statements do not prove that Firna has signed terms or
  establish which international transfer safeguards apply to it.
- [The ICO's EEA guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/receiving-personal-information-from-the-eea/)
  confirms UK adequacy regulations for EEA countries. A selected EU
  sandbox region does not establish safeguards for other processing
  outside the EEA. Verify the provider's signed processing and transfer
  terms before describing a specific safeguard as applicable to Firna.

The Privacy page describes both cloud computer providers as companies
registered in the United States. It gives Boat's EU sandbox and snapshot
locations without naming the provider. It does not name E2B's US region,
because only test orgs run there. Before a real org runs on E2B, the page
names the United States and the protection of the transfer from the UK,
as [Regions](../../docs/protocol/provider-accounts.md#regions) says. The
page does not promise that every provider operation stays in the EU. It
makes no claim that Firna has signed E2B's data processing addendum,
standard contractual clauses, or UK transfer terms. The
[deployment guide](../../docs/deployment.md) gives the operator's setup
steps. Keep the E2B weight at zero until its processing terms are
confirmed.

Each sign-in accepts the current revision of the Terms. The agreement sits
beside Continue with GitHub, as
[Terms consent](../../worker/security/README.md#terms-consent) says. The
Terms page also has a Suspension section and a Report abuse section. The
[operator action](../../worker/operator/README.md) suspends an account.
The Suspension section explains how to request a review and warns that
a stopped cloud computer can lose its disk.

The footer and the Report abuse section use `abuseAddress` from
`legal-text.ts`: `abuse@` and the product domain. Legal and privacy contact
links use `legalAddress`: `legal@` and the product domain.
No code or setup in this repository creates those mailboxes.
