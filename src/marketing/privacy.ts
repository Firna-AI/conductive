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

/**
 * The privacy notice follows the list of privacy information in the ICO
 * guidance that the README names. The facts come from the architecture
 * and the protocol docs. Both legal pages share the operator details and
 * contact address.
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
            and avatar. They sign you in, and they show who owns and who
            sends each piece of work. Your login and display name also tell
            the agents who sent each message.`,
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
            you let other members use that login.`,
          text`Your work: ${productName} keeps your messages and the answers
            of the agents as the chat history of each workspace. It also
            keeps the last file list and the last summary of changes of each
            workspace. The files that you attach go to the cloud computer of
            the workspace.`,
          text`Your code: it stays in the cloud computers that ${productName}
            runs for your org. ${productName} reads a file or a diff when you
            open it, to show it to you.`,
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
    {
      title: 'Who gets your data',
      blocks: [
        list(
          text`Cloudflare runs ${productName} and stores its data.
            Cloudflare's AI model service also writes a short name for each
            new workspace from the text of its first message.`,
          text`GitHub signs you in, and gives ${productName} access to your
            repositories through its GitHub App. The Mac app also checks
            GitHub for updates and downloads new versions. These requests
            send your network address to GitHub.`,
          text`A cloud computer provider runs the cloud computers of every org
            for ${productName}, in the account of ${productName}. Your code,
            your files, and your agent sessions are in them. ${productName}
            sends the provider the requests that start, stop, and use them.`,
          text`Anthropic and OpenAI get your messages, your files, and your
            code when an agent works on them. With each message, they also get
            the GitHub login and the display name of its sender. They also get
            the name of the workspace branch, which starts with the GitHub
            login of the first owner of the workspace. Each session uses the
            login of the member who started it. Your messages in another
            member's session use that member's login only when that member
            lets other members use it. When that member does not share the
            login, your message starts a new session on your own login. The
            terms of that provider apply.`,
          text`The members of your orgs see the workspaces of the org and
            their chats. A member with a terminal in a cloud computer can read
            the agent login and the GitHub token of a turn that runs there. A
            program that a tool of the agent starts, such as a dev server, can
            keep the agent login after the turn ends. A member with a terminal
            can read it there too. Outside an agent turn, the GitHub CLI uses
            the workspace owner's account. Each member with a terminal can
            get that owner's GitHub token without a running turn.`,
          text`The members of your orgs also see who started each session,
            whose login it uses, and whether it can use that login. They also
            see whether its starter lets other members use that login.`,
          text`If the operator suspends your account, the members of your orgs
            learn that it is suspended. A workspace that you own then says
            that its owner is suspended, until an operator lifts the
            suspension.`,
        ),
      ],
    },
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
        paragraph`Account records, the latest Terms acceptance, and
          suspension records do not automatically expire when you stop
          using ${productName}. Workspace chat history stays while its org
          exists, including while a cloud computer is stopped.`,
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
