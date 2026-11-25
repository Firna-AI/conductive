import { appDomain, productDomain, productName } from '../shared/brand'
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
import { termsServiceSection } from './terms-service'
import { termsWorkSection } from './terms-work'

/**
 * The terms of use. The facts come from the architecture and the protocol
 * docs. The rules of acceptable use pass on the rules of the providers of
 * the service and name no provider. Both legal pages share the operator
 * details and contact address. The section on working in an org is in
 * `terms-org.ts`, and the section on your work is in `terms-work.ts`.
 */
export const termsDocument: LegalDocument = {
  title: legalTitles.terms,
  description: `The terms of use of ${productName}.`,
  lead: text`These terms cover your use of ${productName} at ${productDomain},
  at ${appDomain}, and in the Mac app. You accept their current version
  each time that you continue with GitHub to sign in. ${productName} keeps
  the latest version that you accepted, and the time when you first
  accepted it. Effective date: 25 November 2026.`,
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
    termsServiceSection,
    {
      title: 'Your accounts',
      blocks: [
        list(
          text`You sign in with GitHub, through the GitHub App of
            ${productName}. The app can reach each repository where you
            install its GitHub App and have access. It reads your repository
            rights and merge method from GitHub. It shows Merge only when
            your GitHub rights let you merge. It shows Ready for review on a
            draft pull request only when you have write access or more.`,
          text`When an admin saves a skills repository, and when a member
            opens Skills, ${productName} reads its repository details and
            file tree on GitHub. The lookup uses that member's GitHub
            sign-in. The cloud computer copies and updates the public
            repository without a GitHub token.`,
          text`${productName} runs each workspace's cloud computer in one of
            its own accounts with a cloud computer provider. The operator
            can switch an org to another account by building its cloud
            computer setup again there. New workspaces use the new account
            when that build succeeds, and the old account until then.
            Existing workspaces keep their accounts. You need no account or
            key of your own for them.`,
          text`Each session keeps one agent login: its starter's personal
            login or the org login. Your usable personal login comes first
            for a new session. If you have none, the session uses the org
            login when available. An admin can turn on Use for every member
            to give the org login priority for new sessions. If the org
            login cannot be used, your usable personal login serves instead.
            Older sessions keep their login.`,
          text`A member whom the org login serves needs no personal login.
            Each automation run follows the same login rule as a new session
            of its owner.`,
          text`For a Claude subscription or ChatGPT plan, model use bills to
            its connected account under the terms of Anthropic or OpenAI.
            For a provider API key, the account of that key pays.
            For an own endpoint login, the account of the endpoint pays
            under its terms. You are responsible for the endpoint that you
            connect and for following its terms.`,
          text`${productName} keeps agent logins outside cloud computers.
            Each turn gets a temporary credential for model requests.
            The agents send their model requests and receive their answers
            through ${productName} on Cloudflare. These requests
            can hold your messages, files, code, and command results.
            ${productName} adds the login and sends each request to
            Anthropic, OpenAI, or the chosen endpoint. An own endpoint gets
            the messages, files, and command results of each turn on its
            login, whoever sent the message. Its address and key never reach
            a cloud computer. ${productName} starts turns only with
            supported agent software. Agent settings in the repository can
            send the model requests of the agents to another
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
          Also follow the applicable terms of GitHub, Anthropic, OpenAI,
          and any endpoint that you connect. Do not use
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
          your Mac. The Mac app asks first unless you already allowed the
          command or all commands from that workspace.`,
        paragraph`Agents can ask in every workspace, from its first turn.
          This includes a new workspace, an automation run, and a workspace
          that an agent creates. When the Mac app asks, you can deny the
          request.`,
        paragraph`In the Mac app, Capabilities has a Mac access switch for
          your own Mac. When you turn it on, the Mac app allows every
          command from that workspace on your Mac until you stop. Turning
          it off stops this permission. Other members' Macs still ask,
          unless their users already allowed the commands.`,
        paragraph`If this permission cannot start, the switch stays off and
          the Mac app shows the cause. In New workspace in the Mac app, the
          permission starts when you create the workspace with the switch
          on.`,
        paragraph`A browser shows no Mac access switch, and it cannot start
          this permission. An older Mac app shows an earlier Mac access
          switch that every member shares. That switch no longer stops
          agents from asking.`,
        paragraph`Use Stop in This Mac or in the workspace bar, or turn the
          switch off, to end a workspace's permission on that Mac at once.`,
        paragraph`You decide which commands run. You can allow a command
          once. You can always allow the exact same command text on that
          Mac. You can allow every command of one workspace on that Mac
          for 15 minutes, or until you stop it. Permission until you stop
          it also ends when the Mac app quits or signs out.`,
        paragraph`While workspace permission runs, each command from that
          workspace runs on your Mac without asking. This includes a command
          that text read by the agent steers it to request.`,
        paragraph`An automation run acts for its owner, also while nobody
          watches. Text that steers its agent can make it ask for a command
          on the owner's Mac. A command that the owner always allowed then
          runs without asking.`,
        paragraph`An allowed command runs with your own permissions on the
          Mac, in the folder that the request names. An always-allowed
          command runs in any folder that a later request names.`,
        paragraph`You answer for each command that you allow, and for what
          it does on your Mac and to your data.`,
        paragraph`You can remove an always-allowed command, or stop the
          permission of a workspace, in the Mac app at any time.`,
        paragraph`While the 15 minutes run, the workspace bar shows the
          time left, Extend, Keep until I stop, and Stop. Extend resets
          the time left to 15 minutes from now. Keep until I stop changes
          the permission to last until you stop it. Stop ends it.`,
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
          their previews, and blocks new starts. Its automations start no
          runs.`,
        paragraph`A suspension of an org stops each cloud computer of the org,
          closes its previews and terminals, and blocks each start, build,
          and automation run. Its members keep their accounts and their other
          orgs. They can still open the org and read its chat history.
          Nothing in the org can change, except that a member can leave it.
          An admin can leave only while another admin whose account is not
          suspended remains.`,
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
    termsWorkSection,
    {
      title: 'Ending your use',
      blocks: [
        paragraph`An admin can delete an org. ${productName} then stops the
          cloud computers of the org at once. It deletes the org after 7
          days, unless an admin restores it.`,
        paragraph`You can stop using ${productName} at any time. You can
          remove personal agent logins on your account page. An admin can
          remove org logins on the Agents tab of the org settings. To request
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
        paragraph`When you accept these terms, you agree that the operator
          can change them. Each change gives these terms a new version.`,
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
