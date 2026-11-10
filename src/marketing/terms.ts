import {
  appDomain,
  productDomain,
  productName,
} from '../../docs/mockups/src/brand'
import {
  abuseAddress,
  legalAddress,
  legalOperator,
  legalTitles,
  list,
  mailLink,
  paragraph,
  text,
  type LegalDocument,
} from './legal-text'
import { termsOrgSection } from './terms-org'

/**
 * The terms of use. The facts come from the architecture and the protocol
 * docs. The rules of acceptable use pass on the rules of the providers of
 * the service and name no provider. Both legal pages share the operator
 * details and contact address. The section on working in an org is in
 * `terms-org.ts`.
 */
export const termsDocument: LegalDocument = {
  title: legalTitles.terms,
  description: `The terms of use of ${productName}.`,
  lead: text`These terms cover your use of ${productName} at ${productDomain},
  at ${appDomain}, and in the Mac app. You accept their current version
  each time that you continue with GitHub to sign in. ${productName} keeps
  the latest version that you accepted, and the time when you first
  accepted it. Effective date: 10 November 2026.`,
  sections: [
    {
      title: `Who runs ${productName}`,
      blocks: [
        paragraph`${productName} is run by ${legalOperator.name}, a company
          registered in ${legalOperator.registration}. Company number:
          ${legalOperator.companyNumber}.`,
        paragraph`Registered office: ${legalOperator.registeredOffice}.
          VAT number: ${legalOperator.vatNumber}.`,
        paragraph`For questions about these terms, contact
          ${mailLink(legalAddress)}.`,
      ],
    },
    {
      title: 'The service',
      blocks: [
        paragraph`${productName} is a coding tool in the browser and in the
          Mac app. Each workspace is one task with its own branch and its
          own cloud computer, where agents powered by Claude and Codex work.`,
        paragraph`${productName} is free until billing starts. Nobody pays
          until they choose a plan.`,
      ],
    },
    {
      title: 'Your accounts',
      blocks: [
        list(
          text`You sign in with GitHub, through the GitHub App of
            ${productName}. The app can reach each repository where you
            install its GitHub App and have access.`,
          text`${productName} runs each org's cloud computers in one of its
            own accounts with a cloud computer provider. The org keeps
            that account for its life. You need no account or key of your
            own for them.`,
          text`The agents run on the Claude or OpenAI login that you connect.
            The model use of each message bills to the account of the member
            who started its session, under the terms of Anthropic or OpenAI.
            A newer cloud computer starts from an org image that requires
            ${productName} to keep agent logins outside the cloud computer.
            ${productName} enforces this requirement for computers that start
            from that image. Its agents send their model requests and receive
            their answers through ${productName} on Cloudflare. These requests
            can hold your messages, files, and code. ${productName} adds the
            login, and sends each request on to Anthropic or OpenAI. An older
            cloud computer starts from an earlier org image. ${productName}
            still permits older software there that receives the login itself.
            With that older software, the agents send their model requests to
            Anthropic or OpenAI from the cloud computer. Installing newer
            software in that cloud computer does not remove this risk. A new
            image build gives the protection to each cloud computer that starts
            from it. In both kinds of cloud computer, agent settings in the
            repository can send the model requests of the agents to another
            address instead.`,
          text`Keep your keys and logins safe. Connect only accounts that you
            have permission to use. If a key or login is exposed, revoke it
            with its provider and remove or replace it in ${productName}.`,
        ),
      ],
    },
    termsOrgSection,
    {
      title: 'Acceptable use',
      blocks: [
        paragraph`Use ${productName} only for lawful purposes that you have
          the right to carry out, and that harm no other person or system.
          Also follow the terms of GitHub, Anthropic, and OpenAI. Do not use
          ${productName} or its cloud computers to:`,
        list(
          text`break a law, a sanction, or an export control, or the rights
            of other people, such as their privacy or their intellectual
            property`,
          text`store, make, or share content that is illegal, such as child
            sexual abuse material, or content that supports terrorism or
            violent extremism`,
          text`run malware, ransomware, botnets, or command and control
            servers, or send spam, phishing, scams, or other fraud`,
          text`attack other systems, for example with denial of service,
            credential stuffing, account takeover, intrusion, scans that the
            owner did not allow, or aggressive scraping`,
          text`mine cryptocurrency, or run work whose main purpose is to use
            computing resources and not to build software`,
          text`keep cloud computers busy without a purpose, get around limits
            or protections against abuse, hide what you do, or harm
            ${productName}, its cloud computers, or other networks`,
          text`share, rent, or sell your account or your access, or resell
            the cloud computers as computing capacity`,
          text`break the rules of the providers that run ${productName}`,
        ),
        paragraph`You are responsible for what your cloud computers make
          public, such as a port preview. Public content must be lawful, and
          it must not be abusive.`,
      ],
    },
    {
      title: 'Commands on your Mac',
      blocks: [
        paragraph`In the Mac app, an agent can ask to run a command on
          your Mac. The command runs only after you allow it.`,
        paragraph`You decide which commands run. You can allow a command
          once. You can always allow the exact same command text on that
          Mac. You can allow every command of one workspace on that Mac
          for 15 minutes.`,
        paragraph`An allowed command runs with your own permissions on the
          Mac, in the folder that the request names. An always-allowed
          command runs in any folder that a later request names.`,
        paragraph`You answer for each command that you allow, and for what
          it does on your Mac and to your data.`,
        paragraph`You can remove an always-allowed command, or stop the
          15 minutes, in the Mac app at any time.`,
      ],
    },
    {
      title: 'Suspension',
      blocks: [
        paragraph`The operator can suspend an account or an org that breaks
          these terms, or whose use puts other people or the service at
          risk. When the risk is urgent, the operator can suspend without
          notice.`,
        paragraph`A suspension of an account ends its sign-in. It stops the
          cloud computers of the workspaces that the account owns, closes
          their previews, and blocks new starts.`,
        paragraph`A suspension of an org stops each cloud computer of the org,
          closes its previews and terminals, and blocks each start and
          build. Its members keep their accounts and their other orgs. They
          can still open the org and read its chat history. Nothing in the
          org can change, except that a member can leave it. An admin can
          leave only while another admin whose account is not suspended
          remains.`,
        paragraph`A stopped cloud computer gets no restart to keep its disk
          while its workspace owner or org is suspended. So its disk can be
          deleted, with any work that is not pushed to GitHub.`,
        paragraph`To ask about a suspension, write to ${mailLink(legalAddress)}.`,
        paragraph`When you ask for a review, include your GitHub username,
          the org name, and why you think the suspension should be lifted.
          A request for review does not preserve a stopped cloud computer's
          disk. The org deletion rules below still apply.`,
      ],
    },
    {
      title: 'Report abuse',
      blocks: [
        paragraph`To report abuse of ${productName}, such as spam, an attack,
          or harmful content in a preview, write to
          ${mailLink(abuseAddress)}. Include the address of the preview or a
          description of what you saw.`,
        paragraph`Send security reports to the same address. For copyright
          or law enforcement notices, write to ${mailLink(legalAddress)}.`,
      ],
    },
    {
      title: 'Your work',
      blocks: [
        paragraph`Your repositories, files, and agent sessions live in the
          cloud computers that ${productName} runs for your org.
          ${productName} keeps the chat history of each workspace, so that
          you can read it while the cloud computer is stopped. It also keeps
          the files that you attach to messages. It copies each file to the
          cloud computer when the agent starts work on its message. When it
          passes on the model requests of a newer cloud computer, it keeps no
          copy of a request or of its answer. It writes no body or header
          value of them to its logs.`,
        paragraph`You keep any rights that you have in your repositories,
          files, messages, and other content. You give the operator
          permission to store, copy, process, and transmit that content as
          needed to provide the service, including through its providers.
          You must have permission to submit that content.`,
        paragraph`The terms and licences of third-party code and services
          still apply. Check agent output before you use or publish it.`,
      ],
    },
    {
      title: 'Ending your use',
      blocks: [
        paragraph`An admin can delete an org. ${productName} then stops the
          cloud computers of the org at once. It deletes the org after 7
          days, unless an admin restores it.`,
        paragraph`You can stop using ${productName} at any time. You can
          remove connected agent logins on your account page. To request
          account deletion, write to ${mailLink(legalAddress)}. Stopping
          use or removing a login does not delete an org or its chat
          history. The Privacy notice explains data retention.`,
      ],
    },
    {
      title: 'Availability and liability',
      blocks: [
        paragraph`The service is provided as available. Cloud computers,
          connections, and agent sessions can stop or fail. Keep your own
          backups and push important work to your repository.`,
        paragraph`Agent output can be wrong or incomplete. Review and test
          it before you rely on it. Nothing in these terms excludes a
          warranty, right, or liability that applicable law does not allow
          the operator to exclude.`,
      ],
    },
    {
      title: 'Changes to these terms',
      blocks: [
        paragraph`A changed version of these terms applies from your next sign-in.
          A sign-in session lasts at most 7 days, so a change applies within 7 days
          while you keep using ${productName}. You accept the changed version
          when you continue with GitHub.`,
      ],
    },
    {
      title: 'Law and disputes',
      blocks: [
        paragraph`The laws of England and Wales govern these terms.
          The courts of England and Wales can hear disputes about them.`,
        paragraph`If you are a consumer, this does not remove any
          mandatory protection under the law where you live. It does not
          limit any right to bring a claim in your local courts.`,
      ],
    },
  ],
}
