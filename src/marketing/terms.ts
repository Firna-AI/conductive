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

/**
 * The terms of use. The facts come from the architecture and the protocol
 * docs. The rules of acceptable use pass on the rules of the providers of
 * the service and name no provider. Both legal pages share the operator
 * details and contact address.
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
        paragraph`${productName} is free for now. It has no plans and no
          billing.`,
      ],
    },
    {
      title: 'Your accounts',
      blocks: [
        list(
          text`You sign in with GitHub, through the GitHub App of
            ${productName}. The app can reach each repository where you
            install its GitHub App and have access.`,
          text`${productName} runs the cloud computers of every org in its
            own account with its cloud computer provider. You need no
            account or key of your own for them.`,
          text`The agents run on the Claude or OpenAI login that you connect.
            The model use of each message bills to the account of the member
            who started its session, under the terms of Anthropic or OpenAI.`,
          text`Keep your keys and logins safe. Connect only accounts that you
            have permission to use. If a key or login is exposed, revoke it
            with its provider and remove or replace it in ${productName}.`,
        ),
      ],
    },
    {
      title: 'Working in an org',
      blocks: [
        list(
          text`Every member of an org sees all of its workspaces, and can send
            messages in each of them.`,
          text`Each session runs on the agent login of the member who started
            it. The messages of other members use that login only when its
            owner allows it. Otherwise, the message of another member starts a
            new session on the login of that member. Each turn's git calls use
            a GitHub token of the member whose message started the turn.
            Pushes and pull requests show as that member. Outside an agent
            turn, the GitHub CLI uses the workspace owner's account.
            Each terminal connection uses that same account.`,
          text`That GitHub token reaches every repository where that person
            installed the GitHub App and has access, not only the
            repositories of the org.`,
          text`Each login that you connect has a setting that lets other
            members use it in the sessions that you start. For a Claude
            subscription, the setting starts off. For an API key, it starts
            on. When you replace a login with one of the same kind, the
            setting stays. You can change it on your account page. Share a
            login only when its provider's terms allow that use.`,
          text`While a turn runs, its agent login and its GitHub token are in
            the cloud computer of the workspace. A member with a terminal in
            that cloud computer can read them. A program that a tool of the
            agent starts, such as a dev server, can keep the agent login after
            the turn ends. A member with a terminal can read it there too. The
            setting of your login does not change this. A member with a
            terminal can also get the workspace owner's GitHub token without
            a running turn. Work in an org only
            with people whom you trust with your logins.`,
          text`Admins manage the members, the repositories, the scripts, and
            the env vars of the org.`,
        ),
      ],
    },
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
          cloud computer when the agent starts work on its message.`,
        paragraph`In the Mac app, you can import your local Conductor
          workspaces. ${productName} then keeps the work that GitHub does not
          hold, the agent session files, and a document of each session. It
          copies the work and the session files to the cloud computer when a
          member activates the workspace. The members of the org can read the
          documents of the imported sessions.`,
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
