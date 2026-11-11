import {
  legalAddress,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'

export const privacyTransfersSection: LegalDocument['sections'][number] = {
  title: 'Transfers to other countries',
  blocks: [
    paragraph`The providers above can process your data in countries
      other than the country where you live, including the United
      States. Their data protection laws can differ from yours.`,
    list(
      text`Cloudflare's standard data processing terms use its
        certification under the UK Extension to the EU-US Data Privacy
        Framework for covered transfers. For other restricted UK
        transfers, those terms apply the European Commission's standard
        contractual clauses with the UK International Data Transfer
        Addendum. These contract terms protect personal data sent abroad.`,
      text`GitHub processes data in several countries, including the
        United States. Its published privacy statement describes its
        certification under the UK Extension and its use of standard
        contractual clauses. UK regulations approve transfers covered
        by the UK Extension certification.`,
      text`Resend processes email data in the United States. Its data
        processing terms apply the European Commission's standard
        contractual clauses with the UK International Data Transfer
        Addendum to restricted UK transfers.`,
      text`Better Stack keeps the error reports in the European Union. UK
        adequacy regulations approve transfers to countries in the
        European Economic Area. Better Stack's published data processing
        terms also let it and its subprocessors process personal data in
        the United States and other countries. For covered transfers,
        those terms use its certification under the UK Extension to the
        EU-US Data Privacy Framework. Otherwise, they apply the European
        Commission's standard contractual clauses with the UK
        International Data Transfer Addendum.`,
      text`The cloud computer provider is based in the United States.
        It reports that its cloud computers and saved snapshots run in
        Germany, Finland, and France. UK adequacy regulations approve
        transfers to countries in the European Economic Area. Other
        provider operations can involve processing outside that area.`,
      text`Anthropic and OpenAI process agent requests under the
        agreement for the connected account that the session uses.
        Their published privacy and data processing terms describe
        adequacy approvals, standard contractual clauses, and the UK
        Addendum where they apply.`,
    ),
    paragraph`For copies of the published safeguards named above,
      contact ${mailLink(legalAddress)}.`,
  ],
}
