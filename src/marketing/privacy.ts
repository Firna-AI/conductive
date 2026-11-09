import { productName } from '../../docs/mockups/src/brand'
import {
  legalAddress,
  legalOperator,
  legalTitles,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'
import { privacyRecipientsSection } from './privacy-recipients'

/**
 * The privacy notice follows the list of privacy information in the ICO
 * guidance that the README names. The facts come from the architecture
 * and the protocol docs. Both legal pages share the operator details and
 * contact address. The section on who gets the data is in
 * `privacy-recipients.ts`.
 */
export const privacyDocument: LegalDocument = {
  title: legalTitles.privacy,
  description: `The privacy notice of ${productName}.`,
  lead: text`This notice says which personal data ${productName} uses, why
  it uses it, and who gets it. Effective date: 9 November 2026.`,
  sections: [
    {
      title: 'Who is responsible',
      blocks: [
        paragraph`${legalOperator.name} is the data controller for the
          personal data described in this notice. It decides how
          ${productName} uses that data.`,
        paragraph`${legalOperator.name} is registered in
          ${legalOperator.registration}. Company number:
          ${legalOperator.companyNumber}.`,
        paragraph`Registered office: ${legalOperator.registeredOffice}.
          VAT number: ${legalOperator.vatNumber}.`,
        paragraph`For privacy questions, contact ${mailLink(legalAddress)}.`,
      ],
    },
    {
      title: `What ${productName} uses, and why`,
      blocks: [
        list(
          text`Your GitHub account: your GitHub user ID, login, display name,
            avatar, and the date when you created the account. They sign you
            in, and they show who owns and who sends each piece of work. The
            operator sees the age of the account when you wait for app
            access.`,
          text`Your GitHub emails: at each sign-in, ${productName} keeps the
            verified email addresses of your GitHub account, and which one is
            primary. An org invitation reaches you through one of them. The
            approval email goes to the primary one.`,
          text`Your GitHub token: the sign-in gives ${productName} a GitHub
            token for your account. ${productName} stores it encrypted, for
            every account, also while you wait for app access. It uses the
            token to read GitHub for you, and for the git calls of your
            turns.`,
          text`The waitlist: a new account waits for app access, and sees only
            the waitlist until then. ${productName} records when and how you
            got app access. The record names the operator who approved you,
            the invite code that you used, or the org invitation that you
            accepted, with its org and the admin who sent it. It lets the
            operator trace misuse back to a code or a person.`,
          text`Invite codes: each account with app access has an invite code
            with 5 invites. ${productName} keeps who used each code, and when.
            You see how many of your invites are left, but not who used them.
            The operator sees both.`,
          text`The approval email: when an operator approves your account,
            ${productName} sends one email to the primary verified email of
            your GitHub account, and keeps whether it went. A failed send
            goes again for up to 24 hours. An account without a verified
            email gets no email.`,
          text`Your agreement: you accept the current version of the terms at
            each sign-in. ${productName} keeps the latest version that you
            accepted, and the time when you first accepted it. They show that
            you accepted the terms.`,
          text`A suspension: if the operator suspends your account,
            ${productName} records the time and the operator who suspended
            it. An operator can lift the suspension, and ${productName}
            records each lift in the same way. It keeps every record. A
            suspension keeps your cloud computers stopped until an operator
            lifts it.`,
          text`Your session: a cookie of the app keeps you signed in. A
            second cookie protects the GitHub sign-in while it runs.`,
          text`Your orgs: the orgs, members, roles, invites, sections,
            repositories, workspaces, scripts, and settings that you and your
            team make. They run the service.`,
          text`Keys and logins: the env var values of each org, and your
            Claude or OpenAI logins. ${productName} stores them encrypted. It
            uses your login only for the turns of the sessions that you start.
            The messages of other members in those sessions use it only when
            you let other members use that login. A newer cloud computer starts
            from an org image that requires ${productName} to keep agent logins
            outside the cloud computer. ${productName} enforces this requirement
            for computers that start from that image. Each turn of your sessions
            there gets only a credential that works through ${productName}
            while that turn runs. An older cloud computer starts from an earlier
            org image. ${productName} still permits older software there that
            receives your login itself. Installing newer software in that cloud
            computer does not remove this risk. A new image build gives the
            protection to each cloud computer that starts from it.`,
          text`Your work: ${productName} keeps your messages and the answers
            of the agents as the chat history of each workspace. It also
            keeps the last file list and the last summary of changes of each
            workspace. The files that you attach go to the cloud computer of
            the workspace.`,
          text`Your code: your repositories and files live in the cloud
            computers that ${productName} runs for your org. ${productName}
            reads a file or a diff when you open it, to show it to you. In a
            newer cloud computer, the agents send their requests to the models
            of Anthropic or OpenAI through ${productName}. These model requests
            can hold your messages, your files, and your code. ${productName}
            adds the login that the session uses, and passes each request on.
            When it passes on these model requests and their answers, it keeps
            no copy of them. It writes no body or header value of them to its
            logs. ${productName} still keeps the chat history above.`,
          text`GitHub events: the state of the pull requests and the checks
            of your branches, which GitHub sends to ${productName}.`,
          text`Panel widths: your browser keeps the widths of the panels of
            the app. They stay in your browser.`,
        ),
        paragraph`Where data protection law requires a lawful basis, the
          operator relies on performance of a contract to provide the
          service to you. It relies on legitimate interests to operate and
          secure the service and prevent abuse. It also uses personal data
          when necessary to comply with a legal obligation.`,
      ],
    },
    privacyRecipientsSection,
    {
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
    },
    {
      title: `How long ${productName} keeps data`,
      blocks: [
        paragraph`When an admin deletes an org, ${productName} deletes the data
          of the org after 7 days, unless an admin restores it.`,
        paragraph`An account that waits for app access stays until you ask
          for its deletion, as every other account does.`,
        paragraph`Account records, the latest Terms acceptance, and
          suspension records do not automatically expire when you stop
          using ${productName}. Workspace chat history stays while its org
          exists, including while a cloud computer is stopped.
          When ${productName} passes on model requests and their answers, it
          keeps no copy of them.`,
        paragraph`A connected agent login stays until you remove or replace
          it. Panel widths stay in your browser until you clear its saved
          data. The providers above can keep their own records under their
          terms and privacy notices.`,
        paragraph`To request deletion of your personal data, write to
          ${mailLink(legalAddress)}. Deletion rights depend on applicable
          law and can have exceptions.`,
      ],
    },
    {
      title: 'Security',
      blocks: [
        list(
          text`${productName} stores each env var value and agent login
            encrypted.`,
          text`It does not send the key of its cloud computer provider to
            your browser or into a cloud computer.`,
          text`The settings never return a stored env var value or agent login
            to your browser.`,
          text`An env var is secret until an admin clears its mark. Before
            ${productName} puts agent output in the chat history or on a
            screen, it hides each exact copy of a secret value in it. It also
            hides such a copy in each start log that it shows. It does not
            hide a changed or encoded value. A change of the mark applies at
            the next start of a cloud computer.`,
          text`${productName} keeps the real path of each file, because it
            needs that path to open the file. It also keeps the real name of
            the default branch of each repository. Screens hide each exact copy
            of a secret value in these paths and names. Your browser still gets
            the real values, so a secret value can show in the data that your
            browser gets and sends (decision 145).`,
          text`Agent output and start logs can show the value of an env var
            that is not secret. Each member who reads them then sees that
            value. The agents and each member with a terminal can read every
            env var value in the cloud computers. Secret values can also stay
            on the disk of a cloud computer, for example in its agent sessions
            and its agent output.`,
        ),
      ],
    },
    {
      title: 'Cookies',
      blocks: [
        paragraph`This site sets no cookies. The app sets one cookie that
          keeps you signed in, and one that protects the GitHub sign-in while
          it runs.`,
        paragraph`The sign-in cookie lasts for up to 7 days. The GitHub
          sign-in protection cookie lasts for up to 10 minutes. These
          cookies support sign-in and security. They use secure connections
          and cannot be read by page scripts.`,
      ],
    },
    {
      title: 'Your rights',
      blocks: [
        paragraph`Depending on where you live, the law can give you rights
          over your personal data. You can ask for a copy of it, and ask to
          correct it, to delete it, to limit its use, or to object to its
          use. You can also ask to take it to another service.`,
        paragraph`To exercise these rights, write to
          ${mailLink(legalAddress)}. Describe your request and the account
          or org it concerns. The operator may need information to verify
          your identity before acting on the request.`,
      ],
    },
    {
      title: 'Complaints',
      blocks: [
        paragraph`You can complain to the data protection authority that
          has jurisdiction over your complaint. You can also raise a
          privacy concern with the operator at ${mailLink(legalAddress)}.`,
        paragraph`In the UK, you can contact the Information Commissioner's
          Office at ico.org.uk/make-a-complaint/ or on 0303 123 1113.`,
      ],
    },
    {
      title: 'Changes to this notice',
      blocks: [
        paragraph`The operator publishes changes on this page and updates
          its effective date. Check this page for the current notice. Any
          additional notice required by applicable law still applies.`,
      ],
    },
  ],
}
